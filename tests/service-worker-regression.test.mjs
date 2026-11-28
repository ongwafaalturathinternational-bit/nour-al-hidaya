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
 * non-régression attendus. Les anomalies et risques connus sont documentés
 * séparément en fin de fichier avec test.todo : ils ne sont volontairement
 * pas transformés en exigences permanentes.
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

function makeResponse({ status = 200, type = "basic", body = "" } = {}) {
  return {
    status,
    type,
    body,
    ok: status >= 200 && status < 300,
    clone() {
      return makeResponse({ status, type, body });
    }
  };
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
function createHarness({ initialCaches = {}, fetchImpl } = {}) {
  const handlers = new Map();
  const stores = new Map();
  const log = {
    opened: [],
    puts: [],
    putRejections: [],
    deletes: [],
    addAll: [],
    skipWaiting: 0,
    claim: 0,
    fetch: []
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
      log.puts.push({
        cache: this.name,
        key: keyOf(request),
        status: response.status,
        type: response.type
      });
      storeFor(this.name).set(keyOf(request), response);
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
      return new CacheMock(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      log.deletes.push(name);
      return stores.delete(name);
    },
    async match(request) {
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

  const context = vm.createContext({ URL, self, caches, fetch: callFetch, console });
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
    emit("fetch", {
      request,
      respondWith: value => {
        responded = true;
        promise = value;
      }
    });
    return { responded, promise };
  };

  return { handlers, stores, log, context, install, activate, runFetch, cacheStorage: caches };
}

/* ------------------------------------------------------------------ */
/* Installation                                                        */
/* ------------------------------------------------------------------ */

test("installation : précache exactement les fichiers applicatifs autorisés", async () => {
  const harness = createHarness();
  await harness.install();
  const precached = harness.log.addAll.flat();
  assert.deepEqual([...new Set(precached)].sort(), [...APP_FILES].sort());
  const store = harness.stores.get(CACHE_NAME);
  assert.ok(store, "le cache de l'application est créé pendant l'installation");
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
  assert.equal(harness.log.puts.length, 0);
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

test("navigation : une panne réseau sans cache est prise en charge par respondWith", () => {
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
  assert.ok(promise instanceof Promise);
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
  assert.equal(store ? store.size : 0, 0, "aucune entrée partielle après échec de addAll");
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
/* Anomalies et limites documentées                                    */
/*                                                                     */
/* Ces entrées sont volontairement des test.todo : elles documentent   */
/* des comportements observés ou des risques conditionnels sans les    */
/* transformer en exigences de non-régression. Les autres tests        */
/* exécutables du fichier couvrent les invariants de sécurité attendus. */
/* ------------------------------------------------------------------ */

test.todo("ANOMALIE confirmée (faible) : le SW tente de mettre en cache une réponse 206 ; Cache.put la refuse, mais le rejet n'est pas géré");
test.todo("ANOMALIE conditionnelle (moyenne) : caches.match global peut servir une entrée d'un autre cache de la même origine");
test.todo("ANOMALIE conditionnelle (moyenne) : hors connexion, une navigation peut utiliser la copie d'un autre cache");
test.todo("ANOMALIE conditionnelle (faible) : l'activation supprime tout cache partageant le préfixe wat-connect-");
test.todo("ANOMALIE confirmée (faible) : une ressource statique en cache n'est jamais revalidée avant expiration du cache");
test.todo("ANOMALIE confirmée (faible) : sans aucun cache, la navigation hors ligne ne renvoie pas de Response explicite");
test.todo("RISQUE conditionnel (moyenne) : les SDK opaques sont mis en cache sans SRI ni vérification de contenu");
test.todo("RISQUE conditionnel (faible) : administration.html et club-khuddam-espace.html sont précachés sans vérification de contenu");
test.todo("RISQUE conditionnel (faible) : aucune vérification Authorization/Vary avant mise en cache");
test.todo("ANOMALIE confirmée (faible) : cache.put n'est pas attendu dans les handlers fetch");
test.todo("ANOMALIE confirmée (faible) : skipWaiting est immédiat à l'installation");
test.todo("ANOMALIE confirmée (faible) : l'activation est tout-ou-rien si une suppression de cache échoue");
test.todo("ANOMALIE confirmée (faible) : aucun handler message pour piloter mise à jour ou purge");
test.todo("RISQUE conditionnel (faible) : quota/éviction non gérés");
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
