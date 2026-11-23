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

const uid = "learner-private-test";
const db = env.authenticatedContext(uid, {
  email: uid + "@example.org",
  email_verified: true
}).firestore();

function record(extra = {}) {
  return {
    kind: "reflection",
    itemId: "lesson-1",
    value: "Réflexion fictive.",
    date: "2026-11-22",
    updatedAt: serverTimestamp(),
    ...extra
  };
}

test("les données pédagogiques privées acceptent les identifiants et dates valides", async () => {
  await assertSucceeds(setDoc(doc(db, "users", uid, "learning", "reflection-1"), record()));
  await assertSucceeds(setDoc(doc(db, "users", uid, "learning", "leap-date"), record({
    date: "2028-02-29"
  })));
});

test("les entrées pédagogiques refusent les identifiants, dates et textes hors limites", async () => {
  const invalidRecords = [
    { itemId: "i".repeat(121) },
    { date: "2027-02-29" },
    { date: "2027-04-31" },
    { date: "2026-11-22T12:00:00.000Z" },
    { value: "R".repeat(5001) }
  ];
  for (let index = 0; index < invalidRecords.length; index += 1) {
    await assertFails(setDoc(
      doc(db, "users", uid, "learning", "invalid-" + index),
      record(invalidRecords[index])
    ));
  }
  await assertFails(updateDoc(doc(db, "users", uid, "learning", "reflection-1"), {
    date: "2027-02-29",
    updatedAt: serverTimestamp()
  }));
});
