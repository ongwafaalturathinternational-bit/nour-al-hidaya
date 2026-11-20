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
