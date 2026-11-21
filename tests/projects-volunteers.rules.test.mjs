import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-wat-connect",
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

test("un compte d'équipe dont l'adresse n'est pas vérifiée ne peut pas utiliser ses périmètres", async () => {
  await seed("staff-unverified", ["projects.read", "volunteers.read"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "projects", "private-unverified"), project("system"));
    await setDoc(doc(c.firestore(), "volunteers", "private-unverified"), volunteer("system"));
  });
  const db = env.authenticatedContext("staff-unverified", {
    email: "staff-unverified@example.org", email_verified: false
  }).firestore();
  await assertFails(getDoc(doc(db, "projects", "private-unverified")));
  await assertFails(getDoc(doc(db, "volunteers", "private-unverified")));
});

test("projects.manage autorise la création et la lecture d’un projet", async () => {
  await seed("project-manager", ["projects.read", "projects.manage"]);
  const db = env.authenticatedContext("project-manager", { email: "project-manager@example.org", email_verified: true }).firestore();
  await assertSucceeds(setDoc(doc(db, "projects", "ramadan"), project("project-manager")));
  await assertSucceeds(getDoc(doc(db, "projects", "ramadan")));
});
test("projects.read autorise la lecture mais pas l’écriture", async () => {
  await seed("project-reader", ["projects.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "projects", "seed"), project("system")));
  const db = env.authenticatedContext("project-reader", { email: "project-reader@example.org", email_verified: true }).firestore();
  await assertSucceeds(getDoc(doc(db, "projects", "seed")));
  await assertFails(setDoc(doc(db, "projects", "new"), project("project-reader")));
});
test("un projet refuse les données invalides et la suppression", async () => {
  await seed("project-owner", ["projects.manage"]);
  const db = env.authenticatedContext("project-owner", { email: "project-owner@example.org", email_verified: true }).firestore();
  await assertFails(setDoc(doc(db, "projects", "bad"), project("project-owner", { status: "inconnu" })));
  await assertFails(setDoc(doc(db, "projects", "missing-program"), project("project-owner", { programId: "program-absent" })));
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "projects", "keep"), project("system")));
  await assertFails(deleteDoc(doc(db, "projects", "keep")));
});
test("une affectation exige un projet existant et un bénévole actif correspondant à son identifiant", async () => {
  await seed("assignment-manager", ["projects.manage", "volunteers.read"]);
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, "projects", "ramadan"), project("system"));
    await setDoc(doc(db, "volunteers", "vol-001"), volunteer("system"));
    await setDoc(doc(db, "volunteers", "vol-inactive"), volunteer("system", { status: "inactif" }));
  });
  const db = env.authenticatedContext("assignment-manager", { email: "assignment-manager@example.org", email_verified: true }).firestore();
  const validRef = doc(db, "projects", "ramadan", "volunteers", "vol-001");
  await assertSucceeds(setDoc(validRef, assignment("assignment-manager")));
  await assertSucceeds(getDoc(validRef));
  await assertFails(deleteDoc(validRef));

  await assertFails(setDoc(
    doc(db, "projects", "ramadan", "volunteers", "vol-absent"),
    assignment("assignment-manager", { volunteerId: "vol-absent", volunteerName: "Bénévole absent" })
  ));
  await assertFails(setDoc(
    doc(db, "projects", "ramadan", "volunteers", "vol-inactive"),
    assignment("assignment-manager", { volunteerId: "vol-inactive" })
  ));
  await assertFails(setDoc(
    doc(db, "projects", "ramadan", "volunteers", "another-id"),
    assignment("assignment-manager")
  ));
  await assertFails(setDoc(
    doc(db, "projects", "project-absent", "volunteers", "vol-001"),
    assignment("assignment-manager")
  ));
});
test("les affectations ne sont pas accessibles avec les seuls périmètres projets", async () => {
  await seed("project-reader-no-volunteer", ["projects.read"]);
  await seed("project-manager-no-volunteer", ["projects.manage"]);
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, "projects", "private-assignment-project"), project("system"));
    await setDoc(doc(db, "volunteers", "private-assignment-volunteer"), volunteer("system"));
    await setDoc(
      doc(db, "projects", "private-assignment-project", "volunteers", "private-assignment-volunteer"),
      assignment("system", { volunteerId: "private-assignment-volunteer", volunteerName: "Benevole Test" })
    );
  });
  const reader = env.authenticatedContext("project-reader-no-volunteer", {
    email: "project-reader-no-volunteer@example.org", email_verified: true
  }).firestore();
  const manager = env.authenticatedContext("project-manager-no-volunteer", {
    email: "project-manager-no-volunteer@example.org", email_verified: true
  }).firestore();
  await assertFails(getDoc(doc(reader, "projects", "private-assignment-project", "volunteers", "private-assignment-volunteer")));
  await assertFails(getDoc(doc(manager, "projects", "private-assignment-project", "volunteers", "private-assignment-volunteer")));
  await assertFails(setDoc(
    doc(manager, "projects", "private-assignment-project", "volunteers", "another-volunteer"),
    assignment("project-manager-no-volunteer", {
      volunteerId: "another-volunteer", volunteerName: "Autre bénévole"
    })
  ));
});

test("volunteers.manage autorise le registre privé du Club Khuddam", async () => {
  await seed("volunteer-manager", ["volunteers.manage"]);
  const db = env.authenticatedContext("volunteer-manager", { email: "volunteer-manager@example.org", email_verified: true }).firestore();
  const access = await assertSucceeds(getDoc(doc(db, "staffAccess", "volunteer-manager")));
  assert.equal(access.data().active, true);
  assert.ok(access.data().scopes.includes("volunteers.manage"));
  // Identifiant dédié : un test précédent conserve déjà /volunteers/vol-001
  // dans le même environnement d'émulation, ce qui transformerait setDoc en update.
  const volunteerRef = doc(db, "volunteers", "volunteer-manager-record");
  await assertSucceeds(setDoc(volunteerRef, volunteer("volunteer-manager")));
  await assertSucceeds(getDoc(volunteerRef));
});
test("volunteers.read ne permet pas de créer et les bénévoles ne sont pas publics", async () => {
  await seed("volunteer-reader", ["volunteers.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteers", "seed"), volunteer("system")));
  const db = env.authenticatedContext("volunteer-reader", { email: "volunteer-reader@example.org", email_verified: true }).firestore();
  await assertSucceeds(getDoc(doc(db, "volunteers", "seed")));
  await assertSucceeds(getDocs(collection(db, "volunteers")));
  await assertFails(setDoc(doc(db, "volunteers", "new"), volunteer("volunteer-reader")));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "volunteers", "seed")));
});
test("un bénévole ne peut pas être supprimé et un statut invalide est refusé", async () => {
  await seed("volunteer-owner", ["volunteers.manage"]);
  const db = env.authenticatedContext("volunteer-owner", { email: "volunteer-owner@example.org", email_verified: true }).firestore();
  await assertFails(setDoc(doc(db, "volunteers", "bad"), volunteer("volunteer-owner", { status: "valide" })));
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteers", "keep"), volunteer("system")));
  await assertFails(deleteDoc(doc(db, "volunteers", "keep")));
});

test("une affectation conserve l'identité du bénévole mais autorise la mise à jour du rôle", async () => {
  await seed("assignment-identity-manager", ["projects.manage", "volunteers.read"]);
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, "projects", "identity-project"), project("system"));
    await setDoc(doc(db, "volunteers", "identity-volunteer"), volunteer("system"));
  });
  const db = env.authenticatedContext("assignment-identity-manager", { email: "assignment-identity-manager@example.org", email_verified: true }).firestore();
  const ref = doc(db, "projects", "identity-project", "volunteers", "identity-volunteer");
  await assertSucceeds(setDoc(ref, assignment("assignment-identity-manager", { volunteerId: "identity-volunteer", volunteerName: "Benevole Test" })));
  await assertFails(updateDoc(ref, { volunteerName: "Autre personne", updatedAt: serverTimestamp(), updatedBy: "assignment-identity-manager" }));
  await assertFails(updateDoc(ref, { volunteerId: "another-volunteer", updatedAt: serverTimestamp(), updatedBy: "assignment-identity-manager" }));
  await assertSucceeds(updateDoc(ref, { assignmentRole: "Coordination terrain", status: "confirme", updatedAt: serverTimestamp(), updatedBy: "assignment-identity-manager" }));
});

test("une affectation ne peut pas être réactivée après désactivation du bénévole", async () => {
  await seed("assignment-inactive-transition", ["projects.manage", "volunteers.read"]);
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, "projects", "inactive-transition-project"), project("system"));
    await setDoc(doc(db, "volunteers", "vol-001"), volunteer("system"));
    await setDoc(
      doc(db, "projects", "inactive-transition-project", "volunteers", "vol-001"),
      assignment("system")
    );
    await updateDoc(doc(db, "volunteers", "vol-001"), { status: "inactif" });
  });
  const db = env.authenticatedContext("assignment-inactive-transition", {
    email: "assignment-inactive-transition@example.org", email_verified: true
  }).firestore();
  const ref = doc(db, "projects", "inactive-transition-project", "volunteers", "vol-001");
  const volunteerRef = doc(db, "volunteers", "vol-001");
  const atomicBatch = writeBatch(db);
  atomicBatch.update(volunteerRef, {
    status: "inactif", updatedAt: serverTimestamp(), updatedBy: "assignment-inactive-transition"
  });
  atomicBatch.update(ref, {
    status: "confirme", updatedAt: serverTimestamp(), updatedBy: "assignment-inactive-transition"
  });
  await assertFails(atomicBatch.commit());

  await updateDoc(volunteerRef, {
    status: "inactif", updatedAt: serverTimestamp(), updatedBy: "assignment-inactive-transition"
  });
  await assertFails(updateDoc(ref, {
    status: "confirme", updatedAt: serverTimestamp(), updatedBy: "assignment-inactive-transition"
  }));
  await assertFails(updateDoc(ref, {
    status: "propose", updatedAt: serverTimestamp(), updatedBy: "assignment-inactive-transition"
  }));
  await assertSucceeds(updateDoc(ref, {
    status: "retire", updatedAt: serverTimestamp(), updatedBy: "assignment-inactive-transition"
  }));
});
