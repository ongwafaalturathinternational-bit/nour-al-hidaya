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
  assert.match(html, /canSelectClubVolunteers=canAttendanceManage&&\(scopes\.includes\("volunteers\.read"\)\|\|scopes\.includes\("volunteers\.manage"\)\)/);
  assert.match(html, /collection\("volunteers"\)/);
  assert.match(html, /participantType"\)\.value="benevole"/);
});

test("le module conserve un historique nominatif des présences par activité", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /x\.participantLabel\|\|"Participant"/);
  assert.match(html, /labels\[x\.status\]/);
  assert.match(html, /where\("activityId","==",id\)/);
});


test("le tableau de bord des activités calcule les indicateurs depuis Firestore", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  for (const id of ["statActivities", "statScheduled", "statDone", "statCancelled"]) assert.ok(html.includes('id="' + id + '"'));
  assert.match(html, /activities\.filter\(a=>a\.status==="planifiee"\)/);
  assert.match(html, /activities\.filter\(a=>a\.status==="realisee"\)/);
});


test("le registre des activités permet un filtre de statut combiné à la recherche", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="statusFilter"/);
  assert.match(html, /!\$\("statusFilter"\)\.value\|\|a\.status===\$\("statusFilter"\)\.value/);
  assert.match(html, /statusFilter"\)\.addEventListener\("change",render/);
});
