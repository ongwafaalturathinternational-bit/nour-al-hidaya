import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

test("le service worker généré sert les SDK embarqués sans accès réseau", async () => {
  const origin = "https://staging.example/";
  const handlers = new Map();
  const entries = new Map();
  const cache = {
    async addAll(files) {
      for (const file of files) {
        const url = new URL(file, origin);
        assert.equal(url.origin, new URL(origin).origin);
        const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
        entries.set(url.href, fs.readFileSync("web-dist/" + name));
      }
    }
  };
  vm.runInNewContext(fs.readFileSync("web-dist/sw.js", "utf8"), {
    URL,
    self: {
      registration: { scope: origin },
      addEventListener: (event, callback) => handlers.set(event, callback),
      skipWaiting() {}
    },
    caches: { open: async () => cache, match: async request => entries.get(request.url) },
    fetch: async () => assert.fail("Requête réseau inattendue")
  });

  let install;
  handlers.get("install")({ waitUntil: promise => { install = promise; } });
  await install;
  for (const sdk of ["app", "auth", "firestore"]) {
    const url = new URL("vendor/firebase-" + sdk + "-compat.js", origin).href;
    let response;
    handlers.get("fetch")({
      request: { method: "GET", url },
      respondWith: promise => { response = promise; }
    });
    assert.ok(Buffer.isBuffer(await response), url);
  }
});
