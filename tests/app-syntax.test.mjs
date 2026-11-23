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

test("les zones de réponse et de réflexion respectent la limite des règles Firestore", () => {
  const html = readFileSync(new URL("../nour-al-hidaya.html", import.meta.url), "utf8");
  assert.match(html, /<textarea id="hwt" maxlength="5000"/);
  assert.match(html, /<textarea id="refl" data-a="refl" maxlength="5000"/);
});


test("la session apprenant invalide les chargements Firebase devenus obsolètes", () => {
  const html = readFileSync(new URL("../nour-al-hidaya.html", import.meta.url), "utf8");
  assert.match(html, /let firebaseAuthGeneration=0/);
  assert.match(html, /function isCurrentFirebaseSession\(uid,generation\)/);
  assert.match(html, /async function enterFirebaseUser\(user,generation\)/);
  assert.match(html, /if\(!isCurrentFirebaseSession\(id,generation\)\)return false/);
  assert.match(html, /loadFirebaseProgress\(id,generation\)/);
  assert.match(html, /loadFirebaseLearning\(id,generation\)/);
  assert.match(html, /const generation=\+\+firebaseAuthGeneration/);
  assert.match(html, /if\(!DEMO_MODE\)\{S\.role=null;S\.cur=null;S\.access=null/);
});


test("les candidatures Club Khuddam sont isolées entre sessions", () => {
  const html = readFileSync(new URL("../club-khuddam-inscription.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), "script n°" + (index + 1)));
  assert.match(html, /let currentUser=null,authGeneration=0/);
  assert.match(html, /function isCurrentSession\(user,generation\)/);
  assert.match(html, /function clearPrivateView\(\)/);
  assert.match(html, /checkExisting\(user,generation\)/);
  assert.match(html, /if\(!isCurrentSession\(user,generation\)\)return/);
  assert.match(html, /const actor=currentUser,generation=authGeneration/);
  assert.match(html, /if\(!isCurrentSession\(active,generation\)\)return/);
});


test("les synchronisations hors connexion de Nour Al-Hidaya s'arrêtent au changement de compte", () => {
  const html = readFileSync(new URL("../nour-al-hidaya.html", import.meta.url), "utf8");
  for (const name of ["syncPendingProgress", "syncPendingLearning"]) {
    const start = html.indexOf("async function " + name + "(");
    assert.notEqual(start, -1, name + " doit exister");
    const next = html.indexOf("\nasync function ", start + 1);
    const body = html.slice(start, next < 0 ? html.length : next);
    assert.match(body, /generation=firebaseAuthGeneration/);
    assert.match(body, /isCurrentFirebaseSession\(uid,generation\)/);
    assert.match(body, /isActive:\(\)=>navigator\.onLine&&isCurrentFirebaseSession\(uid,generation\)/);
  }
});
