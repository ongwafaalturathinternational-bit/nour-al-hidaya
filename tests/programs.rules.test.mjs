import test, { after } from "node:test";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-wat-connect",
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") }
});
after(async () => env.cleanup());

async function seed(uid, scopes, active = true) {
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), "staffAccess", uid), {
    displayName: uid, email: uid + "@example.org", role: "responsable_programme",
    active, scopes, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
}
function program(uid, extra = {}) {
  return {
    name: "Nour Al-Hidaya", code: "NOUR-AL-HIDAYA",
    description: "Programme d’apprentissage et d’accompagnement.",
    category: "education", status: "actif",
    createdAt: serverTimestamp(), createdBy: uid,
    updatedAt: serverTimestamp(), updatedBy: uid, ...extra
  };
}

test("programs.manage autorise la création et la lecture", async () => {
  await seed("program-manager", ["programs.read", "programs.manage"]);
  const db = env.authenticatedContext("program-manager").firestore();
  await assertSucceeds(setDoc(doc(db, "programs", "nour"), program("program-manager")));
  await assertSucceeds(getDoc(doc(db, "programs", "nour")));
});

test("programs.read autorise la lecture mais interdit la création", async () => {
  await seed("program-reader", ["programs.read"]);
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), "programs", "seed"), program("system")));
  const db = env.authenticatedContext("program-reader").firestore();
  await assertSucceeds(getDoc(doc(db, "programs", "seed")));
  await assertFails(setDoc(doc(db, "programs", "other"), program("program-reader")));
});

test("un compte sans scope ou inactif ne peut pas lire le catalogue", async () => {
  await seed("program-none", []);
  await seed("program-inactive", ["programs.read", "programs.manage"], false);
  await assertFails(getDoc(doc(env.authenticatedContext("program-none").firestore(), "programs", "x")));
  await assertFails(getDoc(doc(env.authenticatedContext("program-inactive").firestore(), "programs", "x")));
});

test("les programmes ne peuvent pas être supprimés et les données sont validées", async () => {
  await seed("program-owner", ["programs.read", "programs.manage"]);
  const db = env.authenticatedContext("program-owner").firestore();
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), "programs", "keep"), program("program-owner")));
  await assertFails(deleteDoc(doc(db, "programs", "keep")));
  await assertFails(setDoc(doc(db, "programs", "bad"), program("program-owner", { status: "unknown" })));
});
