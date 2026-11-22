import test from "node:test";
import assert from "node:assert/strict";
import { createFirestoreRestClient } from "../workers/learning-api/src/firestore-rest.js";

const config = { environment: "staging", firebaseProjectId: "wat-connect-staging" };
const token = { accessToken: "ephemeral-test-token", expiresAt: 1_900_000_000 };

test("Firestore client is locked to the approved staging configuration", () => {
  assert.throws(() => createFirestoreRestClient({ environment: "production", firebaseProjectId: "prod" }), /staging_configuration_required/);
});

test("Firestore create sends typed fields to an approved collection", async () => {
  let request;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ name: "projects/wat-connect-staging/databases/(default)/documents/learningBeneficiaries/opaque-id" }), { status: 200 });
    },
  });
  const result = await client.createDocument("learningBeneficiaries", "opaque-id", {
    displayName: "Test Beneficiary", active: true, age: 12, optional: null,
  });
  assert.match(request.url, /documents\/learningBeneficiaries\?documentId=opaque-id$/);
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.authorization, "Bearer ephemeral-test-token");
  const body = JSON.parse(request.init.body);
  assert.equal(body.fields.displayName.stringValue, "Test Beneficiary");
  assert.equal(body.fields.active.booleanValue, true);
  assert.equal(body.fields.age.integerValue, "12");
  assert.equal(body.fields.optional.nullValue, null);
  assert.ok(result.name.endsWith("/opaque-id"));
});

test("Firestore client refuses unknown collections and malformed IDs before network access", async () => {
  let calls = 0;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => { calls += 1; return new Response("{}", { status: 200 }); },
  });
  await assert.rejects(() => client.getDocument("users", "x"), /collection_not_allowed/);
  await assert.rejects(() => client.getDocument("beneficiaries", "x"), /collection_not_allowed/);
  await assert.rejects(() => client.getDocument("learningBeneficiaries", "../x"), /document_id_invalid/);
  assert.equal(calls, 0);
});

test("Firestore update uses an existence precondition and field mask", async () => {
  let request;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ name: "projects/wat-connect-staging/databases/(default)/documents/learningBeneficiaries/b-1" }), { status: 200 });
    },
  });
  await client.updateDocument("learningBeneficiaries", "b-1", { status: "active" });
  assert.match(request.url, /updateMask\.fieldPaths=status/);
  assert.match(request.url, /currentDocument\.exists=true/);
  assert.equal(request.init.method, "PATCH");
});

test("Firestore duplicate create conflicts are not hidden", async () => {
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => new Response(JSON.stringify({ error: { status: "ALREADY_EXISTS" } }), { status: 409 }),
  });
  await assert.rejects(() => client.createDocument("learningBeneficiaries", "same-id", { displayName: "A" }), /document_conflict/);
});

test("Firestore encoder rejects invalid field names, unsupported values and non-finite numbers", async () => {
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async (_url, init) => new Response(JSON.stringify({ accepted: true, received: init?.body ? JSON.parse(init.body) : null }), { status: 200 }),
  });
  await assert.rejects(() => client.createDocument("learningBeneficiaries", "x", { "__bad": "x" }), /field_name_invalid/);
  await assert.rejects(() => client.createDocument("learningBeneficiaries", "x", { amount: Number.NaN }), /number_invalid/);
  await assert.rejects(() => client.createDocument("learningBeneficiaries", "x", { amount: Number.MAX_SAFE_INTEGER + 1 }), /integer_unsafe/);
  const date = new Date("2026-11-22T00:00:00.000Z");
  const result = await client.createDocument("learningBeneficiaries", "x", { date });
  assert.equal(result.received.fields.date.timestampValue, "2026-11-22T00:00:00.000Z");
});

test("Firestore access token is reused within its validity window", async () => {
  let tokenCalls = 0;
  let fetchCalls = 0;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => { tokenCalls += 1; return token; },
    fetch: async () => { fetchCalls += 1; return new Response(JSON.stringify({ name: "ok" }), { status: 200 }); },
  });
  await client.getDocument("learningBeneficiaries", "one");
  await client.getDocument("learningBeneficiaries", "two");
  assert.equal(tokenCalls, 1);
  assert.equal(fetchCalls, 2);
});


test("canonical resource collections are read-only and never become writable through the allowlist", async () => {
  let calls = 0;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => { calls += 1; return new Response(JSON.stringify({ fields: {} }), { status: 200 }); },
  });
  await client.getDocument("programs", "program-a");
  await client.getDocument("learningStructures", "structure-a");
  await client.getDocument("learningSites", "site-a");
  assert.equal(calls, 3);
  await assert.rejects(() => client.createDocument("learningStructures", "structure-b", { name: "X" }), /collection_not_allowed/);
  await assert.rejects(() => client.updateDocument("programs", "program-a", { name: "Y" }), /collection_not_allowed/);
  assert.equal(calls, 3);
});

test("staff access is read-only and audit logs are append-only", async () => {
  let calls = 0;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => { calls += 1; return new Response(JSON.stringify({ fields: {} }), { status: 200 }); },
  });
  await client.getDocument("staffAccess", "staff-a");
  await assert.rejects(() => client.createDocument("staffAccess", "staff-b", { active: true }), /collection_not_allowed/);
  await assert.rejects(() => client.updateDocument("staffAccess", "staff-a", { active: false }), /collection_not_allowed/);
  await client.createDocument("learningAuditLogs", "event-a", { action: "registration.review" });
  await assert.rejects(() => client.updateDocument("learningAuditLogs", "event-a", { action: "changed" }), /collection_not_allowed/);
  assert.equal(calls, 2);
});
