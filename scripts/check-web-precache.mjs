import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const sdkFiles = ["app", "auth", "firestore"].map(sdk => "vendor/firebase-" + sdk + "-compat.js");

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
  for (const name of ["manifest.json", "manifest-nour.json"]) {
    const manifestUrl = new URL(name, origin);
    const cachedManifest = entries.get(manifestUrl.href);
    assert.ok(cachedManifest, name);
    const manifest = JSON.parse(cachedManifest.toString("utf8"));
    assert.ok(manifest.start_url, name);
    assert.ok(manifest.icons?.length > 0, name);
    for (const resource of [manifest.start_url, ...manifest.icons.map(icon => icon.src)]) {
      const url = new URL(resource, manifestUrl);
      assert.ok(entries.has(url.href), name + ": " + resource);
    }
  }

  for (const file of sdkFiles) {
    const url = new URL(file, origin).href;
    let response;
    handlers.get("fetch")({
      request: { method: "GET", url },
      respondWith: promise => { response = promise; }
    });
    assert.ok(Buffer.isBuffer(await response), url);
  }
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
