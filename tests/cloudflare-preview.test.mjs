import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"));
const ignoredAssets = readFileSync(new URL("../.assetsignore", import.meta.url), "utf8");

test("Cloudflare Worker Previews have an explicit Wrangler configuration", () => {
  assert.equal(config.name, "nour-al-hidaya");
  assert.deepEqual(config.previews, {});
  assert.equal(config.assets.directory, ".");
});

test("Cloudflare static assets exclude repository and internal project files", () => {
  for (const pattern of ["/.github/", "/.git/", "/node_modules/", "/docs/", "/tests/", "/functions/", "/scripts/", "/.firebaserc", "/.env*", "firebase.json", "wrangler.json", "firestore.rules", "package.json", "package-lock.json", "*.md", "*.txt", "*.zip", "*.log"]) {
    assert.ok(ignoredAssets.includes(pattern), `missing .assetsignore rule: ${pattern}`);
  }
});

test("Firebase Hosting excludes backend code and administrative bootstrap scripts", () => {
  const firebase = JSON.parse(readFileSync(new URL("../firebase.json", import.meta.url), "utf8"));
  for (const pattern of ["functions/**", "scripts/**", "package.json", "package-lock.json", "*.zip", "*.apk", "*.aab", "*.keystore", "*.jks", ".env*"]) {
    assert.ok(firebase.hosting.ignore.includes(pattern), `missing Firebase Hosting ignore rule: ${pattern}`);
  }
});

test("the staging Worker has its own isolated Wrangler target", () => {
  const staging = JSON.parse(readFileSync(new URL("../wrangler.staging.json", import.meta.url), "utf8"));
  assert.equal(staging.name, "wat-connect-staging");
  assert.deepEqual(staging.previews, {});
  assert.equal(staging.assets.directory, ".");
  assert.ok(readFileSync(new URL("../.assetsignore", import.meta.url), "utf8").includes("wrangler.staging.json"));
  const firebase = JSON.parse(readFileSync(new URL("../firebase.json", import.meta.url), "utf8"));
  assert.ok(firebase.hosting.ignore.includes("wrangler.staging.json"));
  const firebaseIgnore = readFileSync(new URL("../.firebaseignore", import.meta.url), "utf8");
  assert.ok(firebaseIgnore.includes("wrangler.staging.json"));
});


test("le workflow manuel ne peut publier que sur le Worker de staging", () => {
  const workflow = readFileSync(new URL("../.github/workflows/cloudflare-staging-preview.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*(push|pull_request):/m);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/security\/staff-account-provisioning'/);
  assert.match(workflow, /environment: staging/);
  assert.match(workflow, /wrangler@4 deploy --config wrangler\.staging\.json --name wat-connect-staging/);
  assert.doesNotMatch(workflow, /wrangler@4 deploy(?! --config wrangler\.staging\.json --name wat-connect-staging)/);
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /secrets\.CLOUDFLARE_ACCOUNT_ID/);
});
