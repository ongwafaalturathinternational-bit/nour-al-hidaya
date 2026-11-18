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

test("le pointage peut sélectionner un bénévole du Club sans exposer le registre à tous", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="clubVolunteerPicker" hidden/);
  assert.match(html, /id="clubVolunteer"/);
  assert.match(html, /canSelectClubVolunteers=scopes\.includes\("volunteers\.read"\)\|\|scopes\.includes\("volunteers\.manage"\)/);
  assert.match(html, /collection\("volunteers"\)/);
  assert.match(html, /participantType"\)\.value="benevole"/);
});
