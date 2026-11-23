import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const portal = fs.readFileSync("index.html", "utf8");
const nour = fs.readFileSync("nour-al-hidaya.html", "utf8");
const capacitor = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const build = fs.readFileSync(".github/workflows/android-apk.yml", "utf8");
const prepare = fs.readFileSync("scripts/prepare-capacitor-web.mjs", "utf8");

test("les parcours d’accès Nour traduisent leurs commandes et leurs erreurs", () => {
  const start = nour.search(/Object\.assign\(I18N\.en,\{\r?\n/);
  const end = nour.indexOf("function tx(root)", start);
  assert.ok(start >= 0 && end > start);
  const translations = { en: {}, ar: {}, pat: [] };
  const settings = { set: { lang: "ar" } };
  const translate = vm.runInNewContext(nour.slice(start, end) + "\ntranslated", {
    I18N: translations,
    S: settings
  });
  assert.equal(translate("Se connecter"), "تسجيل الدخول");
  assert.equal(translate("Adresse e-mail ou mot de passe incorrect."), "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
  assert.equal(translate("Adresse e-mail (obligatoire)"), "البريد الإلكتروني (إلزامي)");
  settings.set.lang = "en";
  assert.equal(translate("Retour à WAT Connect"), "Back to WAT Connect");
  settings.set.lang = "fr";
  assert.equal(translate("Mot de passe"), "Mot de passe");
  assert.match(nour, /if\(shouldRender!==false\)render\(\)/);
  assert.match(nour, /aria-current=\\"page\\"/);
});

test("WAT Connect affiche son identité visuelle dans l’en-tête", () => {
  assert.match(portal, /class="wat-logo" src="wat-icon-192\.png"/);
  assert.match(portal, /\.identity \.wat-logo/);
});

test("l’échec de connexion conserve le mot de passe pour permettre une nouvelle tentative", () => {
  assert.match(portal, /let signedIn=false/);
  assert.match(portal, /if\(signedIn\)\$\("password"\)\.value=""/);
  assert.match(portal, /compte existe dans Firebase staging/);
});

test("Nour Al-Hidaya garde un écran de récupération si le rendu échoue", () => {
  assert.match(nour, /function renderContent\(\)/);
  assert.match(nour, /document\.defaultView\?\.NodeFilter\?\.SHOW_TEXT\?\?4/);
  assert.match(nour, /n\.parentElement\?\.closest\?\./);
  assert.match(nour, /function render\(\)\{try\{renderContent\(\)\}catch\(error\)/);
  assert.match(nour, /S\.set\.lang="fr";save\(\)/);
  assert.match(nour, /Réessayer en français/);
  assert.match(nour, /id="render-diagnostic"/);
  assert.match(nour, /diagnostic\.textContent=\("Diagnostic : "\+name\+" — "\+message\)\.slice\(0,180\)/);
  assert.match(nour, /Retour à WAT Connect/);
  assert.match(nour, /href="\.\/index\.html#connexion"/);
});

test("le profil Nour Al-Hidaya regroupe les préférences dans des sections repliables", () => {
  assert.match(nour, /<h2>Mon profil<\/h2>/);
  assert.match(nour, /<details class="card"><summary><b>Messages et règlement<\/b><\/summary>/);
  assert.match(nour, /<details class="card"><summary><b>Préférences et notifications<\/b><\/summary>/);
  assert.match(nour, /<button class="btn ghost full" data-a="logout">Se déconnecter<\/button>/);
});

test("la génération Android produit une véritable icône de lanceur", () => {
  assert.equal(pkg.devDependencies["@capacitor/assets"], "^4.0.0");
  assert.equal(pkg.devDependencies.sharp, "^0.34.5");
  assert.match(prepare, /sharp\(path\.join\(assets, "brand", "wat", "ICONE WC\.png"\)\)\.resize\(1024, 1024/);
  assert.match(build, /npx @capacitor\/assets generate --android/);
  assert.equal(capacitor.appName, "WAT Connect");
});
