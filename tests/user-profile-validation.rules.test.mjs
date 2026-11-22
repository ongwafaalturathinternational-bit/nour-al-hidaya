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

const uid = "profile-learner-test";
const email = "profile-learner@example.org";
const db = env.authenticatedContext(uid, { email, email_verified: true }).firestore();
const profileRef = doc(db, "users", uid);

function profile() {
  return {
    email,
    displayName: "Apprenante de test",
    role: "apprenant",
    country: "BJ",
    interest: "C",
    mosque: "",
    learningMode: "seul",
    createdAt: serverTimestamp()
  };
}

test("un apprenant peut créer puis mettre à jour son profil valide", async () => {
  await assertSucceeds(setDoc(profileRef, profile()));
  await assertSucceeds(updateDoc(profileRef, {
    displayName: "Profil de test actualisé",
    updatedAt: serverTimestamp()
  }));
});

test("les champs de profil invalides sont refusés à la création et à la mise à jour", async () => {
  await assertFails(setDoc(doc(db, "users", "profile-name-too-long"), {
    ...profile(),
    displayName: "N".repeat(121)
  }));

  await assertSucceeds(setDoc(profileRef, profile()));
  const invalidUpdates = [
    { displayName: ["valeur", "invalide"] },
    { displayName: "N".repeat(121) },
    { country: "C".repeat(81) },
    { interest: "admin" },
    { mosque: "M".repeat(121) },
    { learningMode: "sans-limite" }
  ];
  for (const patch of invalidUpdates) {
    await assertFails(updateDoc(profileRef, { ...patch, updatedAt: serverTimestamp() }));
  }
  await assertFails(updateDoc(profileRef, { displayName: "Sans horodatage" }));
});
