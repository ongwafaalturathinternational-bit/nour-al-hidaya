/*
 * WAT Connect — tests de non-régression et de sécurité du service worker.
 *
 * Ces tests n'exécutent aucun appel réseau réel : sw.js est évalué dans un
 * contexte node:vm isolé, avec des implémentations locales de `caches`,
 * `fetch`, `self` et des événements `install` / `activate` / `fetch`.
 *
 * Le fichier sw.js n'est jamais modifié : il est lu en lecture seule.
 *
 * Les tests exécutables vérifient les invariants de sécurité et de
 * non-régression attendus. Les anomalies corrigées par le lot 002 sont
 * désormais couvertes par des tests exécutables : isolation du cache,
 * refus de la 206, en-têtes privés, échec d'écriture, hors connexion
 * explicite, nettoyage ciblé des caches, exclusion Authorization/Range,
 * inspection et atomicité du précache, revalidation des entrées servies,
 * redirections suivies, migration v6 -> v7 et page hors connexion trilingue.
 * Seuls les risques résiduels non traités restent documentés en test.todo
 * en fin de fichier.
 */
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const swSource = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const SCOPE = "https://wat.example/";

const flush = async (rounds = 3) => {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
};

const appUrl = file => new URL(file, SCOPE).href;

function makeHeaders(entries = {}) {
  const store = new Map(
    Object.entries(entries).map(([name, value]) => [String(name).toLowerCase(), String(value)])
  );
  return {
    get: name => (store.has(String(name).toLowerCase()) ? store.get(String(name).toLowerCase()) : null),
    has: name => store.has(String(name).toLowerCase())
  };
}

function makeResponse({
  status = 200,
  type = "basic",
  body = "",
  headers = {},
  redirected = false,
  url = ""
} = {}) {
  return {
    status,
    type,
    body,
    url,
    redirected,
    ok: status >= 200 && status < 300,
    headers: makeHeaders(headers),
    clone() {
      return makeResponse({ status, type, body, headers, redirected, url });
    },
    async text() {
      return body;
    }
  };
}

// Réponse synthétique produite par le worker hors connexion : le simulateur
// reproduit uniquement l'interface Response réellement utilisée par sw.js.
class MockResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status === undefined ? 200 : init.status;
    this.statusText = init.statusText || "";
    this.ok = this.status >= 200 && this.status < 300;
    this.type = "basic";
    this.redirected = false;
    this.headers = typeof init.headers?.get === "function" ? init.headers : makeHeaders(init.headers || {});
  }

  clone() {
    return new MockResponse(this.body, { status: this.status, statusText: this.statusText, headers: this.headers });
  }

  async text() {
    return this.body;
  }
}

// Lecture des constantes du service worker sans exécuter ses écouteurs.
function readSwConstants() {
  const context = vm.createContext({
    URL,
    self: { registration: { scope: SCOPE }, addEventListener() {} },
    caches: {},
    fetch() {
      throw new Error("aucun appel réseau autorisé pendant la lecture des constantes");
    }
  });
  vm.runInContext(swSource, context, { filename: "sw.js" });
  const raw = vm.runInContext("({ CACHE_NAME, APP_FILES, EXTERNAL_ASSETS })", context);
  return {
    CACHE_NAME: raw.CACHE_NAME,
    APP_FILES: Array.from(raw.APP_FILES),
    EXTERNAL_ASSETS: Array.from(raw.EXTERNAL_ASSETS)
  };
}

const { CACHE_NAME, APP_FILES, EXTERNAL_ASSETS } = readSwConstants();

/*
 * Bac à sable : reproduit le sous-ensemble de l'API Cache utilisé par sw.js.
 * Toutes les réponses et requêtes sont des objets locaux, jamais des objets
 * réseau réels.
 */
function createHarness({
  initialCaches = {},
  fetchImpl,
  putFails = null,
  openFails = false,
  deleteFails = null
} = {}) {
  const handlers = new Map();
  const stores = new Map();
  const log = {
    opened: [],
    puts: [],
    putRejections: [],
    putFailures: [],
    deletes: [],
    deleteFailures: [],
    addAll: [],
    skipWaiting: 0,
    claim: 0,
    fetch: [],
    globalMatches: 0
  };

  for (const [name, entries] of Object.entries(initialCaches)) {
    stores.set(name, new Map(Object.entries(entries)));
  }

  const keyOf = input => (typeof input === "string" ? new URL(input, SCOPE).href : input.url);
  const storeFor = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name);
  };

  async function callFetch(input, init = {}) {
    const url = typeof input === "string" ? new URL(input, SCOPE).href : input.url;
    log.fetch.push({ url, init });
    if (fetchImpl) return fetchImpl(url, init);
    return makeResponse();
  }

  class CacheMock {
    constructor(name) {
      this.name = name;
    }

    async match(request) {
      return storeFor(this.name).get(keyOf(request));
    }

    async put(request, response) {
      // La spécification CacheStorage interdit la mise en cache d'une réponse 206.
      if (response.status === 206) {
        log.putRejections.push({
          cache: this.name,
          key: keyOf(request),
          status: response.status
        });
        throw new TypeError("Cache.put: une réponse 206 ne peut pas être mise en cache");
      }
      if (putFails && putFails(keyOf(request), this.name)) {
        const error = new Error("QuotaExceededError: quota de stockage insuffisant");
        error.name = "QuotaExceededError";
        log.putFailures.push({ cache: this.name, key: keyOf(request) });
        throw error;
      }
      log.puts.push({
        cache: this.name,
        key: keyOf(request),
        status: response.status,
        type: response.type
      });
      storeFor(this.name).set(keyOf(request), response);
    }

    async delete(request) {
      return storeFor(this.name).delete(keyOf(request));
    }

    async addAll(urls) {
      log.addAll.push([...urls]);
      const entries = [];
      for (const url of urls) {
        const response = await callFetch(url);
        // Cache.addAll refuse également les réponses non-ok et les réponses 206.
        if (!response || !response.ok || response.status === 206) {
          throw new TypeError(`addAll: échec pour ${url}`);
        }
        entries.push([keyOf(url), response]);
      }
      for (const [key, response] of entries) storeFor(this.name).set(key, response);
    }
  }

  const caches = {
    async open(name) {
      log.opened.push(name);
      if (openFails) throw new Error("stockage indisponible : ouverture du cache refusée");
      return new CacheMock(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      log.deletes.push(name);
      if (deleteFails && deleteFails(name)) {
        log.deleteFailures.push(name);
        throw new Error(`suppression refusée : ${name}`);
      }
      return stores.delete(name);
    },
    async match(request) {
      // Le worker ne doit jamais utiliser cette recherche globale : elle peut
      // renvoyer une entrée appartenant à un autre cache de la même origine.
      log.globalMatches += 1;
      const key = keyOf(request);
      for (const store of stores.values()) {
        if (store.has(key)) return store.get(key);
      }
      return undefined;
    }
  };

  const self = {
    registration: { scope: SCOPE },
    addEventListener(name, handler) {
      handlers.set(name, handler);
    },
    async skipWaiting() {
      log.skipWaiting += 1;
    },
    clients: {
      async claim() {
        log.claim += 1;
      }
    }
  };

  const context = vm.createContext({ URL, self, caches, fetch: callFetch, console, Response: MockResponse });
  vm.runInContext(swSource, context, { filename: "sw.js" });

  const emit = (name, event) => {
    const handler = handlers.get(name);
    assert.equal(typeof handler, "function", `écouteur ${name} présent`);
    handler(event);
  };

  const install = () => {
    let promise;
    emit("install", { waitUntil: value => { promise = value; } });
    assert.ok(promise, "install a fourni une promesse à waitUntil");
    return promise;
  };

  const activate = () => {
    let promise;
    emit("activate", { waitUntil: value => { promise = value; } });
    assert.ok(promise, "activate a fourni une promesse à waitUntil");
    return promise;
  };

  const runFetch = request => {
    let responded = false;
    let promise;
    const pendingWrites = [];
    emit("fetch", {
      request,
      respondWith: value => {
        responded = true;
        promise = value;
      },
      waitUntil: value => {
        pendingWrites.push(value);
      }
    });
    return { responded, promise, pendingWrites };
  };

  return { handlers, stores, log, context, install, activate, runFetch, cacheStorage: caches };
}

/* ------------------------------------------------------------------ */
/* Installation                                                        */
/* ------------------------------------------------------------------ */

test("installation : précache exactement les fichiers applicatifs autorisés", async () => {
  const harness = createHarness();
  await harness.install();
  const store = harness.stores.get(CACHE_NAME);
  assert.ok(store, "le cache de l'application est créé pendant l'installation");
  const localKeys = [...store.keys()].filter(key => key.startsWith(SCOPE)).sort();
  assert.deepEqual(localKeys, APP_FILES.map(appUrl).sort());
  assert.deepEqual(
    [...store.keys()].sort(),
    [...APP_FILES.map(appUrl), ...EXTERNAL_ASSETS].sort()
  );
});

test("installation : les SDK externes sont récupérés en mode no-cors", async () => {
  const harness = createHarness();
  await harness.install();
  const externalCalls = harness.log.fetch.filter(({ url }) => EXTERNAL_ASSETS.includes(url));
  assert.ok(externalCalls.length >= EXTERNAL_ASSETS.length);
  for (const asset of EXTERNAL_ASSETS) {
    assert.ok(externalCalls.some(call => call.url === asset), `SDK non récupéré : ${asset}`);
  }
  for (const call of externalCalls) assert.equal(call.init.mode, "no-cors");
});

// Comportement fonctionnel assumé pour l'installation hors ligne.
// Le risque conditionnel (absence de SRI) est documenté dans la section test.todo.
test("installation : une réponse opaque valide est mise en cache", async () => {
  const opaque = makeResponse({ status: 0, type: "opaque" });
  const harness = createHarness({
    fetchImpl: async url => (EXTERNAL_ASSETS.includes(url) ? opaque : makeResponse())
  });
  await harness.install();
  const store = harness.stores.get(CACHE_NAME);
  for (const asset of EXTERNAL_ASSETS) assert.equal(store.get(asset), opaque);
});

test("installation : une réponse externe 404 non opaque n'est pas mise en cache", async () => {
  const harness = createHarness({
    fetchImpl: async url => (EXTERNAL_ASSETS.includes(url) ? makeResponse({ status: 404 }) : makeResponse())
  });
  await harness.install();
  const store = harness.stores.get(CACHE_NAME);
  for (const asset of EXTERNAL_ASSETS) assert.equal(store.has(asset), false);
  assert.equal(
    harness.log.puts.some(entry => EXTERNAL_ASSETS.includes(entry.key)),
    false,
    "aucune réponse externe 404 n'est écrite"
  );
});

test("installation : une redirection opaque n'est pas mise en cache", async () => {
  const harness = createHarness({
    fetchImpl: async url =>
      EXTERNAL_ASSETS.includes(url) ? makeResponse({ status: 0, type: "opaqueredirect" }) : makeResponse()
  });
  await harness.install();
  const store = harness.stores.get(CACHE_NAME);
  for (const asset of EXTERNAL_ASSETS) assert.equal(store.has(asset), false);
});

test("installation : une panne réseau sur un SDK externe ne bloque pas l'installation", async () => {
  const harness = createHarness({
    fetchImpl: async url => {
      if (EXTERNAL_ASSETS.includes(url)) throw new TypeError("réseau indisponible");
      return makeResponse();
    }
  });
  await harness.install();
  assert.equal(harness.stores.get(CACHE_NAME).has(EXTERNAL_ASSETS[0]), false);
  assert.ok(harness.log.skipWaiting >= 1, "skipWaiting est appelé après l'installation");
});

test("installation : l'échec du précache applicatif rejette et n'active pas le worker", async () => {
  const harness = createHarness({
    fetchImpl: async url => (url === appUrl("./portail.html") ? makeResponse({ status: 404 }) : makeResponse())
  });
  await assert.rejects(async () => harness.install());
  assert.equal(harness.log.skipWaiting, 0);
});

test("installation : skipWaiting n'est appelé qu'après la fin du précache", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const harness = createHarness({
    fetchImpl: async url => {
      if (url === appUrl("./index.html")) await gate;
      return makeResponse();
    }
  });
  const installing = harness.install();
  await flush();
  assert.equal(harness.log.skipWaiting, 0);
  release();
  await installing;
  assert.ok(harness.log.skipWaiting >= 1, "skipWaiting est appelé après le précache");
});

/* ------------------------------------------------------------------ */
/* Activation et suppression des anciens caches                        */
/* ------------------------------------------------------------------ */

test("activation : supprime les anciennes versions du cache WAT", async () => {
  const harness = createHarness({
    initialCaches: {
      "wat-connect-shell-v5": {},
      "wat-connect-shell-v4": {},
      [CACHE_NAME]: {}
    }
  });
  await harness.activate();
  assert.deepEqual([...harness.stores.keys()], [CACHE_NAME]);
  assert.deepEqual(harness.log.deletes.sort(), ["wat-connect-shell-v4", "wat-connect-shell-v5"]);
});

test("activation : supprime les caches hérités de l'ancienne application Nour", async () => {
  const harness = createHarness({
    initialCaches: {
      "nour-al-hidaya-shell-v1": {},
      "nour-al-hidaya-shell-v2": {},
      [CACHE_NAME]: {}
    }
  });
  await harness.activate();
  assert.deepEqual([...harness.stores.keys()], [CACHE_NAME]);
});

test("activation : conserve le cache courant et son contenu", async () => {
  const cached = makeResponse({ body: "accueil" });
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [appUrl("./index.html")]: cached } }
  });
  await harness.activate();
  assert.equal(harness.log.deletes.length, 0);
  assert.equal(harness.stores.get(CACHE_NAME).get(appUrl("./index.html")), cached);
});

test("activation : ne supprime pas les caches appartenant à d'autres applications", async () => {
  const harness = createHarness({
    initialCaches: {
      [CACHE_NAME]: {},
      "mon-autre-application-v1": {},
      "nour-al-hidaya-shellx-v1": {},
      "cache-tiers-v9": {}
    }
  });
  await harness.activate();
  assert.deepEqual(
    [...harness.stores.keys()].sort(),
    ["cache-tiers-v9", "mon-autre-application-v1", "nour-al-hidaya-shellx-v1", CACHE_NAME].sort()
  );
});

test("activation : revendique les clients après le nettoyage", async () => {
  const harness = createHarness({ initialCaches: { "wat-connect-shell-v3": {}, [CACHE_NAME]: {} } });
  await harness.activate();
  assert.ok(harness.log.claim >= 1, "clients.claim est appelé après le nettoyage");
  assert.deepEqual(harness.log.deletes, ["wat-connect-shell-v3"]);
});

/* ------------------------------------------------------------------ */
/* Filtrage des requêtes                                               */
/* ------------------------------------------------------------------ */

test("filtrage : aucune méthode autre que GET n'est interceptée", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
    const harness = createHarness();
    const { responded } = harness.runFetch({ url: appUrl("./index.html"), method, mode: "cors" });
    assert.equal(responded, false, `méthode ${method} non interceptée`);
    assert.equal(harness.log.fetch.length, 0, `aucun fetch pour ${method}`);
  }
});

test("filtrage : une requête vers une autre origine n'est jamais interceptée", () => {
  const harness = createHarness();
  const { responded } = harness.runFetch({
    url: "https://autre-application.example/index.html",
    method: "GET",
    mode: "no-cors"
  });
  assert.equal(responded, false);
  assert.equal(harness.log.fetch.length, 0);
});

test("filtrage : un chemin same-origin non listé n'est pas intercepté", () => {
  const harness = createHarness();
  for (const path of ["api/private", "secret.json", "../secret", "admin/config.json"]) {
    const { responded } = harness.runFetch({ url: new URL(path, SCOPE).href, method: "GET", mode: "cors" });
    assert.equal(responded, false, path);
  }
  assert.equal(harness.log.fetch.length, 0);
});

test("filtrage : une ressource listée avec une chaîne de requête n'est pas interceptée", () => {
  const harness = createHarness();
  for (const url of [`${SCOPE}index.html?v=1`, `${SCOPE}wat-brand.css?cache=2`]) {
    const { responded } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
    assert.equal(responded, false, url);
  }
});

test("filtrage : les variantes de casse ou d'ancre ne contournent pas la liste blanche", () => {
  const harness = createHarness();
  for (const url of [`${SCOPE}Index.html`, `${SCOPE}index.html#top`, `${SCOPE}INDEX.HTML`]) {
    const { responded } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
    assert.equal(responded, false, url);
  }
});

test("filtrage : une URL gstatic d'une autre version n'est pas reconnue comme SDK autorisé", () => {
  const harness = createHarness();
  const { responded } = harness.runFetch({
    url: "https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js",
    method: "GET",
    mode: "no-cors"
  });
  assert.equal(responded, false);
  assert.equal(harness.log.fetch.length, 0);
});

/* ------------------------------------------------------------------ */
/* Ressources externes autorisées                                      */
/* ------------------------------------------------------------------ */

test("externe : un SDK autorisé déjà en cache est servi sans réseau", async () => {
  const cached = makeResponse({ body: "sdk" });
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [EXTERNAL_ASSETS[0]]: cached } }
  });
  const { responded, promise } = harness.runFetch({
    url: EXTERNAL_ASSETS[0],
    method: "GET",
    mode: "no-cors"
  });
  assert.equal(responded, true);
  assert.equal(await promise, cached);
  assert.equal(harness.log.fetch.length, 0);
});

test("externe : un SDK autorisé récupéré avec succès est mis en cache", async () => {
  const network = makeResponse({ body: "sdk-réseau" });
  const harness = createHarness({ fetchImpl: async () => network });
  const { promise } = harness.runFetch({ url: EXTERNAL_ASSETS[1], method: "GET", mode: "no-cors" });
  assert.equal(await promise, network);
  await flush();
  const stored = harness.stores.get(CACHE_NAME).get(EXTERNAL_ASSETS[1]);
  assert.notEqual(stored, network, "le cache conserve une copie, pas la réponse consommée");
  assert.equal(stored.status, 200);
  assert.equal(stored.body, "sdk-réseau");
  assert.ok(harness.log.fetch.some(call => call.url === EXTERNAL_ASSETS[1]));
});

test("externe : une réponse 404 est retournée mais jamais mise en cache", async () => {
  const notFound = makeResponse({ status: 404 });
  const harness = createHarness({ fetchImpl: async () => notFound });
  const { promise } = harness.runFetch({ url: EXTERNAL_ASSETS[2], method: "GET", mode: "no-cors" });
  assert.equal(await promise, notFound);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(EXTERNAL_ASSETS[2]) ?? false, false);
  assert.equal(harness.log.puts.length, 0);
});

test("externe : l'écriture en cache reste confinée au cache WAT", async () => {
  const harness = createHarness({ fetchImpl: async () => makeResponse() });
  const { promise } = harness.runFetch({ url: EXTERNAL_ASSETS[0], method: "GET", mode: "no-cors" });
  await promise;
  await flush();
  assert.deepEqual([...new Set(harness.log.opened)], [CACHE_NAME]);
});

/* ------------------------------------------------------------------ */
/* Navigation et fonctionnement hors connexion                         */
/* ------------------------------------------------------------------ */

test("navigation : une réponse 200 est renvoyée puis mise en cache", async () => {
  const network = makeResponse({ body: "page" });
  const harness = createHarness({ fetchImpl: async () => network });
  const url = appUrl("./nour-al-hidaya.html");
  const { responded, promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(responded, true);
  assert.equal(await promise, network);
  await flush();
  const stored = harness.stores.get(CACHE_NAME).get(url);
  assert.notEqual(stored, network, "le cache conserve une copie, pas la réponse consommée");
  assert.equal(stored.status, 200);
  assert.equal(stored.body, "page");
});

test("navigation : une réponse 5xx est remplacée par la version en cache", async () => {
  const cached = makeResponse({ body: "version-hors-ligne" });
  const url = appUrl("./nour-al-hidaya.html");
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: cached } },
    fetchImpl: async () => makeResponse({ status: 503 })
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, cached);
  assert.equal(harness.log.puts.length, 0);
});

test("navigation : une réponse 5xx sans cache est transmise telle quelle", async () => {
  const failure = makeResponse({ status: 503 });
  const harness = createHarness({ fetchImpl: async () => failure });
  const { promise } = harness.runFetch({
    url: appUrl("./programmes.html"),
    method: "GET",
    mode: "navigate"
  });
  assert.equal(await promise, failure);
});

test("navigation : une panne réseau utilise la page précachée correspondante", async () => {
  const cached = makeResponse({ body: "programmes" });
  const url = appUrl("./programmes.html");
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: cached } },
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, cached);
});

test("navigation : sans page précachée, la panne réseau retombe sur index.html", async () => {
  const index = makeResponse({ body: "accueil" });
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [appUrl("./index.html")]: index } },
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({
    url: appUrl("./activites.html"),
    method: "GET",
    mode: "navigate"
  });
  assert.equal(await promise, index);
});

test("navigation : une panne réseau sans cache est prise en charge par respondWith", async () => {
  const harness = createHarness({
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { responded, promise } = harness.runFetch({
    url: appUrl("./projets.html"),
    method: "GET",
    mode: "navigate"
  });
  assert.equal(responded, true);
  // La promesse provient du contexte node:vm : son constructeur diffère de
  // celui du test. On attend la réponse effective au lieu de tester
  // `instanceof Promise`, puis on vérifie son contenu.
  const response = await promise;
  assert.equal(response.status, 503);
  assert.equal(response.statusText, "Service Unavailable");
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assert.match(body, /hors connexion/i);
  assert.match(body, /lang="en"/);
  assert.match(body, /lang="ar"/);
});

test("navigation : une réponse 404 est transmise et n'est pas mise en cache", async () => {
  const notFound = makeResponse({ status: 404 });
  const harness = createHarness({ fetchImpl: async () => notFound });
  const url = appUrl("./club-khuddam.html");
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, notFound);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
});

test("navigation : une réponse 404 n'est pas masquée par une version en cache", async () => {
  const cached = makeResponse({ body: "ancienne-version" });
  const url = appUrl("./administration.html");
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: cached } },
    fetchImpl: async () => makeResponse({ status: 404 })
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  const result = await promise;
  assert.notEqual(result, cached);
  assert.equal(result.status, 404);
});

/* ------------------------------------------------------------------ */
/* Ressources statiques                                                */
/* ------------------------------------------------------------------ */

test("statique : une ressource précachée est servie sans appel réseau", async () => {
  const cached = makeResponse({ body: "css" });
  const url = appUrl("./wat-brand.css");
  const harness = createHarness({ initialCaches: { [CACHE_NAME]: { [url]: cached } } });
  const { responded, promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(responded, true);
  assert.equal(await promise, cached);
  assert.equal(harness.log.fetch.length, 0);
});

test("statique : une ressource récupérée avec succès est mise en cache", async () => {
  const network = makeResponse({ body: "css" });
  const url = appUrl("./wat-brand-nour.css");
  const harness = createHarness({ fetchImpl: async () => network });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, network);
  await flush();
  const stored = harness.stores.get(CACHE_NAME).get(url);
  assert.notEqual(stored, network, "le cache conserve une copie, pas la réponse consommée");
  assert.equal(stored.status, 200);
  assert.equal(stored.body, "css");
});

test("statique : une réponse 404 n'est jamais mise en cache", async () => {
  const notFound = makeResponse({ status: 404 });
  const url = appUrl("./icon-192.png");
  const harness = createHarness({ fetchImpl: async () => notFound });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, notFound);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
});

test("statique : une réponse 500 n'est jamais mise en cache", async () => {
  const failure = makeResponse({ status: 500 });
  const url = appUrl("./manifest.json");
  const harness = createHarness({ fetchImpl: async () => failure });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, failure);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
  assert.equal(harness.log.puts.length, 0);
});

test("statique : une panne réseau sur une ressource non navigate rejette la requête", async () => {
  const harness = createHarness({
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({
    url: appUrl("./firebase-init.js"),
    method: "GET",
    mode: "no-cors"
  });
  await assert.rejects(async () => { await promise; });
});

/* ------------------------------------------------------------------ */
/* Protection des données privées                                      */
/* ------------------------------------------------------------------ */

test("privé : les points d'authentification ne sont jamais interceptés", () => {
  const harness = createHarness();
  for (const url of [
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=secret",
    "https://securetoken.googleapis.com/v1/token?key=secret"
  ]) {
    const { responded } = harness.runFetch({ url, method: "GET", mode: "cors" });
    assert.equal(responded, false, url);
  }
  assert.equal(harness.log.fetch.length, 0);
});

test("privé : les appels Firestore en lecture comme en écriture ne sont pas interceptés", () => {
  const harness = createHarness();
  const url = "https://firestore.googleapis.com/v1/projects/wat/databases/(default)/documents/membres";
  assert.equal(harness.runFetch({ url, method: "GET", mode: "cors" }).responded, false);
  assert.equal(harness.runFetch({ url, method: "POST", mode: "cors" }).responded, false);
  assert.equal(harness.log.fetch.length, 0);
});

test("privé : aucune clé de cache ne contient de chaîne de requête ou de jeton", async () => {
  const harness = createHarness();
  await harness.install();
  harness.runFetch({ url: appUrl("./index.html"), method: "GET", mode: "navigate" });
  await flush();
  for (const name of harness.stores.keys()) {
    for (const key of harness.stores.get(name).keys()) {
      assert.doesNotMatch(key, /[?#]/, `clé de cache exposée : ${key}`);
      assert.doesNotMatch(
        key,
        /key=|token=|access_token|id_token|refresh_token|firestore\.googleapis|identitytoolkit/i,
        `clé de cache sensible : ${key}`
      );
    }
  }
});

// L'acceptation des réponses opaques est un choix fonctionnel assumé pour le
// mode hors ligne ; le risque conditionnel d'absence de SRI est documenté en test.todo.
test("privé : seules les réponses 200 ou opaques sont écrites en cache", async () => {
  const harness = createHarness({
    fetchImpl: async url => {
      if (!EXTERNAL_ASSETS.includes(url)) return makeResponse();
      const position = EXTERNAL_ASSETS.indexOf(url);
      if (position === 0) return makeResponse({ status: 200 });
      if (position === 1) return makeResponse({ status: 401 });
      return makeResponse({ status: 0, type: "opaque" });
    }
  });
  await harness.install();
  assert.ok(harness.log.puts.length > 0, "au moins une réponse autorisée est mise en cache");
  for (const entry of harness.log.puts) {
    assert.ok(
      entry.status === 200 || entry.type === "opaque",
      `écriture inattendue : ${JSON.stringify(entry)}`
    );
  }
  assert.equal(
    harness.log.puts.some(entry => entry.key === EXTERNAL_ASSETS[1]),
    false,
    "une réponse 401 ne doit pas être mise en cache"
  );
  assert.ok(harness.log.puts.some(entry => entry.key === EXTERNAL_ASSETS[0]));
  assert.ok(harness.log.puts.some(entry => entry.key === EXTERNAL_ASSETS[2]));
});

test("privé : après installation, le cache ne contient que les fichiers autorisés", async () => {
  const harness = createHarness();
  await harness.install();
  const expected = new Set([...APP_FILES.map(appUrl), ...EXTERNAL_ASSETS]);
  for (const key of harness.stores.get(CACHE_NAME).keys()) {
    assert.ok(expected.has(key), `ressource non autorisée en cache : ${key}`);
  }
  assert.equal(harness.stores.get(CACHE_NAME).size, expected.size);
});

/* ------------------------------------------------------------------ */
/* Intégrité, versionnement et contamination entre applications        */
/* ------------------------------------------------------------------ */

test("intégrité : le nom du cache est versionné et propre à WAT Connect", () => {
  assert.match(CACHE_NAME, /^wat-connect-shell-v\d+$/);
  assert.ok(!CACHE_NAME.includes("nour-al-hidaya"));
});

test("intégrité : toutes les clés de cache sont des URL absolues", async () => {
  const harness = createHarness();
  await harness.install();
  for (const key of harness.stores.get(CACHE_NAME).keys()) {
    assert.match(key, /^https:\/\//, key);
  }
});

test("intégrité : APP_FILES ne contient que des chemins locaux uniques et sans traversée", () => {
  assert.ok(APP_FILES.length >= 20, "liste de précache suffisamment complète");
  assert.equal(new Set(APP_FILES).size, APP_FILES.length, "aucun doublon");
  for (const file of APP_FILES) {
    assert.ok(file.startsWith("./"), `chemin local attendu : ${file}`);
    assert.doesNotMatch(file, /\.\./, `traversée interdite : ${file}`);
    assert.doesNotMatch(file, /\/\//, `double séparateur interdit : ${file}`);
    assert.doesNotMatch(file, /[?#]/, `paramètre interdit : ${file}`);
  }
});

test("intégrité : APP_FILES couvre les pages, scripts et manifestes essentiels", () => {
  for (const required of [
    "./index.html",
    "./portail.html",
    "./site-institutionnel.html",
    "./nour-al-hidaya.html",
    "./administration.html",
    "./programmes.html",
    "./activites.html",
    "./projets.html",
    "./club-khuddam.html",
    "./club-khuddam-inscription.html",
    "./club-khuddam-espace.html",
    "./firebase-init.js",
    "./manifest.json",
    "./manifest-nour.json"
  ]) {
    assert.ok(APP_FILES.includes(required), `fichier manquant : ${required}`);
  }
});

test("intégrité : les paires d'icônes 192/512 des deux applications sont précachées", () => {
  for (const icon of [
    "./icon-192.png",
    "./icon-512.png",
    "./wat-icon-192.png",
    "./wat-icon-512.png",
    "./nour-icon-192.png",
    "./nour-icon-512.png"
  ]) {
    assert.ok(APP_FILES.includes(icon), `icône manquante : ${icon}`);
  }
});

test("intégrité : les SDK externes sont figés sur une version exacte, sans paramètre", () => {
  assert.equal(EXTERNAL_ASSETS.length, 3);
  for (const asset of EXTERNAL_ASSETS) {
    assert.match(
      asset,
      /^https:\/\/www\.gstatic\.com\/firebasejs\/11\.10\.0\/firebase-(app|auth|firestore)-compat\.js$/
    );
    assert.doesNotMatch(asset, /[?#]/);
  }
});

test("sécurité : le service worker n'exécute aucun code dynamique distant", () => {
  assert.doesNotMatch(swSource, /\beval\s*\(/);
  assert.doesNotMatch(swSource, /new\s+Function\s*\(/);
  assert.doesNotMatch(swSource, /importScripts\s*\(\s*["'`]https?:/);
});

test("sécurité : aucune écriture ne consomme la réponse réseau destinée à la page", () => {
  assert.doesNotMatch(swSource, /cache\.put\(request,\s*response\)/);
  const puts = [...swSource.matchAll(/cache\.put\(([^)]*)\)/g)];
  assert.ok(puts.length > 0, "au moins une écriture en cache");
  for (const [, args] of puts) {
    assert.match(args, /\b(copy|response)\b/, `source d'écriture inattendue : ${args}`);
  }
  assert.match(swSource, /response\.clone\(\)/, "au moins une copie avant écriture");
});

test("contamination : le service worker n'ouvre que son cache applicatif", async () => {
  const opens = [...swSource.matchAll(/caches\.open\(([^)]*)\)/g)].map(match => match[1].trim());
  assert.ok(opens.length > 0, "au moins une ouverture de cache");
  for (const argument of opens) {
    assert.equal(argument, "CACHE_NAME", "toute ouverture doit utiliser la constante CACHE_NAME");
  }

  const harness = createHarness();
  await harness.install();
  harness.runFetch({ url: EXTERNAL_ASSETS[0], method: "GET", mode: "no-cors" });
  harness.runFetch({ url: appUrl("./index.html"), method: "GET", mode: "navigate" });
  harness.runFetch({ url: appUrl("./wat-brand.css"), method: "GET", mode: "no-cors" });
  await flush();
  assert.deepEqual([...new Set(harness.log.opened)], [CACHE_NAME]);
});

test("contamination : une autre application servie sur la même origine garde son cache intact", async () => {
  const otherCache = "autre-application-shell-v1";
  const otherKey = "https://wat.example/autre-application.html";
  const otherResponse = makeResponse({ body: "autre" });
  const harness = createHarness({
    initialCaches: {
      [CACHE_NAME]: {},
      [otherCache]: { [otherKey]: otherResponse }
    }
  });
  await harness.activate();
  assert.equal(harness.stores.get(otherCache).get(otherKey), otherResponse);
  const { responded } = harness.runFetch({ url: otherKey, method: "GET", mode: "navigate" });
  assert.equal(responded, false, "le worker ne gère pas les pages d'une autre application");
});

/* ------------------------------------------------------------------ */
/* Fidélité du simulateur CacheStorage                                */
/* ------------------------------------------------------------------ */

test("simulateur : Cache.put refuse une réponse 206", async () => {
  const harness = createHarness();
  const cache = await harness.cacheStorage.open(CACHE_NAME);
  const url = appUrl("./icon-512.png");
  await assert.rejects(cache.put(url, makeResponse({ status: 206 })), TypeError);
  assert.equal(await cache.match(url), undefined);
  assert.equal(harness.log.puts.length, 0);
  assert.ok(harness.log.putRejections.some(entry => entry.key === url));
});

test("simulateur : Cache.addAll refuse une réponse 206", async () => {
  const harness = createHarness({ fetchImpl: async () => makeResponse({ status: 206 }) });
  const cache = await harness.cacheStorage.open(CACHE_NAME);
  const url = appUrl("./index.html");
  await assert.rejects(cache.addAll([url]), TypeError);
  assert.equal(await cache.match(url), undefined);
});

/* ------------------------------------------------------------------ */
/* Caractérisations complémentaires : requêtes non autorisées,        */
/* erreurs réseau, 4xx/5xx, contamination et fraîcheur du cache       */
/* ------------------------------------------------------------------ */

test("filtrage : une navigation same-origin non listée n'est pas redirigée vers l'accueil", () => {
  const harness = createHarness();
  const { responded } = harness.runFetch({
    url: appUrl("./page-inconnue.html"),
    method: "GET",
    mode: "navigate"
  });
  assert.equal(responded, false, "aucun fallback pour une navigation non gérée");
  assert.equal(harness.log.fetch.length, 0);
});

test("filtrage : une navigation vers une autre origine n'est pas interceptée", () => {
  const harness = createHarness();
  const { responded } = harness.runFetch({
    url: "https://autre-application.example/index.html",
    method: "GET",
    mode: "navigate"
  });
  assert.equal(responded, false);
  assert.equal(harness.log.fetch.length, 0);
});

test("filtrage : un changement de protocole ou de port n'est pas intercepté", () => {
  const harness = createHarness();
  for (const url of ["http://wat.example/index.html", "https://wat.example:8443/index.html"]) {
    const { responded } = harness.runFetch({ url, method: "GET", mode: "navigate" });
    assert.equal(responded, false, url);
  }
  assert.equal(harness.log.fetch.length, 0);
});

test("filtrage : un chemin encodé ne contourne pas la liste blanche", () => {
  const harness = createHarness();
  for (const url of [`${SCOPE}secret`, `${SCOPE}index%2Ehtml`, `${SCOPE}index.html%00`]) {
    const { responded } = harness.runFetch({ url, method: "GET", mode: "navigate" });
    assert.equal(responded, false, url);
  }
  assert.equal(harness.log.fetch.length, 0);
});

test("externe : une URL de SDK avec paramètre n'est pas reconnue", () => {
  const harness = createHarness();
  const { responded } = harness.runFetch({
    url: `${EXTERNAL_ASSETS[0]}?v=1`,
    method: "GET",
    mode: "no-cors"
  });
  assert.equal(responded, false);
  assert.equal(harness.log.fetch.length, 0);
});

test("installation : un échec du précache applicatif ne laisse aucune entrée partielle", async () => {
  const harness = createHarness({
    fetchImpl: async url =>
      url === appUrl("./programmes.html") ? makeResponse({ status: 500 }) : makeResponse()
  });
  await assert.rejects(harness.install());
  assert.ok(harness.log.opened.length > 0, "le cache a bien été ouvert");
  assert.deepEqual([...new Set(harness.log.opened)], [CACHE_NAME]);
  const store = harness.stores.get(CACHE_NAME);
  assert.equal(store ? store.size : 0, 0, "aucune entrée partielle après échec du précache");
});

test("installation : un SDK en échec n'empêche pas la mise en cache des autres SDK", async () => {
  const good = makeResponse({ body: "sdk" });
  const harness = createHarness({
    fetchImpl: async url => {
      if (url === EXTERNAL_ASSETS[0]) throw new TypeError("réseau indisponible");
      if (EXTERNAL_ASSETS.includes(url)) return good;
      return makeResponse();
    }
  });
  await harness.install();
  const store = harness.stores.get(CACHE_NAME);
  assert.equal(store.has(EXTERNAL_ASSETS[0]), false);
  assert.equal(store.get(EXTERNAL_ASSETS[1]), good);
  assert.equal(store.get(EXTERNAL_ASSETS[2]), good);
});

test("externe : une réponse 5xx n'est pas mise en cache", async () => {
  const failure = makeResponse({ status: 503 });
  const harness = createHarness({ fetchImpl: async () => failure });
  const { promise } = harness.runFetch({
    url: EXTERNAL_ASSETS[0],
    method: "GET",
    mode: "no-cors"
  });
  assert.equal(await promise, failure);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(EXTERNAL_ASSETS[0]) ?? false, false);
  assert.equal(harness.log.puts.length, 0);
});

test("externe : une panne réseau sans copie en cache rejette la requête", async () => {
  const harness = createHarness({
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({
    url: EXTERNAL_ASSETS[0],
    method: "GET",
    mode: "no-cors"
  });
  await assert.rejects(promise, TypeError);
});

test("statique : les réponses 401 et 403 ne sont jamais mises en cache", async () => {
  for (const status of [401, 403]) {
    const harness = createHarness({ fetchImpl: async () => makeResponse({ status }) });
    const url = appUrl("./manifest.json");
    const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
    assert.equal((await promise).status, status);
    await flush();
    assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false, `statut ${status}`);
  }
});

test("statique : une redirection 302 n'est pas mise en cache", async () => {
  const redirect = makeResponse({ status: 302 });
  const url = appUrl("./manifest-nour.json");
  const harness = createHarness({ fetchImpl: async () => redirect });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, redirect);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
  assert.equal(harness.log.puts.length, 0);
});

test("statique : une réponse de statut 0 non opaque n'est pas mise en cache", async () => {
  const failed = makeResponse({ status: 0, type: "basic" });
  const url = appUrl("./wat-brand.css");
  const harness = createHarness({ fetchImpl: async () => failed });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, failed);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
  assert.equal(harness.log.puts.length, 0);
});

test("navigation : une réponse 401 est transmise et n'est pas mise en cache", async () => {
  const unauthorized = makeResponse({ status: 401 });
  const url = appUrl("./administration.html");
  const harness = createHarness({ fetchImpl: async () => unauthorized });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, unauthorized);
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
});

/* ------------------------------------------------------------------ */
/* Lot 002 — isolation stricte du cache (axe A)                        */
/* ------------------------------------------------------------------ */

test("isolation : une entrée identique d'un cache étranger n'est jamais servie", async () => {
  const url = appUrl("./index.html");
  const foreign = makeResponse({ body: "cache-étranger" });
  const network = makeResponse({ body: "réseau" });
  const harness = createHarness({
    initialCaches: { "autre-application-shell-v1": { [url]: foreign }, [CACHE_NAME]: {} },
    fetchImpl: async () => network
  });
  const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, network, "la réponse réseau prime sur le cache tiers");
  await Promise.all(pendingWrites);
  assert.equal(harness.log.globalMatches, 0, "aucune recherche globale de cache");
  assert.equal(harness.stores.get("autre-application-shell-v1").get(url), foreign,
    "le cache tiers reste intact");
  assert.equal(harness.stores.get(CACHE_NAME).get(url).body, "réseau");
});

test("isolation : une ancienne version du cache WAT n'est jamais servie", async () => {
  const url = appUrl("./index.html");
  const stale = makeResponse({ body: "v5-obsolète" });
  const network = makeResponse({ body: "v6" });
  const harness = createHarness({
    initialCaches: { "wat-connect-shell-v5": { [url]: stale }, [CACHE_NAME]: {} },
    fetchImpl: async () => network
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, network);
  assert.equal(harness.log.globalMatches, 0);
});

test("isolation : hors connexion, une copie d'un cache étranger n'est jamais utilisée", async () => {
  const url = appUrl("./programmes.html");
  const foreign = makeResponse({ body: "page-étrangère" });
  const harness = createHarness({
    initialCaches: { "autre-application-shell-v1": { [url]: foreign } },
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  const result = await promise;
  assert.notEqual(result, foreign, "le contenu d'une autre application n'est pas servi");
  assert.equal(result.status, 503, "réponse hors ligne explicite");
});

test("isolation : une indisponibilité du cache laisse passer la réponse réseau", async () => {
  const network = makeResponse({ body: "page-réseau" });
  const harness = createHarness({ openFails: true, fetchImpl: async () => network });
  const { promise, pendingWrites } = harness.runFetch({
    url: appUrl("./projets.html"),
    method: "GET",
    mode: "navigate"
  });
  assert.equal(await promise, network, "la navigation reste servie");
  await Promise.all(pendingWrites);
  assert.equal(harness.log.puts.length, 0);
});

test("isolation : cache indisponible et réseau coupé produisent une réponse explicite", async () => {
  const harness = createHarness({
    openFails: true,
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({
    url: appUrl("./activites.html"),
    method: "GET",
    mode: "navigate"
  });
  const result = await promise;
  assert.equal(result.status, 503);
  assert.match(result.headers.get("content-type"), /text\/html/);
});

test("isolation : aucune lecture ne passe par caches.match global", async () => {
  const harness = createHarness();
  await harness.install();
  harness.runFetch({ url: appUrl("./index.html"), method: "GET", mode: "navigate" });
  harness.runFetch({ url: appUrl("./wat-brand.css"), method: "GET", mode: "no-cors" });
  harness.runFetch({ url: EXTERNAL_ASSETS[0], method: "GET", mode: "no-cors" });
  await flush();
  assert.equal(harness.log.globalMatches, 0);
  assert.deepEqual([...new Set(harness.log.opened)], [CACHE_NAME]);
});

/* ------------------------------------------------------------------ */
/* Lot 002 — sécurité des réponses HTTP (axe B)                        */
/* ------------------------------------------------------------------ */

test("206 : une réponse partielle n'est jamais proposée au cache", async () => {
  for (const mode of ["no-cors", "navigate"]) {
    const partial = makeResponse({ status: 206, body: "partiel" });
    const url = appUrl("./icon-192.png");
    const harness = createHarness({ fetchImpl: async () => partial });
    const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode });
    assert.equal(await promise, partial, `la 206 est transmise telle quelle (${mode})`);
    await Promise.all(pendingWrites);
    await flush();
    assert.equal(harness.log.putRejections.length, 0,
      `aucune tentative d'écriture d'une 206 (${mode})`);
    assert.equal(harness.log.puts.length, 0, `aucune écriture (${mode})`);
    assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false, mode);
  }
});

test("206 : un SDK partiel n'est pas mis en cache", async () => {
  const partial = makeResponse({ status: 206 });
  const harness = createHarness({ fetchImpl: async () => partial });
  const { promise, pendingWrites } = harness.runFetch({
    url: EXTERNAL_ASSETS[0],
    method: "GET",
    mode: "no-cors"
  });
  assert.equal(await promise, partial);
  await Promise.all(pendingWrites);
  assert.equal(harness.log.puts.length, 0);
  assert.equal(harness.log.putRejections.length, 0);
});

test("cache-control : les réponses privées ou non stockables ne sont jamais écrites", async () => {
  for (const value of ["private", "no-store", "private, max-age=0", "no-cache", "max-age=0, no-store"]) {
    const network = makeResponse({ body: "sensible", headers: { "Cache-Control": value } });
    const url = appUrl("./administration.html");
    const harness = createHarness({ fetchImpl: async () => network });
    const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "navigate" });
    assert.equal(await promise, network, value);
    await Promise.all(pendingWrites);
    assert.equal(harness.log.puts.length, 0, `Cache-Control: ${value}`);
    assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false, value);
  }
});

test("cache-control : une réponse publique reste mise en cache (témoin positif)", async () => {
  const network = makeResponse({ body: "public", headers: { "Cache-Control": "public, max-age=3600" } });
  const url = appUrl("./nour-al-hidaya.html");
  const harness = createHarness({ fetchImpl: async () => network });
  const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, network);
  await Promise.all(pendingWrites);
  assert.equal(harness.log.puts.length, 1, "une réponse publique est bien stockée");
  assert.equal(harness.stores.get(CACHE_NAME).get(url).body, "public");
});

test("vary : les réponses dépendantes d'Authorization ou de toute requête ne sont pas stockées", async () => {
  for (const value of ["*", "Authorization", "Accept-Encoding, Authorization"]) {
    const network = makeResponse({ body: "variable", headers: { Vary: value } });
    const url = appUrl("./club-khuddam.html");
    const harness = createHarness({ fetchImpl: async () => network });
    const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "navigate" });
    assert.equal(await promise, network, value);
    await Promise.all(pendingWrites);
    assert.equal(harness.log.puts.length, 0, `Vary: ${value}`);
  }
});

test("vary : une dimension de négociation neutre n'empêche pas la mise en cache", async () => {
  const network = makeResponse({ body: "négocié", headers: { Vary: "Accept-Encoding" } });
  const url = appUrl("./wat-brand.css");
  const harness = createHarness({ fetchImpl: async () => network });
  const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, network);
  await Promise.all(pendingWrites);
  assert.equal(harness.log.puts.length, 1);
});

test("authorization : toute requête authentifiée est exclue avant lecture et écriture, SDK inclus", () => {
  const cases = [
    { url: appUrl("./club-khuddam-espace.html"), mode: "navigate" },
    { url: appUrl("./wat-brand.css"), mode: "no-cors" },
    { url: EXTERNAL_ASSETS[0], mode: "no-cors" }
  ];
  for (const { url, mode } of cases) {
    const cached = makeResponse({ body: "copie-locale" });
    const harness = createHarness({
      initialCaches: { [CACHE_NAME]: { [url]: cached } },
      fetchImpl: async () => makeResponse({ body: "réseau" })
    });
    for (const headerName of ["Authorization", "authorization"]) {
      const { responded } = harness.runFetch({
        url,
        method: "GET",
        mode,
        headers: makeHeaders({ [headerName]: "Bearer secret" })
      });
      assert.equal(responded, false, `${url} (${headerName})`);
    }
    assert.equal(harness.log.fetch.length, 0, `aucun appel réseau pour ${url}`);
    assert.equal(harness.log.opened.length, 0, `aucune ouverture de cache pour ${url}`);
    assert.equal(
      harness.stores.get(CACHE_NAME).get(url),
      cached,
      "le cache existant reste intact"
    );
  }
});

test("navigation : une réponse 403 n'est jamais remplacée par une copie locale", async () => {
  const cached = makeResponse({ body: "ancienne-version" });
  const forbidden = makeResponse({ status: 403 });
  const url = appUrl("./administration.html");
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: cached } },
    fetchImpl: async () => forbidden
  });
  const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, forbidden);
  await Promise.all(pendingWrites);
  assert.equal(harness.stores.get(CACHE_NAME).get(url), cached,
    "le refus d'accès n'écrase pas la copie locale");
});

test("navigation : une réponse 500 est remplacée par la copie locale sans écriture", async () => {
  const cached = makeResponse({ body: "secours" });
  const failure = makeResponse({ status: 500 });
  const url = appUrl("./portail.html");
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: cached } },
    fetchImpl: async () => failure
  });
  const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, cached);
  await Promise.all(pendingWrites);
  assert.equal(harness.log.puts.length, 0);
  assert.equal(harness.stores.get(CACHE_NAME).get(url), cached);
});

/* ------------------------------------------------------------------ */
/* Lot 002 — robustesse des écritures (axe C)                          */
/* ------------------------------------------------------------------ */

test("écriture : un rejet de Cache.put ne dégrade pas la réponse réseau", async () => {
  const network = makeResponse({ body: "page" });
  const url = appUrl("./index.html");
  const harness = createHarness({ fetchImpl: async () => network, putFails: () => true });
  for (let round = 0; round < 2; round += 1) {
    const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "navigate" });
    assert.equal(await promise, network, `tour ${round}`);
    // Promise.all propage un rejet : l'absence de rejet prouve que l'échec
    // d'écriture est absorbé et ne produit pas de promesse orpheline.
    await Promise.all(pendingWrites);
  }
  assert.equal(harness.log.putFailures.length, 2, "les deux échecs sont tracés");
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
});

test("écriture : un quota insuffisant n'empêche pas le service des ressources statiques", async () => {
  const network = makeResponse({ body: "css" });
  const url = appUrl("./wat-brand.css");
  const harness = createHarness({ fetchImpl: async () => network, putFails: () => true });
  const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, network);
  await Promise.all(pendingWrites);
  assert.equal(harness.log.puts.length, 0);
  assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false);
});

test("écriture : un quota insuffisant sur un SDK n'empêche pas skipWaiting", async () => {
  const harness = createHarness({ putFails: key => EXTERNAL_ASSETS.includes(key) });
  await harness.install();
  assert.ok(harness.log.skipWaiting >= 1, "l'installation aboutit malgré le quota");
  assert.equal(harness.stores.get(CACHE_NAME).size, APP_FILES.length);
  assert.equal(harness.log.putFailures.length, EXTERNAL_ASSETS.length);
});

test("écriture : un waitUntil finalisé ne casse pas la navigation", async () => {
  const network = makeResponse({ body: "page" });
  const url = appUrl("./index.html");
  const harness = createHarness({ fetchImpl: async () => network });
  let promise;
  harness.handlers.get("fetch")({
    request: { url, method: "GET", mode: "navigate" },
    respondWith: value => {
      promise = value;
    },
    waitUntil: () => {
      throw new Error("InvalidStateError: événement déjà finalisé");
    }
  });
  assert.equal(await promise, network, "la réponse reste servie malgré waitUntil en échec");
  await flush();
  assert.equal(harness.stores.get(CACHE_NAME).get(url).body, "page",
    "l'écriture est tout de même tentée");
});

test("écriture : un SDK récupéré avec succès est écrit après la réponse, sans la consommer", async () => {
  const network = makeResponse({ body: "sdk" });
  const harness = createHarness({ fetchImpl: async () => network });
  const { promise, pendingWrites } = harness.runFetch({
    url: EXTERNAL_ASSETS[2],
    method: "GET",
    mode: "no-cors"
  });
  assert.equal(await promise, network, "la réponse réseau est rendue intacte");
  assert.equal(pendingWrites.length, 1, "l'écriture est rattachée à waitUntil");
  await Promise.all(pendingWrites);
  const stored = harness.stores.get(CACHE_NAME).get(EXTERNAL_ASSETS[2]);
  assert.notEqual(stored, network);
  assert.equal(stored.body, "sdk");
});

/* ------------------------------------------------------------------ */
/* Lot 002 — fonctionnement hors connexion (axe D)                     */
/* ------------------------------------------------------------------ */

test("hors connexion : sans aucun cache, une réponse 503 explicite est renvoyée", async () => {
  const harness = createHarness({
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { responded, promise } = harness.runFetch({
    url: appUrl("./nour-al-hidaya.html"),
    method: "GET",
    mode: "navigate"
  });
  assert.equal(responded, true);
  const response = await promise;
  assert.equal(response.status, 503);
  assert.equal(response.statusText, "Service Unavailable");
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.equal(response.headers.get("location"), null, "aucune redirection");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.text();
  assert.match(body, /hors connexion/i);
  assert.match(body, /WAT Connect/);
  assert.doesNotMatch(body, /<script/i, "aucune ressource exécutable dans la page de secours");
});

test("hors connexion : le worker ne redirige jamais arbitrairement une navigation", () => {
  assert.doesNotMatch(swSource, /Response\.redirect\s*\(/);
  assert.doesNotMatch(swSource, /\blocation\.(?:replace|assign)\s*\(/);
  assert.doesNotMatch(swSource, /window\.location/);
});

test("hors connexion : la page précachée reste prioritaire sur la page de secours", async () => {
  const cached = makeResponse({ body: "programmes-hors-ligne" });
  const url = appUrl("./programmes.html");
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: cached } },
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, cached);
});

test("activation : un cache tiers au préfixe proche est préservé", async () => {
  const harness = createHarness({
    initialCaches: {
      [CACHE_NAME]: {},
      "wat-connect-cache-extra": {},
      "wat-connect-shell-v6-backup": {},
      "nour-al-hidaya-shell-v2": {}
    }
  });
  await harness.activate();
  assert.deepEqual(
    [...harness.stores.keys()].sort(),
    [CACHE_NAME, "wat-connect-cache-extra", "wat-connect-shell-v6-backup"].sort()
  );
  assert.deepEqual(harness.log.deletes, ["nour-al-hidaya-shell-v2"]);
});

test("activation : une suppression en échec n'annule pas le nettoyage ni clients.claim", async () => {
  const harness = createHarness({
    initialCaches: { "wat-connect-shell-v4": {}, "wat-connect-shell-v5": {}, [CACHE_NAME]: {} },
    deleteFails: name => name === "wat-connect-shell-v4"
  });
  await harness.activate();
  assert.ok(harness.log.claim >= 1, "les clients sont repris malgré l'échec");
  assert.deepEqual([...harness.stores.keys()].sort(), ["wat-connect-shell-v4", CACHE_NAME].sort());
  assert.deepEqual(harness.log.deleteFailures, ["wat-connect-shell-v4"]);
  assert.ok(harness.log.deletes.includes("wat-connect-shell-v5"));
});

/* ------------------------------------------------------------------ */
/* Lot 002 (contrôle final) — installation inspectée et atomique      */
/* ------------------------------------------------------------------ */

test("installation : le précache n'utilise pas addAll sans inspection des réponses", async () => {
  const harness = createHarness();
  await harness.install();
  assert.equal(harness.log.addAll.length, 0, "aucun addAll aveugle");
  assert.equal(
    harness.log.puts.length,
    APP_FILES.length + EXTERNAL_ASSETS.length,
    "chaque ressource autorisée est écrite après validation"
  );
});

test("installation : une réponse applicative privée fait échouer l'installation sans écriture partielle", async () => {
  for (const value of ["private", "no-store", "no-cache", "private, max-age=0"]) {
    const harness = createHarness({
      fetchImpl: async url =>
        url === appUrl("./index.html")
          ? makeResponse({ headers: { "Cache-Control": value } })
          : makeResponse()
    });
    await assert.rejects(harness.install());
    assert.equal(harness.log.skipWaiting, 0, `aucune activation (${value})`);
    assert.equal(harness.log.puts.length, 0, `aucune écriture (${value})`);
    const store = harness.stores.get(CACHE_NAME);
    assert.equal(store ? store.size : 0, 0, `cache vide (${value})`);
  }
});

test("installation : un SDK privé ou non stockable n'est pas mis en cache", async () => {
  for (const value of ["private", "no-store", "no-cache"]) {
    const harness = createHarness({
      fetchImpl: async url =>
        EXTERNAL_ASSETS.includes(url)
          ? makeResponse({ headers: { "Cache-Control": value } })
          : makeResponse()
    });
    await harness.install();
    const store = harness.stores.get(CACHE_NAME);
    for (const asset of EXTERNAL_ASSETS) {
      assert.equal(store.has(asset), false, `${asset} (${value})`);
    }
    assert.equal(
      harness.log.puts.some(entry => EXTERNAL_ASSETS.includes(entry.key)),
      false,
      `aucune écriture externe (${value})`
    );
    assert.ok(harness.log.skipWaiting >= 1, `installation maintenue (${value})`);
  }
});

test("installation : un échec d'écriture applicative annule les entrées déjà écrites", async () => {
  const harness = createHarness({
    putFails: key => key === appUrl("./portail.html")
  });
  await assert.rejects(harness.install());
  assert.equal(harness.log.skipWaiting, 0);
  const store = harness.stores.get(CACHE_NAME);
  assert.equal(store ? store.size : 0, 0, "rollback complet des écritures");
  assert.ok(harness.log.putFailures.length >= 1);
});

test("installation : une redirection same-origin d'un fichier applicatif reste précachable", async () => {
  const harness = createHarness({
    fetchImpl: async url =>
      url === appUrl("./")
        ? makeResponse({
            body: "index-redirigé",
            redirected: true,
            url: appUrl("./index.html")
          })
        : makeResponse()
  });
  await harness.install();
  const store = harness.stores.get(CACHE_NAME);
  assert.equal(store.get(appUrl("./")).body, "index-redirigé");
});

test("installation : une redirection applicative vers une autre origine est refusée", async () => {
  const harness = createHarness({
    fetchImpl: async url =>
      url === appUrl("./")
        ? makeResponse({
            body: "contenu-tiers",
            redirected: true,
            url: "https://cdn.example/index.html"
          })
        : makeResponse()
  });
  await assert.rejects(harness.install());
  assert.equal(harness.log.skipWaiting, 0);
  assert.equal(harness.log.puts.length, 0, "aucune écriture d'une redirection tierce");
});

/* ------------------------------------------------------------------ */
/* Lot 002 (contrôle final) — revalidation des entrées servies        */
/* ------------------------------------------------------------------ */

test("cache existant : une réponse privée ou non stockable n'est jamais servie", async () => {
  const variants = [
    { "Cache-Control": "private" },
    { "Cache-Control": "no-store" },
    { "Cache-Control": "no-cache" },
    { "Cache-Control": "private, max-age=0" },
    { Vary: "*" },
    { Vary: "Authorization" }
  ];
  for (const headers of variants) {
    const url = appUrl("./wat-brand.css");
    const stale = makeResponse({ body: "ancienne-copie", headers });
    const fresh = makeResponse({ body: "réseau-public" });
    const harness = createHarness({
      initialCaches: { [CACHE_NAME]: { [url]: stale } },
      fetchImpl: async () => fresh
    });
    const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
    const result = await promise;
    assert.notEqual(result, stale, `copie privée servie : ${JSON.stringify(headers)}`);
    assert.equal(result, fresh, `réseau attendu : ${JSON.stringify(headers)}`);
    await flush();
    assert.equal(
      harness.stores.get(CACHE_NAME).get(url).body,
      "réseau-public",
      `cache remplacé : ${JSON.stringify(headers)}`
    );
  }
});

test("cache existant : hors connexion, une réponse privée n'est jamais servie", async () => {
  const url = appUrl("./programmes.html");
  const stale = makeResponse({ body: "privée", headers: { "Cache-Control": "private" } });
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: stale } },
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  const result = await promise;
  assert.notEqual(result, stale, "aucune restitution de la copie privée");
  assert.equal(result.status, 503);
  assert.match(await result.text(), /hors connexion/i);
});

test("cache existant : une réponse 206 déjà stockée n'est jamais servie", async () => {
  const url = appUrl("./icon-192.png");
  const partial = makeResponse({ status: 206, body: "partiel" });
  const fresh = makeResponse({ body: "complet" });
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: partial } },
    fetchImpl: async () => fresh
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, fresh);
});

test("cache existant : une réponse issue d'une redirection n'est jamais servie", async () => {
  const url = appUrl("./manifest.json");
  const redirected = makeResponse({
    body: "redirigé",
    redirected: true,
    url: appUrl("./index.html")
  });
  const fresh = makeResponse({ body: "manifeste" });
  const harness = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: redirected } },
    fetchImpl: async () => fresh
  });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, fresh);
});

test("cache existant : une réponse publique reste servie (témoin positif)", async () => {
  const url = appUrl("./wat-brand.css");
  const cached = makeResponse({
    body: "public",
    headers: { "Cache-Control": "public, max-age=3600" }
  });
  const harness = createHarness({ initialCaches: { [CACHE_NAME]: { [url]: cached } } });
  const { promise } = harness.runFetch({ url, method: "GET", mode: "no-cors" });
  assert.equal(await promise, cached);
  assert.equal(harness.log.fetch.length, 0);
});

/* ------------------------------------------------------------------ */
/* Lot 002 (contrôle final) — Range et redirections suivies           */
/* ------------------------------------------------------------------ */

test("range : une requête Range n'est jamais interceptée, même avec une copie en cache", () => {
  const cases = [
    { url: appUrl("./icon-512.png"), mode: "no-cors" },
    { url: appUrl("./index.html"), mode: "navigate" },
    { url: EXTERNAL_ASSETS[1], mode: "no-cors" }
  ];
  for (const { url, mode } of cases) {
    const cached = makeResponse({ body: "copie" });
    const harness = createHarness({ initialCaches: { [CACHE_NAME]: { [url]: cached } } });
    const { responded } = harness.runFetch({
      url,
      method: "GET",
      mode,
      headers: makeHeaders({ Range: "bytes=0-1023" })
    });
    assert.equal(responded, false, url);
    assert.equal(harness.log.fetch.length, 0, `aucun réseau pour ${url}`);
    assert.equal(harness.log.opened.length, 0, `aucune lecture de cache pour ${url}`);
    assert.equal(harness.stores.get(CACHE_NAME).get(url), cached, "cache intact");
  }
});

test("redirection : une réponse suivie est servie mais jamais stockée au runtime", async () => {
  const cases = [
    { url: appUrl("./nour-al-hidaya.html"), mode: "navigate" },
    { url: appUrl("./wat-brand-nour.css"), mode: "no-cors" },
    { url: EXTERNAL_ASSETS[2], mode: "no-cors" }
  ];
  for (const { url, mode } of cases) {
    const redirected = makeResponse({
      body: "contenu-redirigé",
      redirected: true,
      url: appUrl("./index.html")
    });
    const harness = createHarness({ fetchImpl: async () => redirected });
    const { promise, pendingWrites } = harness.runFetch({ url, method: "GET", mode });
    assert.equal(await promise, redirected, url);
    await Promise.all(pendingWrites);
    await flush();
    assert.equal(harness.stores.get(CACHE_NAME)?.has(url) ?? false, false, url);
    assert.equal(harness.log.puts.length, 0, `aucune écriture pour ${url}`);
  }
});

test("redirection : un SDK obtenu après redirection n'est pas précaché", async () => {
  const redirected = makeResponse({
    body: "sdk-redirigé",
    redirected: true,
    url: EXTERNAL_ASSETS[0]
  });
  const harness = createHarness({
    fetchImpl: async url =>
      EXTERNAL_ASSETS.includes(url) ? redirected : makeResponse()
  });
  await harness.install();
  const store = harness.stores.get(CACHE_NAME);
  for (const asset of EXTERNAL_ASSETS) assert.equal(store.has(asset), false);
  assert.equal(
    harness.log.puts.some(entry => EXTERNAL_ASSETS.includes(entry.key)),
    false,
    "aucune écriture d'un SDK redirigé"
  );
});

/* ------------------------------------------------------------------ */
/* Lot 002 (contrôle final) — migration v6 -> v7                      */
/* ------------------------------------------------------------------ */

test("migration : le cache v6 est supprimé à l'activation de la version sécurisée", async () => {
  const version = Number(CACHE_NAME.match(/v(\d+)$/)[1]);
  assert.ok(version >= 7, `version sécurisée attendue, reçue : ${CACHE_NAME}`);
  const harness = createHarness({
    initialCaches: {
      "wat-connect-shell-v6": { [appUrl("./index.html")]: makeResponse({ body: "v6" }) },
      [CACHE_NAME]: {}
    }
  });
  await harness.activate();
  assert.equal(harness.stores.has("wat-connect-shell-v6"), false);
  assert.ok(harness.stores.has(CACHE_NAME));
  assert.ok(harness.log.deletes.includes("wat-connect-shell-v6"));
});

test("migration : après activation, aucune entrée du cache v6 n'est servie", async () => {
  const url = appUrl("./index.html");
  const obsolete = makeResponse({ body: "v6-obsolète" });
  const network = makeResponse({ body: "v7-réseau" });
  const harness = createHarness({
    initialCaches: {
      "wat-connect-shell-v6": { [url]: obsolete },
      [CACHE_NAME]: {}
    },
    fetchImpl: async () => network
  });
  await harness.activate();
  const { promise } = harness.runFetch({ url, method: "GET", mode: "navigate" });
  assert.equal(await promise, network);
  assert.equal(harness.log.globalMatches, 0);
});

/* ------------------------------------------------------------------ */
/* Lot 002 (contrôle final) — page hors connexion trilingue           */
/* ------------------------------------------------------------------ */

test("hors connexion : le message de secours est trilingue et sans dépendance réseau", async () => {
  const harness = createHarness({
    fetchImpl: async () => {
      throw new TypeError("hors connexion");
    }
  });
  const { promise } = harness.runFetch({
    url: appUrl("./nour-al-hidaya.html"),
    method: "GET",
    mode: "navigate"
  });
  const response = await promise;
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.match(body, /lang="fr"/);
  assert.match(body, /lang="en"/);
  assert.match(body, /lang="ar"/);
  assert.match(body, /dir="rtl"/);
  assert.match(body, /hors connexion/i);
  assert.match(body, /temporarily offline/i);
  assert.match(body, /غير متصل/);
  assert.doesNotMatch(body, /<script/i);
  assert.doesNotMatch(body, /<link/i);
  assert.doesNotMatch(body, /@import/i);
  assert.doesNotMatch(body, /https?:\/\//i);
});

/* ------------------------------------------------------------------ */
/* Risques résiduels non traités par le lot 002                        */
/*                                                                     */
/* Ces entrées restent des test.todo : elles documentent des limites   */
/* assumées ou hors périmètre, sans affaiblir les tests exécutables.   */
/* ------------------------------------------------------------------ */

test.todo("RISQUE conditionnel (faible) : une ressource statique en cache n'est jamais revalidée avant expiration du cache");
test.todo("RISQUE conditionnel (moyenne) : les SDK opaques sont mis en cache sans SRI ni vérification de contenu");
test.todo("RISQUE conditionnel (faible) : administration.html et club-khuddam-espace.html sont précachés sans vérification de contenu");
test.todo("RISQUE conditionnel (faible) : la correspondance Cache.match ne tient pas compte d'un Vary autre que * ou Authorization");
test.todo("ANOMALIE confirmée (faible) : skipWaiting est immédiat à l'installation");
test.todo("ANOMALIE confirmée (faible) : aucun handler message pour piloter mise à jour ou purge");
test.todo("RISQUE conditionnel (faible) : aucune politique d'éviction préventive ni surveillance du quota");
test.todo("RISQUE processus (faible) : versionnement manuel de CACHE_NAME");

test("sécurité : le service worker n'utilise pas importScripts", () => {
  assert.doesNotMatch(swSource, /\bimportScripts\s*\(/);
});

test("intégrité : APP_FILES ne contient aucune URL externe ou absolue", () => {
  for (const file of APP_FILES) {
    assert.doesNotMatch(file, /^[a-z][a-z0-9+.-]*:/i, file);
    assert.equal(file.startsWith("/"), false, file);
  }
});

test("intégrité : les SDK externes proviennent tous de www.gstatic.com en HTTPS", () => {
  for (const asset of EXTERNAL_ASSETS) {
    const url = new URL(asset);
    assert.equal(url.protocol, "https:");
    assert.equal(url.origin, "https://www.gstatic.com");
  }
});

/* Clôture ciblée — contrôle indépendant de coordination WAT */
test("clôture : une réponse opaque locale n'est jamais écrite au runtime", async () => {
  for (const mode of ["navigate", "no-cors"]) {
    const url = appUrl("./administration.html");
    const opaque = makeResponse({ status: 0, type: "opaque" });
    const h = createHarness({ fetchImpl: async () => opaque });
    const { promise, pendingWrites } = h.runFetch({ url, method: "GET", mode });
    await promise;
    await Promise.all(pendingWrites);
    await flush();
    assert.equal(h.log.puts.length, 0);
    assert.equal(h.stores.get(CACHE_NAME)?.has(url) ?? false, false);
  }
});

test("clôture : une réponse opaque locale héritée est ignorée et purgée hors ligne", async () => {
  const url = appUrl("./administration.html");
  const h = createHarness({
    initialCaches: { [CACHE_NAME]: { [url]: makeResponse({ status: 0, type: "opaque" }) } },
    fetchImpl: async () => { throw new TypeError("offline"); }
  });
  const result = await h.runFetch({ url, method: "GET", mode: "navigate" }).promise;
  assert.equal(result.status, 503);
  assert.equal(h.stores.get(CACHE_NAME).has(url), false);
});

test("clôture : un SDK opaque autorisé reste utilisable hors ligne", async () => {
  const url = EXTERNAL_ASSETS[0];
  const opaque = makeResponse({ status: 0, type: "opaque" });
  const h = createHarness({ initialCaches: { [CACHE_NAME]: { [url]: opaque } } });
  assert.equal(await h.runFetch({ url, method: "GET", mode: "no-cors" }).promise, opaque);
  assert.equal(h.log.fetch.length, 0);
});

test("clôture : la racine redirigée est normalisée au précache et disponible hors ligne", async () => {
  let offline = false;
  const root = appUrl("./");
  const h = createHarness({ fetchImpl: async url => {
    if (offline) throw new TypeError("offline");
    return url === root ? makeResponse({ body: "accueil", redirected: true,
      url: appUrl("./index.html"), headers: { "Content-Type": "text/html; charset=utf-8" } }) : makeResponse();
  } });
  await h.install();
  offline = true;
  const cached = h.stores.get(CACHE_NAME).get(root);
  assert.equal(cached.redirected, false);
  const result = await h.runFetch({ url: root, method: "GET", mode: "navigate" }).promise;
  assert.equal(result.redirected, false);
  assert.equal(await result.text(), "accueil");
  assert.equal(result.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(h.stores.get(CACHE_NAME).has(root), true);
});

test("clôture : une redirection racine vers une autre destination locale est refusée", async () => {
  for (const destination of ["./administration.html", "./index.html?token=fictif", "./api/private"]) {
    const h = createHarness({ fetchImpl: async url => url === SCOPE ? makeResponse({
      redirected: true, url: appUrl(destination) }) : makeResponse() });
    await assert.rejects(h.install());
    assert.equal(h.log.puts.length, 0);
    assert.equal(h.log.skipWaiting, 0);
  }
});

test("clôture : une redirection d'une ressource autre que la racine est refusée au précache", async () => {
  const h = createHarness({ fetchImpl: async url => url === appUrl("./wat-brand.css") ? makeResponse({
    redirected: true, url: appUrl("./index.html") }) : makeResponse() });
  await assert.rejects(h.install());
  assert.equal(h.log.puts.length, 0);
});

test("clôture : une ancienne redirection autorisée de la racine est normalisée à la lecture", async () => {
  const root = appUrl("./");
  const h = createHarness({ initialCaches: { [CACHE_NAME]: { [root]: makeResponse({
    body: "accueil", redirected: true, url: appUrl("./index.html") }) } },
    fetchImpl: async () => { throw new TypeError("offline"); } });
  const result = await h.runFetch({ url: root, method: "GET", mode: "navigate" }).promise;
  assert.equal(result.redirected, false);
  assert.equal(await result.text(), "accueil");
});
