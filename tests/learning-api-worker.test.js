import test from "node:test";
import assert from "node:assert/strict";
import worker from "../workers/learning-api/src/index.js";

test("health endpoint reports that registration is disabled", async () => {
  const response = await worker.fetch(new Request("https://example.test/health"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    service: "wat-learning-api",
    status: "not-configured",
    acceptsRegistrations: false,
  });
});

test("health endpoint rejects unsupported methods", async () => {
  const response = await worker.fetch(new Request("https://example.test/health", {
    method: "POST",
  }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});

test("public registration fails closed with 503", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/public",
    { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
  ));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "service_not_configured",
    message: "Les inscriptions en ligne ne sont pas encore disponibles.",
  });
});

test("agent registration fails closed with 503", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/agent",
    { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
  ));
  assert.equal(response.status, 503);
});

test("review endpoint does not expose a public queue", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/review",
  ));
  assert.equal(response.status, 503);
});

test("registration endpoints reject unsupported methods", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/public",
    { method: "GET" },
  ));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
});

test("decision routes remain disabled until secured configuration exists", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/beneficiary-123/decision",
    { method: "POST" },
  ));
  assert.equal(response.status, 503);
});

test("duplicate-review routes remain disabled until secured configuration exists", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/beneficiary-123/duplicate-review",
    { method: "POST" },
  ));
  assert.equal(response.status, 503);
});

test("learning staff assignment operations are not exposed as HTTP routes", async () => {
  for (const path of [
    "/api/learning/staff-assignments",
    "/api/learning/staff-assignments/assignment-test/grant",
    "/api/learning/staff-assignments/assignment-test/update",
    "/api/learning/staff-assignments/assignment-test/revoke",
  ]) {
    const response = await worker.fetch(new Request(`https://example.test${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }));
    assert.equal(response.status, 404, path);
  }
});

test("unknown paths return 404", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/other"));
  assert.equal(response.status, 404);
});

test("le point d’entrée Worker exige une activation explicite et les paramètres staging", async () => {
  const env = {
    WAT_ENABLE_AGENT_REGISTRATION: "true",
    WAT_ENV: "staging",
    FIREBASE_PROJECT_ID: "wat-connect-staging",
    FIREBASE_CLIENT_EMAIL: "fake@wat-connect-staging.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nFAKE\n-----END PRIVATE KEY-----",
    TURNSTILE_SECRET_KEY: "test-only-placeholder",
    WAT_REGISTRATION_HMAC_HEX: "ab".repeat(32),
  };
  const request = () => new Request("https://example.test/api/learning/registrations/agent", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{",
  });
  for (const overrides of [
    { WAT_ENABLE_AGENT_REGISTRATION: "false" },
    { WAT_ENV: "production" },
    { FIREBASE_PROJECT_ID: "wat-connect" },
    { WAT_REGISTRATION_HMAC_HEX: "invalid" },
    { FIREBASE_PRIVATE_KEY: undefined },
  ]) {
    assert.equal((await worker.fetch(request(), { ...env, ...overrides })).status, 503);
  }
  const response = await worker.fetch(request(), env);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "registration_json_invalid" });
});
