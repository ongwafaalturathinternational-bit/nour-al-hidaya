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
  assert.ok(files.includes("./assets/brand/wat/WC copie.png"));
  assert.ok(files.includes("./assets/brand/wat/ICONE WC.png"));
  assert.ok(files.includes("./assets/brand/nour/logo nour alhidaya.png"));
  assert.ok(files.includes("./assets/brand/nour/ICONE NOUR ALHIDAYA.png"));
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
  assert.match(sw, /if \(!appUrls\.has\(url\.href\)\) return;/);
  assert.doesNotMatch(sw, /caches\.put\(request,\s*response\)/);
});


test("le build Android copie les logos officiels dans web-dist", () => {
  const build = readFileSync(new URL("../scripts/prepare-capacitor-web.mjs", import.meta.url), "utf8");
  assert.match(build, /fs\.cp\(path\.join\(root, "assets", "brand"\), path\.join\(output, "assets", "brand"\), \{ recursive: true \}\)/);
});
