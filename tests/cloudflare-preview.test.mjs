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
  for (const pattern of ["functions/**", "scripts/**", "package.json", "package-lock.json"]) {
    assert.ok(firebase.hosting.ignore.includes(pattern), `missing Firebase Hosting ignore rule: ${pattern}`);
  }
});
