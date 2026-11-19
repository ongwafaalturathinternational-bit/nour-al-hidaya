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
    'Transmettre le savoir',
    'Agir avec solidarité',
    'Mobiliser les compétences',
    'club-khuddam-inscription.html',
    'id="loginForm"',
    'id="workspace"'
  ]) assert.ok(html.includes(fragment), "élément de vitrine absent : " + fragment);
});

test("la vitrine conserve une navigation accessible et respecte les préférences de mouvement réduit", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<nav[^>]+aria-label="Navigation principale"/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /name="description"/);
  assert.match(html, /property="og:title"/);
});

test("un compte non vérifié reçoit un lien de confirmation avant toute déconnexion", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /if\\(!user\\.emailVerified\\)\\{let verificationSent=false/);
  assert.match(html, /await user\\.sendEmailVerification\\(\\)/);
  assert.match(html, /Un lien de confirmation vient d’être envoyé/);
  assert.match(html, /await WATFirebase\\.auth\\.signOut\\(\\)/);
});
