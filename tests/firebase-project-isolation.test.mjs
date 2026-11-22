import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const firebaseRc = JSON.parse(readFileSync(new URL("../.firebaserc", import.meta.url), "utf8"));
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const firestoreWorkflow = readFileSync(new URL("../.github/workflows/firestore-rules.yml", import.meta.url), "utf8");
const webBuild = readFileSync(new URL("../scripts/prepare-capacitor-web.mjs", import.meta.url), "utf8");
const stagingWorker = JSON.parse(readFileSync(new URL("../wrangler.staging.json", import.meta.url), "utf8"));

test("Firebase CLI defaults to a demo project and exposes staging only through an explicit alias", () => {
  assert.equal(firebaseRc.projects.default, "demo-wat-connect");
  assert.equal(firebaseRc.projects.staging, "wat-connect-staging");
  assert.equal(firebaseRc.projects.production, undefined);
});

test("Firebase test commands cannot inherit the production project default", () => {
  assert.match(packageJson.scripts["test:firestore-rules"], /--project demo-wat-connect/);
  assert.match(packageJson.scripts["test:security"], /test:firestore-rules/);
  assert.match(firestoreWorkflow, /--project demo-wat-connect/);
  assert.doesNotMatch(packageJson.scripts["test:firestore-rules"], /--project\s+wat-connect(?:\s|$)/);
  assert.doesNotMatch(packageJson.scripts["test:firestore-rules"], /firebase\s+deploy/);
});

test("Cloudflare local preview explicitly uses staging config and Firebase staging assets", () => {
  assert.match(packageJson.scripts["build:staging:web"], /prepare-capacitor-web\.mjs --staging/);
  assert.match(packageJson.scripts["preview:cloudflare"], /build:staging:web/);
  assert.match(packageJson.scripts["preview:cloudflare"], /--config wrangler\.staging\.json/);
  assert.match(webBuild, /process\.argv\.includes\("--staging"\)/);
  assert.equal(stagingWorker.name, "wat-connect-staging");
  assert.deepEqual(stagingWorker.previews, {});
});
