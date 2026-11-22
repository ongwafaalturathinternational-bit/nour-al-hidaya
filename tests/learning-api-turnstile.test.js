import test from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstileToken } from "../workers/learning-api/src/turnstile.js";

const secret = "staging-turnstile-secret-value";
const now = Date.parse("2026-11-22T12:00:00.000Z");
const validResult = {
  success: true,
  hostname: "wat-connect-staging.ongwafaalturathinternational.workers.dev",
  action: "learning_registration",
  challenge_ts: "2026-11-22T11:59:00.000Z",
};

function verify(result = validResult, options = {}) {
  let request;
  return verifyTurnstileToken("turnstile-test-token", secret, {
    expectedAction: "learning_registration",
    expectedHostnames: ["wat-connect-staging.ongwafaalturathinternational.workers.dev"],
    now,
    fetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify(result), { status: 200 });
    },
    ...options,
  }).then((value) => ({ value, request }));
}

test("Turnstile accepts a fresh single-use token with exact action and hostname", async () => {
  const { value, request } = await verify();
  assert.equal(value.action, "learning_registration");
  assert.equal(value.hostname, "wat-connect-staging.ongwafaalturathinternational.workers.dev");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers["content-type"], "application/x-www-form-urlencoded");
  assert.equal(new URLSearchParams(request.init.body).get("secret"), secret);
});

test("Turnstile rejects unsuccessful Siteverify responses", async () => {
  await assert.rejects(() => verify({ success: false, "error-codes": ["timeout-or-duplicate"] }), /token_rejected/);
});

test("Turnstile rejects action and hostname mismatches", async () => {
  await assert.rejects(() => verify({ ...validResult, action: "login" }), /action_mismatch/);
  await assert.rejects(() => verify({ ...validResult, hostname: "evil.example" }), /hostname_mismatch/);
});

test("Turnstile rejects expired, malformed and future challenge timestamps", async () => {
  await assert.rejects(() => verify({ ...validResult, challenge_ts: "2026-11-22T11:54:59.000Z" }), /token_expired/);
  await assert.rejects(() => verify({ ...validResult, challenge_ts: "not-a-date" }), /token_expired/);
  await assert.rejects(() => verify({ ...validResult, challenge_ts: "2026-11-22T12:01:00.000Z" }), /token_expired/);
});

test("Turnstile rejects oversized tokens and missing host configuration before network", async () => {
  let calls = 0;
  const fetch = async () => { calls += 1; return new Response("{}", { status: 200 }); };
  await assert.rejects(() => verifyTurnstileToken("x".repeat(2049), secret, {
    expectedAction: "learning_registration", expectedHostnames: ["example.com"], fetch,
  }), /token_invalid/);
  await assert.rejects(() => verifyTurnstileToken("token", secret, {
    expectedAction: "learning_registration", expectedHostnames: [], fetch,
  }), /hostname_configuration_invalid/);
  assert.equal(calls, 0);
});

test("Turnstile fails closed on network and HTTP errors", async () => {
  const options = {
    expectedAction: "learning_registration",
    expectedHostnames: ["example.com"],
    now,
  };
  await assert.rejects(() => verifyTurnstileToken("token", secret, {
    ...options, fetch: async () => { throw new Error("network"); },
  }), /service_unavailable/);
  await assert.rejects(() => verifyTurnstileToken("token", secret, {
    ...options, fetch: async () => new Response("unavailable", { status: 503 }),
  }), /service_unavailable/);
});

test("Turnstile includes the Cloudflare connecting IP only when supplied", async () => {
  const { request } = await verify(validResult, { remoteIp: "203.0.113.10" });
  assert.equal(new URLSearchParams(request.init.body).get("remoteip"), "203.0.113.10");
});
