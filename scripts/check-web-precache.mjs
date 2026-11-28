import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const sdkFiles = ["app", "auth", "firestore"].map(sdk => "vendor/firebase-" + sdk + "-compat.js");
const origin = "https://staging.example/";
const cacheName = /const CACHE_NAME = "([^"]+)";/.exec(fs.readFileSync("web-dist/sw.js", "utf8"))?.[1];

function createHarness() {
  assert.ok(cacheName?.endsWith("-embedded"), "Cache embarqué attendu");
  const handlers = new Map();
  const entries = new Map();
  const names = new Set([cacheName, "wat-connect-shell-v6-embedded", "nour-al-hidaya-shell-v1-embedded", "foreign-cache", "wat-connect-shell-v6-embedded-other"]);
  const fetched = [];
  const attempts = [];
  let online = true;
  const key = request => new URL(typeof request === "string" ? request : request.url, origin).href;
  const cache = {
    async put(request, response) {
      assert.equal(response.status, 200);
      entries.set(key(request), response.clone());
    },
    async match(request) { return entries.get(key(request))?.clone(); },
    async delete(request) { return entries.delete(key(request)); }
  };
  vm.runInNewContext(fs.readFileSync("web-dist/sw.js", "utf8"), {
    URL, Response, Headers,
    self: {
      registration: { scope: origin },
      addEventListener: (event, callback) => handlers.set(event, callback),
      skipWaiting() {}, clients: { claim() {} }
    },
    caches: {
      open: async name => { assert.equal(name, cacheName); return cache; },
      keys: async () => [...names],
      delete: async name => names.delete(name)
    },
    fetch: async request => {
      attempts.push(key(request));
      assert.ok(online, "Requête réseau inattendue hors connexion");
      const url = new URL(key(request));
      assert.equal(url.origin, new URL(origin).origin, "SDK distant interdit dans le paquet embarqué");
      assert.equal(url.search + url.hash, "");
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      assert.ok(name && !name.includes(".."));
      fetched.push(url.href);
      return new Response(fs.readFileSync("web-dist/" + name), { status: 200 });
    }
  });
  async function lifecycle(name) {
    let pending;
    handlers.get(name)({ waitUntil: promise => { pending = promise; } });
    assert.ok(pending);
    await pending;
  }
  async function offlineResponse(file) {
    let response;
    handlers.get("fetch")({ request: { method: "GET", url: new URL(file, origin).href }, respondWith: promise => { response = promise; } });
    assert.ok(response, file);
    return response;
  }
  return { entries, names, fetched, attempts, lifecycle, offlineResponse, goOffline: () => { online = false; } };
}

test("le service worker généré sert les SDK embarqués sans accès réseau", async () => {
  const h = createHarness();
  await h.lifecycle("install");
  assert.deepEqual(h.attempts, h.fetched, "Aucune tentative réseau non autorisée");
  const installationAttempts = h.attempts.length;
  h.goOffline();
  for (const name of ["manifest.json", "manifest-nour.json"]) {
    const manifestUrl = new URL(name, origin);
    const cachedManifest = h.entries.get(manifestUrl.href);
    assert.ok(cachedManifest, name);
    const manifest = await cachedManifest.clone().json();
    assert.ok(manifest.start_url, name);
    assert.ok(manifest.icons?.length > 0, name);
    for (const resource of [manifest.start_url, ...manifest.icons.map(icon => icon.src)]) {
      const url = new URL(resource, manifestUrl);
      assert.ok(h.entries.has(url.href), name + ": " + resource);
    }
  }
  for (const file of sdkFiles) {
    assert.ok(h.fetched.includes(new URL(file, origin).href), file);
    const response = await h.offlineResponse(file);
    assert.equal(response.status, 200, file);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), fs.readFileSync("web-dist/" + file), file);
  }
  assert.equal(h.attempts.length, installationAttempts, "Aucune tentative réseau hors connexion");
});

test("la migration embarquée supprime les anciens caches WAT mais préserve les caches étrangers", async () => {
  const h = createHarness();
  await h.lifecycle("activate");
  assert.deepEqual([...h.names].sort(), [cacheName, "foreign-cache", "wat-connect-shell-v6-embedded-other"].sort());
});

test("les pages Firebase du paquet chargent les trois SDK du précache", () => {
  const expected = sdkFiles.map(file => "./" + file);
  let checked = 0;
  for (const page of fs.readdirSync("web-dist").filter(file => file.endsWith(".html"))) {
    const html = fs.readFileSync("web-dist/" + page, "utf8");
    const sources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map(match => match[1]);
    const sdkSources = sources.filter(source => /firebase-(app|auth|firestore)-compat\.js(?:[?#].*)?$/.test(source));
    if (!sources.some(source => /(?:^|\/)firebase-init\.js(?:[?#].*)?$/.test(source)) && sdkSources.length === 0) continue;
    assert.deepEqual(sdkSources, expected, page);
    checked++;
  }
  assert.ok(checked > 0, "Aucune page Firebase vérifiée");
});
