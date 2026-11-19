import test, { after } from "node:test";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-wat-connect-projects-volunteers",
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") }
});
after(async () => env.cleanup());

async function seed(uid, scopes, active = true) {
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "staffAccess", uid), {
    displayName: uid, email: uid + "@example.org", role: "coordonnateur",
    active, scopes, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
}
function project(uid, extra = {}) {
  return { name: "Campagne Ramadan", code: "RAM-2027", description: "Préparation et réalisation des actions Ramadan.",
    status: "planifie", startDate: "2027-02-01", endDate: "2027-03-31",
    createdAt: serverTimestamp(), createdBy: uid, updatedAt: serverTimestamp(), updatedBy: uid, ...extra };
}
function volunteer(uid, extra = {}) {
  return { fullName: "Benevole Test", email: "test@example.org", phone: "+22900000000",
    category: "engage", skills: ["organisation", "logistique"], interests: ["humanitaire"],
    availability: "Week-ends", status: "actif", createdAt: serverTimestamp(), createdBy: uid,
    updatedAt: serverTimestamp(), updatedBy: uid, ...extra };
}
function assignment(uid, extra = {}) {
  return { volunteerId: "vol-001", volunteerName: "Benevole Test", assignmentRole: "Logistique",
    status: "propose", createdAt: serverTimestamp(), createdBy: uid,
    updatedAt: serverTimestamp(), updatedBy: uid, ...extra };
}

test("projects.manage autorise la création et la lecture d’un projet", async () => {
  await seed("project-manager", ["projects.read", "projects.manage"]);
  const db = env.authenticatedContext("project-manager").firestore();
  await assertSucceeds(setDoc(doc(db, "projects", "ramadan"), project("project-manager")));
  await assertSucceeds(getDoc(doc(db, "projects", "ramadan")));
});
test("projects.read autorise la lecture mais pas l’écriture", async () => {
  await seed("project-reader", ["projects.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "projects", "seed"), project("system")));
  const db = env.authenticatedContext("project-reader").firestore();
  await assertSucceeds(getDoc(doc(db, "projects", "seed")));
  await assertFails(setDoc(doc(db, "projects", "new"), project("project-reader")));
});
test("un projet refuse les données invalides et la suppression", async () => {
  await seed("project-owner", ["projects.manage"]);
  const db = env.authenticatedContext("project-owner").firestore();
  await assertFails(setDoc(doc(db, "projects", "bad"), project("project-owner", { status: "inconnu" })));
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "projects", "keep"), project("system")));
  await assertFails(deleteDoc(doc(db, "projects", "keep")));
});
test("projects.manage autorise l’affectation d’un bénévole à un projet", async () => {
  await seed("assignment-manager", ["projects.manage"]);
  const db = env.authenticatedContext("assignment-manager").firestore();
  const ref = doc(db, "projects", "ramadan", "volunteers", "vol-001");
  await assertSucceeds(setDoc(ref, assignment("assignment-manager")));
  await assertSucceeds(getDoc(ref));
  await assertFails(deleteDoc(ref));
});
test("volunteers.manage autorise le registre privé du Club Khuddam", async () => {
  await seed("volunteer-manager", ["volunteers.read", "volunteers.manage"]);
  const db = env.authenticatedContext("volunteer-manager").firestore();
  await assertSucceeds(setDoc(doc(db, "volunteers", "vol-001"), volunteer("volunteer-manager")));
  await assertSucceeds(getDoc(doc(db, "volunteers", "vol-001")));
});
test("volunteers.read ne permet pas de créer et les bénévoles ne sont pas publics", async () => {
  await seed("volunteer-reader", ["volunteers.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteers", "seed"), volunteer("system")));
  const db = env.authenticatedContext("volunteer-reader").firestore();
  await assertSucceeds(getDoc(doc(db, "volunteers", "seed")));
  await assertFails(setDoc(doc(db, "volunteers", "new"), volunteer("volunteer-reader")));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "volunteers", "seed")));
});
test("un bénévole ne peut pas être supprimé et un statut invalide est refusé", async () => {
  await seed("volunteer-owner", ["volunteers.manage"]);
  const db = env.authenticatedContext("volunteer-owner").firestore();
  await assertFails(setDoc(doc(db, "volunteers", "bad"), volunteer("volunteer-owner", { status: "valide" })));
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteers", "keep"), volunteer("system")));
  await assertFails(deleteDoc(doc(db, "volunteers", "keep")));
});
