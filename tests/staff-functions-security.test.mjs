import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../functions/index.js", import.meta.url), "utf8");

test("toutes les fonctions callable exigent App Check", () => {
  const declarations = [...source.matchAll(/exports\.(\w+)\s*=\s*onCall\((\{[^}]+\})/g)];
  assert.equal(declarations.length, 4);
  for (const [, name, options] of declarations) {
    assert.match(options, /enforceAppCheck:\s*true/, name + " doit exiger App Check");
  }
});

test("les opérations sensibles revalident le compte administrateur côté Admin SDK", () => {
  assert.match(source, /async function requireWatAdmin\(request\)/);
  assert.match(source, /await auth\.getUser\(request\.auth\.uid\)/);
  assert.match(source, /user\.disabled/);
  assert.match(source, /user\.emailVerified !== true/);
  assert.match(source, /user\.customClaims\?\.watAdmin !== true/);
  assert.match(source, /await requireWatAdmin\(request\)/);
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

test("la modification des rôles et permissions exige l'administration centrale et valide chaque scope", () => {
  assert.match(source, /exports\.updateStaffAccountAccess = onCall/);
  assert.match(source, /validateStaffPermissions\(request\.data\?\.role, request\.data\?\.scopes\)/);
  assert.match(source, /updatedBy: actorUid/);
  assert.match(source, /updatedAt: FieldValue\.serverTimestamp\(\)/);
});

test("la validation des e-mails accepte les adresses normales et rejette les formats invalides", () => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.equal(emailPattern.test("equipe@wafa-al-turath.org"), true);
  assert.equal(emailPattern.test("nom avec espace@example.org"), false);
  assert.equal(emailPattern.test("adresse-incomplete"), false);
  assert.ok(source.includes("/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/"));
});

test("un administrateur ne peut pas modifier ses propres permissions par cette fonction", () => {
  assert.match(source, /uid === actorUid/);
  assert.match(source, /modification de son propre compte interdite/);
  assert.match(source, /requireWatAdmin\(request\)/);
  assert.match(source, /if \(!snap\.exists\)/);
  assert.match(source, /auth\.getUser\(uid\)/);
});

test("le registre limite les appels simultanés à Firebase Authentication", () => {
  assert.match(source, /const batchSize = 25/);
  assert.match(source, /snapshot\.docs\.slice\(offset, offset \+ batchSize\)/);
  assert.match(source, /accounts\.push\(\.\.\.batch\)/);
});

test("les fonctions institutionnelles financières et de formation islamique sont autorisées sans supprimer le commissaire aux comptes", () => {
  for (const role of [
    '"controleur_financier"',
    '"commissaire_aux_comptes"',
    '"responsable_formation_islamique_orientations"'
  ]) assert.ok(source.includes(role), "rôle autorisé manquant : " + role);
});
