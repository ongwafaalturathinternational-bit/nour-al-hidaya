import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const init = fs.readFileSync("firebase-init.js", "utf8");

test("les modules opérationnels activent le cache Firestore hors connexion multi-onglets", () => {
  assert.match(init, /db\.enablePersistence\(\{\s*synchronizeTabs:\s*true\s*\}\)/);\n  assert.doesNotMatch(init, /club-khuddam-inscription\.html/);
  assert.match(init, /persistenceReady/);
  assert.match(init, /persistenceEnabled/);
});

test("les écritures en attente sont synchronisées avant l'effacement du cache à la déconnexion", () => {
  assert.match(init, /await db\.waitForPendingWrites\(\)/);
  assert.match(init, /await db\.terminate\(\)/);
  assert.match(init, /await db\.clearPersistence\(\)/);
  assert.match(init, /Reconnectez-vous pour synchroniser les modifications en attente/);
});

test("les écrans Projets, Activités et Club attendent l'initialisation du cache avant lecture", () => {
  for (const file of ["index.html", "activites.html", "projets.html", "club-khuddam.html"]) {
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, /await WATFirebase\.persistenceReady/, file);
    assert.match(html, /WATFirebase\.signOutSafely\(\)/, file);
  }
});

test("le message hors connexion distingue le cache disponible du mode non pris en charge", () => {
  assert.match(init, /données déjà consultées restent disponibles/);
  assert.match(init, /seront synchronisées au retour du réseau/);
  assert.match(init, /cache hors connexion n'est pas disponible/);
});
