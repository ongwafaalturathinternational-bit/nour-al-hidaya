import test, { after } from "node:test";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-wat-connect",
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") }
});
after(async () => env.cleanup());

async function seed(uid, scopes) {
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "staffAccess", uid), {
    displayName: uid, email: uid + "@example.org", role: "coordonnateur",
    active: true, scopes, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
}
function application(uid, email, extra = {}) {
  return { fullName: "Candidat Test", email, phone: "+22900000000", category: "occasionnel",
    skills: ["logistique"], interests: ["humanitaire"], availability: "Week-ends", privacyConsent: true, consentAt: serverTimestamp(),
    status: "en_attente", createdAt: serverTimestamp(), createdBy: uid,
    updatedAt: serverTimestamp(), updatedBy: uid, ...extra };
}

test("un compte vérifié peut déposer sa candidature uniquement sous son UID", async () => {
  const db = env.authenticatedContext("applicant-1", { email: "candidate@example.org", email_verified: true }).firestore();
  const ref = doc(db, "volunteerApplications", "applicant-1");
  await assertSucceeds(setDoc(ref, application("applicant-1", "candidate@example.org")));
  await assertSucceeds(getDoc(ref));
  await assertFails(setDoc(doc(db, "volunteerApplications", "someone-else"), application("applicant-1", "candidate@example.org")));
});
test("un compte non vérifié ne peut pas déposer une candidature", async () => {
  const db = env.authenticatedContext("applicant-2", { email: "unverified@example.org", email_verified: false }).firestore();
  await assertFails(setDoc(doc(db, "volunteerApplications", "applicant-2"), application("applicant-2", "unverified@example.org")));
});
test("la candidature ne peut pas être auto-approuvée ou modifiée par le candidat", async () => {
  const db = env.authenticatedContext("applicant-3", { email: "candidate3@example.org", email_verified: true }).firestore();
  await assertFails(setDoc(doc(db, "volunteerApplications", "applicant-3"), application("applicant-3", "candidate3@example.org", { status: "acceptee" })));
});
test("volunteers.read consulte une candidature et volunteers.manage peut la traiter", async () => {
  await seed("reviewer", ["volunteers.read", "volunteers.manage"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteerApplications", "candidate"), application("candidate", "candidate@example.org")));
  const db = env.authenticatedContext("reviewer").firestore();
  const ref = doc(db, "volunteerApplications", "candidate");
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, { status: "acceptee", reviewedAt: serverTimestamp(), reviewedBy: "reviewer", updatedAt: serverTimestamp(), updatedBy: "reviewer" }));
});
test("volunteers.read peut consulter mais pas traiter une candidature", async () => {
  await seed("reader", ["volunteers.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteerApplications", "candidate2"), application("candidate2", "candidate2@example.org")));
  const db = env.authenticatedContext("reader").firestore();
  const ref = doc(db, "volunteerApplications", "candidate2");
  await assertSucceeds(getDoc(ref));
  await assertFails(updateDoc(ref, { status: "acceptee", reviewedAt: serverTimestamp(), reviewedBy: "reader", updatedAt: serverTimestamp(), updatedBy: "reader" }));
});


test("le candidat ne peut ni lister les candidatures ni modifier son dossier après dépôt", async () => {
  const db = env.authenticatedContext("applicant-4", { email: "candidate4@example.org", email_verified: true }).firestore();
  const ref = doc(db, "volunteerApplications", "applicant-4");
  await assertSucceeds(setDoc(ref, application("applicant-4", "candidate4@example.org")));
  await assertFails(getDocs(collection(db, "volunteerApplications")));
  await assertFails(updateDoc(ref, { fullName: "Nom modifié" }));
  await assertFails(updateDoc(ref, { status: "acceptee" }));
});

test("un responsable ne peut pas modifier les données personnelles d'une candidature", async () => {
  await seed("reviewer-pii", ["volunteers.manage"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteerApplications", "candidate-pii"), application("candidate-pii", "candidate-pii@example.org")));
  const db = env.authenticatedContext("reviewer-pii").firestore();
  const ref = doc(db, "volunteerApplications", "candidate-pii");
  await assertFails(updateDoc(ref, { fullName: "Nom remplacé", status: "acceptee", reviewedAt: serverTimestamp(), reviewedBy: "reviewer-pii", updatedAt: serverTimestamp(), updatedBy: "reviewer-pii" }));
  await assertSucceeds(updateDoc(ref, { status: "refusee", reviewedAt: serverTimestamp(), reviewedBy: "reviewer-pii", updatedAt: serverTimestamp(), updatedBy: "reviewer-pii" }));
});

test("un membre de l'équipe sans périmètre Club ne peut pas lire les candidatures", async () => {
  await seed("staff-without-club", ["activities.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteerApplications", "private-candidate"), application("private-candidate", "private@example.org")));
  const db = env.authenticatedContext("staff-without-club").firestore();
  await assertFails(getDoc(doc(db, "volunteerApplications", "private-candidate")));
  await assertFails(getDocs(collection(db, "volunteerApplications")));
});

test("une candidature déjà traitée ne peut pas recevoir une seconde décision", async () => {
  await seed("reviewer-once", ["volunteers.manage"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "volunteerApplications", "already-reviewed"), application("candidate", "candidate@example.org", { status: "acceptee" })));
  const db = env.authenticatedContext("reviewer-once").firestore();
  const ref = doc(db, "volunteerApplications", "already-reviewed");
  await assertFails(updateDoc(ref, { status: "refusee", reviewedAt: serverTimestamp(), reviewedBy: "reviewer-once", updatedAt: serverTimestamp(), updatedBy: "reviewer-once" }));
});
