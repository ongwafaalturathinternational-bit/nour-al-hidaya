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
  for (const page of ["./index.html", "./portail.html", "./site-institutionnel.html", "./activites.html", "./projets.html", "./club-khuddam.html", "./club-khuddam-inscription.html", "./club-khuddam-espace.html", "./wat-brand.css"]) {
    assert.ok(worker.includes(JSON.stringify(page)));
  }
  assert.match(worker, /if \(request\.method !== "GET"\) return/);
  assert.match(worker, /if \(url\.origin !== scope\.origin\) return/);
  assert.match(worker, /EXTERNAL_ASSETS\.includes\(url\.href\)/);
  assert.match(worker, /firebase-app-compat\.js/);
  assert.match(worker, /firebase-auth-compat\.js/);
  assert.match(worker, /firebase-firestore-compat\.js/);
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

test("les pages WAT chargent la feuille de style officielle", () => {
  for (const page of ["index.html", "site-institutionnel.html", "nour-al-hidaya.html", "administration.html", "programmes.html", "projets.html", "activites.html", "club-khuddam.html", "club-khuddam-inscription.html", "club-khuddam-espace.html"]) {
    const html = fs.readFileSync(page, "utf8");
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
    const stylesheet = page === "nour-al-hidaya.html" ? "wat-brand-nour.css" : "wat-brand.css";
    assert.ok(head.includes(`href="${stylesheet}"`), page);
  }
  assert.match(worker, /wat-connect-shell-v5/);
});

test("tous les modules métier Firestore utilisent la persistance avant leurs lectures", () => {
  const init = fs.readFileSync("firebase-init.js", "utf8");
  for (const page of ["administration.html", "programmes.html", "activites.html", "projets.html", "club-khuddam.html"]) {
    assert.ok(init.includes(JSON.stringify(page)), page + " doit activer le cache Firestore");
  }
  for (const page of ["administration.html", "programmes.html", "activites.html", "projets.html", "club-khuddam.html"]) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /await WATFirebase\.persistenceReady/, page + " doit attendre l'initialisation du cache");
  }
});

test("la déconnexion des modules membres et programmes passe par le nettoyage sécurisé", () => {
  for (const page of ["administration.html", "programmes.html"]) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /WATFirebase\.signOutSafely\(\)/, page);
    assert.doesNotMatch(html, /WATFirebase\.auth\.signOut\(\)/, page);
  }
});


test("toutes les ressources du précache et des manifestes existent", () => {
  const match = worker.match(/const APP_FILES = \[([\s\S]*?)\];/);
  assert.ok(match, "la liste APP_FILES doit être déclarée");
  const appFiles = JSON.parse(`[${match[1]}]`);
  for (const resource of appFiles) {
    const localPath = resource.replace(/^\.\//, "") || ".";
    assert.ok(fs.existsSync(localPath), "ressource précachée absente : " + resource);
  }

  for (const manifestPath of ["manifest.json", "manifest-nour.json"]) {
    const currentManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const startPath = currentManifest.start_url.replace(/^\.\//, "");
    assert.ok(fs.existsSync(startPath), manifestPath + " : start_url absent");
    for (const icon of currentManifest.icons) {
      const iconPath = icon.src.replace(/^\.\//, "");
      assert.ok(fs.existsSync(iconPath), manifestPath + " : icône absente " + icon.src);
    }
  }
});
