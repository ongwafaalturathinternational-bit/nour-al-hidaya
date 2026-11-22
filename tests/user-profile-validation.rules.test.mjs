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

function fixture(uid) {
  const email = uid + "@example.org";
  const db = env.authenticatedContext(uid, { email, email_verified: true }).firestore();
  return {
    uid,
    email,
    db,
    profileRef: doc(db, "users", uid),
    profile: () => ({
      email,
      displayName: "Apprenante de test",
      role: "apprenant",
      country: "BJ",
      interest: "C",
      mosque: "",
      learningMode: "seul",
      createdAt: serverTimestamp()
    })
  };
}

test("un apprenant peut créer puis mettre à jour son profil valide", async () => {
  const user = fixture("profile-valid-test");
  await assertSucceeds(setDoc(user.profileRef, user.profile()));
  await assertSucceeds(updateDoc(user.profileRef, {
    displayName: "Profil de test actualisé",
    updatedAt: serverTimestamp()
  }));
});

test("les champs de profil invalides sont refusés à la création et à la mise à jour", async () => {
  const user = fixture("profile-invalid-test");
  await assertFails(setDoc(user.profileRef, {
    ...user.profile(),
    displayName: "N".repeat(121)
  }));

  await assertSucceeds(setDoc(user.profileRef, user.profile()));
  const invalidUpdates = [
    { displayName: ["valeur", "invalide"] },
    { displayName: "N".repeat(121) },
    { country: "C".repeat(81) },
    { interest: "admin" },
    { mosque: "M".repeat(121) },
    { learningMode: "sans-limite" }
  ];
  for (const patch of invalidUpdates) {
    await assertFails(updateDoc(user.profileRef, { ...patch, updatedAt: serverTimestamp() }));
  }
  await assertFails(updateDoc(user.profileRef, { displayName: "Sans horodatage" }));
});
