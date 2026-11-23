import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("les outils Firebase par défaut ciblent le projet de démonstration", () => {
  const config = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
  assert.equal(config.projects.default, "demo-wat-connect");
  assert.equal(config.projects.staging, "wat-connect-staging");
  assert.notEqual(config.projects.default, "wat-connect");
});

test("les règles Firestore s'exécutent uniquement dans l'émulateur demo explicite", () => {
  const workflow = fs.readFileSync(".github/workflows/firestore-rules.yml", "utf8");
  assert.match(workflow, /firebase emulators:exec --only firestore --project demo-wat-connect/);
});

test("le build Android de validation force l'environnement Firebase staging", () => {
  const workflow = fs.readFileSync(".github/workflows/android-apk.yml", "utf8");
  assert.match(workflow, /WAT_FIREBASE_ENV:\s*staging/);
  assert.match(workflow, /npm run build:android:web/);
});
