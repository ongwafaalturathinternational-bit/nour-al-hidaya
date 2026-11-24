import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { readServerConfig } from "../workers/learning-api/src/config.js";

const validEnv = () => ({
  WAT_ENV: "staging",
  FIREBASE_PROJECT_ID: "wat-connect-staging",
  FIREBASE_CLIENT_EMAIL: "wat-nh-staging@wat-connect-staging.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nFAKE_TEST_KEY\\n-----END PRIVATE KEY-----",
  TURNSTILE_SECRET_KEY: "test-only-turnstile-secret",
});

test("configuration rejects an empty environment", () => {
  const result = readServerConfig({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 4);
});

test("configuration rejects production or an unapproved Firebase project", () => {
  const env = validEnv();
  env.WAT_ENV = "production";
  env.FIREBASE_PROJECT_ID = "wat-connect";
  const result = readServerConfig(env);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("WAT_ENV")));
  assert.ok(result.errors.some((error) => error.includes("FIREBASE_PROJECT_ID")));
});

test("configuration rejects invalid service account identities", () => {
  const env = validEnv();
  env.FIREBASE_CLIENT_EMAIL = "someone@example.com";
  const result = readServerConfig(env);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("FIREBASE_CLIENT_EMAIL")));
});

test("configuration rejects missing private key and Turnstile secret", () => {
  const env = validEnv();
  env.FIREBASE_PRIVATE_KEY = "";
  env.TURNSTILE_SECRET_KEY = "";
  const result = readServerConfig(env);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("FIREBASE_PRIVATE_KEY")));
  assert.ok(result.errors.some((error) => error.includes("TURNSTILE_SECRET_KEY")));
});

test("valid staging configuration normalizes escaped PEM newlines", () => {
  const result = readServerConfig(validEnv());
  assert.equal(result.ok, true);
  assert.equal(result.config.environment, "staging");
  assert.equal(result.config.firebaseProjectId, "wat-connect-staging");
  assert.equal(result.config.firestoreDatabaseId, "(default)");
  assert.match(result.config.firebasePrivateKey, /BEGIN PRIVATE KEY-----\nFAKE_TEST_KEY\n-----END/);
  assert.equal(Object.isFrozen(result.config), true);
});

test("configuration errors never include secret values", () => {
  const env = validEnv();
  env.FIREBASE_PRIVATE_KEY = "private-secret-value";
  env.TURNSTILE_SECRET_KEY = "turnstile-secret-value";
  const result = readServerConfig(env);
  assert.equal(result.ok, false);
  const diagnostic = result.errors.join(" ");
  assert.equal(diagnostic.includes("private-secret-value"), false);
  assert.equal(diagnostic.includes("turnstile-secret-value"), false);
});

test("the isolated Wrangler entry point stays closed without a public route", () => {
  const directory = new URL("../workers/learning-api/", import.meta.url);
  const config = JSON.parse(readFileSync(new URL("wrangler.jsonc", directory), "utf8"));
  assert.equal(config.name, "wat-connect-learning-api-staging");
  assert.equal(config.main, "src/index.js");
  assert.doesNotThrow(() => readFileSync(new URL(config.main, directory)));
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.equal(config.routes, undefined);
  assert.equal(config.route, undefined);
  assert.deepEqual(config.vars, {
    WAT_ENV: "staging",
    FIREBASE_PROJECT_ID: "wat-connect-staging",
    WAT_ENABLE_AGENT_REGISTRATION: "false",
  });
});
