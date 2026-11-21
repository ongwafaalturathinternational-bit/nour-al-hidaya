import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../club-khuddam-espace.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
  .map(([, , source]) => source)
  .filter(source => source.trim());

test("l'espace candidat contient un script JavaScript syntaxiquement valide", () => {
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0]));
});

test("un changement de session invalide les chargements asynchrones du dossier candidat", () => {
  assert.match(html, /let currentUser = null, authGeneration = 0/);
  assert.match(html, /function isCurrentSession\(user,generation\)/);
  assert.match(html, /authGeneration \+= 1/);
  assert.match(html, /WATFirebase\.auth\.currentUser\?\.uid !== user\.uid/);
  assert.ok((html.match(/if\(!isCurrentSession\(user,generation\)\)return;/g) || []).length >= 2);
  assert.match(html, /\$\("details"\)\.textContent = ""/);
});

test("le dossier candidat n'est lu qu'après renouvellement du jeton et revalidation de session", () => {
  const tokenRefresh = html.indexOf("await user.getIdToken(true)");
  const documentRead = html.indexOf('WATFirebase.db.collection("volunteerApplications").doc(user.uid)');
  assert.ok(tokenRefresh >= 0 && documentRead > tokenRefresh);
  assert.ok(html.indexOf("if(!isCurrentSession(user,generation))return;", tokenRefresh) < documentRead);
  assert.ok(html.indexOf("if(!isCurrentSession(user,generation))return;", documentRead) > documentRead);
});
