import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("sw.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

test("WAT Connect déclare un manifeste installable", () => {
  assert.equal(manifest.name, "WAT Connect — ONG Wafa Al-Turath");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some(icon => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512"));
});

test("le portail enregistre le service worker", () => {
  assert.match(index, /navigator\.serviceWorker\.register\("\.\/sw\.js"\)/);
});

test("le shell précache les modules publics et exclut les données privées", () => {
  for (const page of ["./index.html", "./activites.html", "./projets.html", "./club-khuddam.html"]) {
    assert.ok(worker.includes(JSON.stringify(page)));
  }
  assert.match(worker, /if \(request\.method !== "GET"\) return/);
  assert.match(worker, /if \(url\.origin !== scope\.origin\) return/);
  assert.doesNotMatch(worker, /collection\(["'](users|staffAccess|volunteers|attendance)["']\)/);
});

test("les pages Firebase signalent clairement une perte de connexion", () => {
  const init = fs.readFileSync("firebase-init.js", "utf8");
  assert.match(init, /wat-network-notice/);
  assert.match(init, /addEventListener\("offline"/);
  assert.match(init, /addEventListener\("online"/);
  assert.match(init, /données déjà consultées restent disponibles/);
  assert.match(init, /cache hors connexion n'est pas disponible/);
  assert.match(init, /persistenceStatus === "unavailable"/);
});
