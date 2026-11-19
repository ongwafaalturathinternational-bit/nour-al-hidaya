import test, { after } from "node:test";
import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";

const projectId = "demo-wat-connect-core";
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: fs.readFileSync("firestore.rules", "utf8")
  }
});

after(async () => {
  await testEnv.cleanup();
});

test("registre staffAccess : lecture limitée au titulaire", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "staffAccess/alice"), {
      displayName: "Alice Test",
      email: "alice@example.org",
      role: "formateur",
      active: true,
      scopes: ["nour-al-hidaya:p1"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  const aliceDb = testEnv.authenticatedContext("alice", {
    email: "alice@example.org",
    email_verified: true
  }).firestore();

  const bobDb = testEnv.authenticatedContext("bob", {
    email: "bob@example.org",
    email_verified: true
  }).firestore();

  await assertSucceeds(getDoc(doc(aliceDb, "staffAccess/alice")));
  await assertFails(getDoc(doc(aliceDb, "staffAccess/bob")));
  await assertFails(getDoc(doc(bobDb, "staffAccess/alice")));
});

test("aucun membre ne peut s'attribuer ou modifier un rôle", async () => {
  const aliceDb = testEnv.authenticatedContext("alice", {
    email: "alice@example.org",
    email_verified: true
  }).firestore();

  await assertFails(setDoc(doc(aliceDb, "staffAccess/alice"), {
    displayName: "Alice",
    email: "alice@example.org",
    role: "president",
    active: true,
    scopes: ["organisation:administration"]
  }));

  await assertFails(deleteDoc(doc(aliceDb, "staffAccess/alice")));
});

test("la collection staffAccess ne peut pas être listée", async () => {
  const aliceDb = testEnv.authenticatedContext("alice", {
    email: "alice@example.org",
    email_verified: true
  }).firestore();

  const { getDocs, collection } = await import("firebase/firestore");
  await assertFails(getDocs(collection(aliceDb, "staffAccess")));
});

test("les collections métier non ouvertes restent refusées", async () => {
  const aliceDb = testEnv.authenticatedContext("alice", {
    email: "alice@example.org",
    email_verified: true
  }).firestore();

  await assertFails(getDoc(doc(aliceDb, "beneficiaries/case-001")));
  await assertFails(getDoc(doc(aliceDb, "financeEntries/entry-001")));
  await assertFails(getDoc(doc(aliceDb, "attendance/session-001")));
});

test("un membre d'équipe non vérifié ne peut pas accéder aux données métier", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "staffAccess/unverified-staff"), {
      displayName: "Compte non vérifié",
      email: "unverified@example.org",
      role: "formateur",
      active: true,
      scopes: ["programs.read"],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  const db = testEnv.authenticatedContext("unverified-staff", {
    email: "unverified@example.org",
    email_verified: false
  }).firestore();

  await assertFails(getDoc(doc(db, "programs", "private-program")));
});
