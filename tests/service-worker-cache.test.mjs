import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

test("le service worker ne met en cache que des ressources statiques explicitement listées", () => {
  const match = sw.match(/const APP_FILES = \[([\s\S]*?)\];/);
  assert.ok(match, "liste APP_FILES présente");
  const files = [...match[1].matchAll(/"([^"]+)"/g)].map(([, value]) => value);
  assert.ok(files.includes("./index.html"));
  assert.ok(files.includes("./firebase-init.js"));
  assert.ok(files.every(file => file.startsWith("./") && !file.includes("?")));
  assert.doesNotMatch(match[1], /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/);
});

test("seuls les trois SDK Firebase versionnés sont admis dans le cache externe", () => {
  const match = sw.match(/const EXTERNAL_ASSETS = \[([\s\S]*?)\];/);
  assert.ok(match, "liste EXTERNAL_ASSETS présente");
  const assets = [...match[1].matchAll(/"([^"]+)"/g)].map(([, value]) => value);
  assert.deepEqual(assets, [
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-compat.js"
  ]);
  assert.doesNotMatch(match[1], /identitytoolkit|firestore\.googleapis|securetoken|\/v1\/|\/v2\//);
});

test("les requêtes autres que GET ne passent jamais dans le cache du service worker", () => {
  assert.match(sw, /if \(request\.method !== "GET"\) return;/);
});

test("les requêtes métier et API non listées ne sont pas interceptées comme ressources locales", () => {
  assert.match(sw, /if \(url\.origin !== scope\.origin\) return;/);
  const allowlistGuard = sw.indexOf("if (!appUrls.has(url.href)) return;");
  const navigationHandler = sw.indexOf('if (request.mode === "navigate")');
  assert.ok(allowlistGuard >= 0 && allowlistGuard < navigationHandler,
    "la liste blanche doit être vérifiée avant tout fallback de navigation");
  assert.doesNotMatch(sw, /caches\.put\(request,\s*response\)/);
});

test("une navigation précachée reste disponible quand le serveur renvoie 503", async () => {
  const origin = "https://staging.example/";
  const handlers = new Map();
  const cached = { status: 200 };
  let response = { status: 503, ok: false };
  let cachedResponse = cached;
  vm.runInNewContext(sw, {
    URL,
    self: { registration: { scope: origin }, addEventListener: (name, fn) => handlers.set(name, fn) },
    caches: { match: async () => cachedResponse },
    fetch: async () => response
  });
  function navigate() {
    let result;
    handlers.get("fetch")({
      request: { url: origin + "nour-al-hidaya.html", method: "GET", mode: "navigate" },
      respondWith: promise => { result = promise; }
    });
    return result;
  }
  assert.equal(await navigate(), cached);
  cachedResponse = undefined;
  assert.equal(await navigate(), response);
  cachedResponse = cached;
  response = { status: 404, ok: false };
  assert.equal(await navigate(), response);
});
