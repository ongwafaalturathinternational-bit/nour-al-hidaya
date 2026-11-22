import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("les scripts JavaScript de Nour Al-Hidaya sont syntaxiquement valides", () => {
  const html = readFileSync(new URL("../nour-al-hidaya.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0, "un script applicatif intégré doit être présent");
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source), "script Nour Al-Hidaya n°" + (index + 1));
  });
});

test("le champ prénom ou pseudonyme respecte la limite des règles Firestore", () => {
  const html = readFileSync(new URL("../nour-al-hidaya.html", import.meta.url), "utf8");
  const input = html.match(/<input id="sn"[^>]*>/);
  assert.ok(input, "le champ de profil doit exister");
  assert.match(input[0], /\bmaxlength="120"/);
});
