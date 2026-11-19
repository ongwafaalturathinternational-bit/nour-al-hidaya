import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("le module des activités contient un JavaScript valide", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), "script activités n°" + (index + 1)));
});

test("la feuille de présence utilise le registre central lié à l'activité", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /collection\("attendance"\)\.where\("activityId","==",id\)/);
  assert.match(html, /collection\("attendance"\)\.add\(data\)/);
  assert.doesNotMatch(html, /collection\("activities"\)\.doc\(id\)\.collection\("attendance"\)/);
});
