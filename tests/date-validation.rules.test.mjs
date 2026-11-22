import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-wat-connect",
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") }
});
after(async () => env.cleanup());

async function seed(uid) {
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), "staffAccess", uid), {
    displayName: uid,
    email: uid + "@example.org",
    role: "coordonnateur",
    active: true,
    scopes: ["programs.manage", "projects.manage", "activities.manage"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
}

function program(uid, extra = {}) {
  return {
    name: "Nour Al-Hidaya",
    code: "NOUR-AL-HIDAYA",
    description: "Programme d’apprentissage et d’accompagnement.",
    category: "education",
    status: "actif",
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...extra
  };
}

function project(uid, extra = {}) {
  return {
    name: "Projet de formation",
    code: "FORM-2027",
    description: "Projet de test des dates.",
    status: "planifie",
    startDate: "2027-02-01",
    endDate: "2027-03-31",
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...extra
  };
}

function activity(uid, extra = {}) {
  return {
    title: "Séance de formation",
    description: "Activité de test des dates.",
    category: "formation",
    activityDate: "2027-02-12",
    location: "Èkpè",
    status: "planifiee",
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...extra
  };
}

function authDb(uid) {
  return env.authenticatedContext(uid, {
    email: uid + "@example.org",
    email_verified: true
  }).firestore();
}

function updateMetadata(uid) {
  return { updatedAt: serverTimestamp(), updatedBy: uid };
}

test("les programmes exigent des dates ISO et une période cohérente à la création et à la mise à jour", async () => {
  const uid = "date-program-manager";
  await seed(uid);
  const db = authDb(uid);

  await assertSucceeds(setDoc(doc(db, "programs", "valid"), program(uid, {
    startDate: "2027-02-01",
    endDate: "2027-03-31"
  })));
  await assertSucceeds(setDoc(doc(db, "programs", "leap-day"), program(uid, {
    startDate: "2028-02-29",
    endDate: "2028-02-29"
  })));
  await assertSucceeds(setDoc(doc(db, "programs", "leap-century"), program(uid, {
    startDate: "2000-02-29",
    endDate: "2000-02-29"
  })));
  await assertFails(setDoc(doc(db, "programs", "common-century"), program(uid, {
    startDate: "1900-02-29"
  })));
  await assertFails(setDoc(doc(db, "programs", "invalid-calendar-date"), program(uid, {
    startDate: "2027-02-29"
  })));
  await assertFails(setDoc(doc(db, "programs", "bad-format"), program(uid, {
    startDate: "2027/02/01"
  })));
  await assertFails(setDoc(doc(db, "programs", "bad-range"), program(uid, {
    startDate: "2027-03-31",
    endDate: "2027-02-01"
  })));

  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "programs", "update-target"), program("system", {
      startDate: "2027-02-01",
      endDate: "2027-03-31"
    }));
  });
  await assertFails(updateDoc(doc(db, "programs", "update-target"), {
    startDate: "2027/02/01",
    ...updateMetadata(uid)
  }));
  await assertFails(updateDoc(doc(db, "programs", "update-target"), {
    endDate: "2027-01-15",
    ...updateMetadata(uid)
  }));
});

test("les projets exigent des dates ISO et conservent l'ordre début-fin", async () => {
  const uid = "date-project-manager";
  await seed(uid);
  const db = authDb(uid);

  await assertSucceeds(setDoc(doc(db, "projects", "valid"), project(uid)));
  await assertFails(setDoc(doc(db, "projects", "bad-format"), project(uid, {
    endDate: "2027/03/31"
  })));
  await assertFails(setDoc(doc(db, "projects", "bad-range"), project(uid, {
    startDate: "2027-04-01",
    endDate: "2027-03-31"
  })));
  await assertFails(setDoc(doc(db, "projects", "impossible-day"), project(uid, {
    startDate: "2027-04-31"
  })));

  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "projects", "update-target"), project("system"));
  });
  await assertFails(updateDoc(doc(db, "projects", "update-target"), {
    endDate: "2027/04/01",
    ...updateMetadata(uid)
  }));
});

test("les activités exigent une date ISO à la création et à la mise à jour", async () => {
  const uid = "date-activity-manager";
  await seed(uid);
  const db = authDb(uid);

  await assertSucceeds(setDoc(doc(db, "activities", "valid"), activity(uid)));
  await assertFails(setDoc(doc(db, "activities", "bad-format"), activity(uid, {
    activityDate: "12-02-2027"
  })));
  await assertFails(setDoc(doc(db, "activities", "impossible-day"), activity(uid, {
    activityDate: "2027-02-29"
  })));
  await assertSucceeds(setDoc(doc(db, "activities", "leap-day"), activity(uid, {
    activityDate: "2028-02-29"
  })));

  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), "activities", "update-target"), activity("system"));
  });
  await assertFails(updateDoc(doc(db, "activities", "update-target"), {
    activityDate: "2027/02/12",
    ...updateMetadata(uid)
  }));
});
