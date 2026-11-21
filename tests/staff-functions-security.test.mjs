import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");

test("toutes les fonctions callable exigent App Check", () => {
  const declarations = [...source.matchAll(/exports\.(\w+)\s*=\s*onCall\((\{[^}]+\})/g)];
  assert.equal(declarations.length, 3);
  for (const [, name, options] of declarations) {
    assert.match(options, /enforceAppCheck:\s*true/, name + " doit exiger App Check");
  }
});

test("les opérations sensibles exigent une session vérifiée et le claim watAdmin", () => {
  assert.match(source, /request\.auth\.token\.email_verified !== true/);
  assert.match(source, /request\.auth\.token\.watAdmin !== true/);
  assert.match(source, /function requireWatAdmin\(request\)/);
  assert.match(source, /requireWatAdmin\(request\)/);
});

test("un nouveau compte d'équipe est créé inactif et ses permissions sont en liste autorisée", () => {
  assert.match(source, /const ALLOWED_ROLES = new Set\(/);
  assert.match(source, /const ALLOWED_SCOPES = new Set\(/);
  assert.match(source, /scopes\.some\(scope => typeof scope !== "string" \|\| !ALLOWED_SCOPES\.has\(scope\)\)/);
  assert.match(source, /active: false/);
  assert.match(source, /emailVerified: false/);
});

test("l'activation exige la vérification de l'adresse et la suspension désactive le compte Auth", () => {
  assert.match(source, /if \(active && user\.emailVerified !== true\)/);
  assert.match(source, /auth\.updateUser\(uid, \{ disabled: !active \}\)/);
  assert.match(source, /const previousActive = snap\.data\(\)\.active === true/);
  assert.match(source, /ref\.update\(\{\s*active,/);
  assert.ok(source.indexOf("await ref.update({\n    active,") < source.indexOf("await auth.updateUser(uid, { disabled: !active })"),
    "Firestore doit fermer ou ouvrir le périmètre avant la synchronisation Auth");
});

test("le registre renvoie uniquement les champs d'administration nécessaires", () => {
  assert.match(source, /exports\.listStaffAccounts = onCall/);
  assert.match(source, /db\.collection\("staffAccess"\)\.limit\(500\)/);
  assert.match(source, /emailVerified: user\?\.emailVerified === true/);
  assert.doesNotMatch(source, /passwordHash|passwordSalt/);
});

test("le bootstrap administrateur est strictement limité au staging et refuse un compte désactivé", () => {
  const bootstrap = readFileSync(new URL("../scripts/bootstrap-wat-admin.js", import.meta.url), "utf8");
  assert.match(bootstrap, /projectId !== "wat-connect-staging"/);
  assert.match(bootstrap, /expectedEmail = "ongwafaalturathinternational@gmail.com"/);
  assert.match(bootstrap, /user\.disabled === true/);
  assert.match(bootstrap, /user\.emailVerified !== true/);
  assert.match(bootstrap, /setCustomUserClaims\(uid, \{ \.\.\.\(user\.customClaims \|\| \{\}\), watAdmin: true \}\)/);
});
