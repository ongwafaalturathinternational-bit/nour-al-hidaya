import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("les scripts JavaScript du portail WAT Connect sont syntaxiquement valides", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0, "un script du portail doit être présent");
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source), "script WAT Connect n°" + (index + 1));
  });
});


test("la vitrine publique présente les missions, programmes et appels à participation", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const fragment of [
    'id="engagements"',
    'id="programmes"',
    'id="connexion"',
    'Nour Al-Hidaya',
    'Club Khuddam Al-Turath',
    'Éduquer',
    'Servir',
    'Préserver',
    'club-khuddam-inscription.html',
    'id="loginForm"',
    'id="workspace"',
    'site-institutionnel.html',
    'Éduquer · Servir · Préserver',
    'Il n’existe pas d’inscription libre au portail interne.'
  ]) assert.ok(html.includes(fragment), "élément de vitrine absent : " + fragment);
});

test("la vitrine conserve une navigation accessible et respecte les préférences de mouvement réduit", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<nav[^>]+aria-label="Navigation principale"/);
  assert.ok(html.includes("@media(prefers-reduced-motion:reduce)"));
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
});

test("les scripts de l'espace candidat sont syntaxiquement valides et isolés", () => {
  const html = readFileSync(new URL("../club-khuddam-espace.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), "script espace candidat n°" + (index + 1)));
  assert.match(html, /collection\("volunteerApplications"\)/);
  assert.match(html, /doc\(user\.uid\)/);
});

test("les pages opérationnelles ne référencent pas d'identifiants DOM inexistants", () => {
  for (const file of [
    "index.html",
    "club-khuddam-inscription.html",
    "club-khuddam-espace.html",
    "club-khuddam.html",
    "administration.html",
    "projets.html",
    "activites.html"
  ]) {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
    const lookups = [...html.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]);
    const missing = [...new Set(lookups.filter(id => !ids.has(id)))];
    assert.deepEqual(missing, [], file + " référence des identifiants DOM absents");
  }
});


test("la candidature actualise les informations et le jeton de vérification avant l'envoi", () => {
  const html = readFileSync(new URL("../club-khuddam-inscription.html", import.meta.url), "utf8");
  assert.match(html, /await currentUser\.reload\(\)/);
  assert.match(html, /await currentUser\.getIdToken\(true\)/);
  assert.match(html, /currentUser\.emailVerified/);
  assert.match(html, /permission-denied/);
  assert.match(html, /club-khuddam-espace\.html/);
});

test("le site institutionnel est une page publique distincte et reprend les trois axes officiels", () => {
  const html = readFileSync(new URL("../site-institutionnel.html", import.meta.url), "utf8");
  for (const fragment of ["ONG Wafa Al-Turath", "Éduquer", "Servir", "Préserver", "Nour Al-Hidaya", "Club Khuddam Al-Turath", 'href="index.html"']) {
    assert.ok(html.includes(fragment), "élément du site institutionnel absent : " + fragment);
  }
  assert.match(html, /<a class="skip-link" href="#main">/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /prefers-reduced-motion:\\s*reduce/);
  assert.match(html, /name="theme-color" content="#103047"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
});

test("le portail public propose un seul point d'entrée principal vers le Club", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const publicArea = html.slice(html.indexOf('<div id="public">'), html.indexOf('<section id="workspace"'));
  const entries = publicArea.match(/href="club-khuddam-inscription\.html"/g) || [];
  assert.equal(entries.length, 1);
});

test("Nour Al-Hidaya offre toujours un retour au portail après navigation ou déconnexion", () => {
  const html = readFileSync(new URL("../nour-al-hidaya.html", import.meta.url), "utf8");
  assert.match(html, /class="portal-link" href="index\.html"/);
  assert.match(html, /location\.assign\("index\.html"\)/);
});
