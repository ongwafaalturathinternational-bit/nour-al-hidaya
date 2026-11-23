import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const portal = fs.readFileSync("index.html", "utf8");
const nour = fs.readFileSync("nour-al-hidaya.html", "utf8");
const capacitor = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const build = fs.readFileSync(".github/workflows/android-apk.yml", "utf8");
const prepare = fs.readFileSync("scripts/prepare-capacitor-web.mjs", "utf8");

test("WAT Connect affiche son identité visuelle dans l’en-tête", () => {
  assert.match(portal, /class="wat-logo" src="icon-192\.png"/);
  assert.match(portal, /\.identity \.wat-logo/);
});

test("l’échec de connexion conserve le mot de passe pour permettre une nouvelle tentative", () => {
  assert.match(portal, /let signedIn=false/);
  assert.match(portal, /if\(signedIn\)\$\("password"\)\.value=""/);
  assert.match(portal, /compte existe dans Firebase staging/);
});

test("Nour Al-Hidaya garde un écran de récupération si le rendu échoue", () => {
  assert.match(nour, /function renderContent\(\)/);
  assert.match(nour, /function render\(\)\{try\{renderContent\(\)\}catch\(error\)/);
  assert.match(nour, /Réessayer en français/);
  assert.match(nour, /Retour à WAT Connect/);
  assert.match(nour, /href="\.\/index\.html#connexion"/);
});

test("la génération Android produit une véritable icône de lanceur", () => {
  assert.equal(pkg.devDependencies["@capacitor/assets"], "^4.0.0");
  assert.equal(pkg.devDependencies.sharp, "^0.34.5");
  assert.match(prepare, /sharp\(path\.join\(root, "icon-512\.png"\)\)\.resize\(1024, 1024/);
  assert.match(build, /npx @capacitor\/assets generate --android/);
  assert.equal(capacitor.appName, "WAT Connect");
});
