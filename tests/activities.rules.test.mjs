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
    displayName: uid, email: uid + "@example.org", role: "coordonnateur",
    active, scopes, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
}
function activity(uid, extra = {}) {
  return {
    title: "Distribution Ramadan", description: "Distribution de colis alimentaires.",
    category: "humanitaire", activityDate: "2026-12-10", location: "Èkpè",
    status: "planifiee", createdAt: serverTimestamp(), createdBy: uid,
    updatedAt: serverTimestamp(), updatedBy: uid, ...extra
  };
}
function attendance(uid, extra = {}) {
  return {
    activityId: "a", participantRef: "MEM-001", participantLabel: "Participant test",
    participantType: "benevole", status: "present",
    recordedAt: serverTimestamp(), recordedBy: uid,
    updatedAt: serverTimestamp(), updatedBy: uid, ...extra
  };
}

test("activities.manage autorise création et lecture d'activité", async () => {
  await seed("activity-manager", ["activities.read", "activities.manage"]);
  const db = env.authenticatedContext("activity-manager").firestore();
  await assertSucceeds(setDoc(doc(db, "activities", "ramadan"), activity("activity-manager")));
  await assertSucceeds(getDoc(doc(db, "activities", "ramadan")));
});

test("activities.read permet la lecture mais pas la création", async () => {
  await seed("activity-reader", ["activities.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "activities", "seed"), activity("system")));
  const db = env.authenticatedContext("activity-reader").firestore();
  await assertSucceeds(getDoc(doc(db, "activities", "seed")));
  await assertFails(setDoc(doc(db, "activities", "new"), activity("activity-reader")));
});

test("les droits activités ne donnent pas accès aux présences", async () => {
  await seed("activity-only", ["activities.read", "activities.manage"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "activities", "a"), activity("system"));
    await setDoc(doc(c.firestore(), "attendance", "activity-only-p1"), attendance("system"));
  });
  const db = env.authenticatedContext("activity-only").firestore();
  await assertFails(getDoc(doc(db, "attendance", "activity-only-p1")));
  await assertFails(setDoc(doc(db, "attendance", "p2"), attendance("activity-only")));
});

test("attendance.manage autorise la présence, lecture dédiée et aucune suppression", async () => {
  await seed("attendance-manager", ["activities.read", "attendance.read", "attendance.manage"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "activities", "a"), activity("system")));
  const db = env.authenticatedContext("attendance-manager").firestore();
  const ref = doc(db, "attendance", "p1");
  await assertSucceeds(setDoc(ref, attendance("attendance-manager")));
  await assertSucceeds(getDoc(ref));
  await assertFails(deleteDoc(ref));
});

test("un compte inactif ou sans scope ne peut pas lire les activités", async () => {
  await seed("activity-none", []);
  await seed("activity-inactive", ["activities.read", "activities.manage"], false);
  await assertFails(getDoc(doc(env.authenticatedContext("activity-none").firestore(), "activities", "x")));
  await assertFails(getDoc(doc(env.authenticatedContext("activity-inactive").firestore(), "activities", "x")));
});

test("les activités refusent les statuts invalides et la suppression", async () => {
  await seed("activity-owner", ["activities.read", "activities.manage"]);
  const db = env.authenticatedContext("activity-owner").firestore();
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "activities", "keep"), activity("activity-owner")));
  await assertFails(deleteDoc(doc(db, "activities", "keep")));
  await assertFails(setDoc(doc(db, "activities", "bad"), activity("activity-owner", { status: "inconnue" })));
});
