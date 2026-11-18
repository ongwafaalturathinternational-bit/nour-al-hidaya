import test, { after } from "node:test";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-wat-members",
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") }
});
after(async () => env.cleanup());

async function seedStaff(uid, scopes, active = true) {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "staffAccess", uid), {
      displayName: uid,
      email: uid + "@example.org",
      role: "responsable_administratif",
      active,
      scopes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
}
function record(uid, overrides = {}) {
  return {
    fullName: "Membre Exemple",
    memberType: "membre",
    status: "actif",
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...overrides
  };
}

test("un responsable avec members.manage peut créer et lire une fiche", async () => {
  await seedStaff("manager", ["members.read", "members.manage"]);
  const db = env.authenticatedContext("manager", { email_verified: true }).firestore();
  await assertSucceeds(setDoc(doc(db, "members", "m-001"), record("manager")));
  const snapshot = await assertSucceeds(getDoc(doc(db, "members", "m-001")));
  if (!snapshot.exists()) throw new Error("La fiche créée doit être lisible.");
});

test("un accès members.read autorise la lecture mais pas l'écriture", async () => {
  await seedStaff("reader", ["members.read"]);
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "members", "seeded"), record("system"));
  });
  const db = env.authenticatedContext("reader", { email_verified: true }).firestore();
  await assertSucceeds(getDoc(doc(db, "members", "seeded")));
  await assertFails(setDoc(doc(db, "members", "m-002"), record("reader")));
});

test("un compte sans périmètre ou désactivé n'accède pas à l'annuaire", async () => {
  await seedStaff("no-scope", []);
  await seedStaff("inactive", ["members.read", "members.manage"], false);
  const noScope = env.authenticatedContext("no-scope").firestore();
  const inactive = env.authenticatedContext("inactive").firestore();
  await assertFails(getDoc(doc(noScope, "members", "missing")));
  await assertFails(setDoc(doc(noScope, "members", "m-003"), record("no-scope")));
  await assertFails(getDoc(doc(inactive, "members", "missing")));
});

test("les fiches ne peuvent pas être supprimées et les champs sont validés", async () => {
  await seedStaff("manager-delete", ["members.manage", "members.read"]);
  const db = env.authenticatedContext("manager-delete").firestore();
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "members", "protected"), record("manager-delete"));
  });
  await assertFails(deleteDoc(doc(db, "members", "protected")));
  await assertFails(setDoc(doc(db, "members", "bad"), record("manager-delete", {
    fullName: "x".repeat(121)
  })));
});
