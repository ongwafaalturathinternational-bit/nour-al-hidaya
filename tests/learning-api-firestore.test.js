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

test("Firestore assignment, idempotency receipt and audit writes commit atomically with preconditions", async () => {
  let request;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ commitTime: "2026-11-22T12:00:00Z" }), { status: 200 });
    },
  });
  await client.commitDocuments([
    { operation: "update", collection: "learningStaffAssignments", id: "staff-1",
      precondition: { updateTime: "2026-11-22T11:00:00Z" }, fields: { version: 2, active: true } },
    { operation: "create", collection: "learningAssignmentReceipts", id: "receipt-1",
      precondition: { exists: false }, fields: { requestHash: "hash", resultVersion: 2 } },
    { operation: "create", collection: "learningAuditLogs", id: "event-1",
      precondition: { exists: false }, fields: { action: "assignment.update", targetId: "staff-1" } },
  ]);
  assert.match(request.url, /projects\/wat-connect-staging\/databases\/\(default\)\/documents:commit$/);
  assert.equal(request.init.method, "POST");
  const writes = JSON.parse(request.init.body).writes;
  assert.equal(writes.length, 3);
  assert.deepEqual(writes[0].currentDocument, { updateTime: "2026-11-22T11:00:00Z" });
  assert.deepEqual(writes[1].currentDocument, { exists: false });
  assert.equal(writes[2].update.name, "projects/wat-connect-staging/databases/(default)/documents/learningAuditLogs/event-1");
});

test("registration reads and writes share the same staging transaction and denied work rolls back", async () => {
  const calls=[];
  const client=createFirestoreRestClient(config,{
    getAccessToken:async()=>token,
    fetch:async(url,init)=>{
      calls.push({url,body:init.body?JSON.parse(init.body):null});
      return new Response(url.endsWith(":beginTransaction")?'{"transaction":"dHg="}':"{}",{status:200});
    }
  });
  await client.runRegistrationTransaction(async firestore=>{
    await firestore.getDocument("learningGroups","group-1");
    await firestore.commitDocuments(["learningEnrollments","learningRegistrationReceipts","learningAuditLogs"].map(collection=>({
      collection,id:"test-1",operation:"create",fields:{status:"pending"},precondition:{exists:false}
    })));
  });
  assert.match(calls[0].url,/documents:beginTransaction$/);
  assert.equal(new URL(calls[1].url).searchParams.get("transaction"),"dHg=");
  assert.match(calls[2].url,/documents:commit$/);
  assert.equal(calls[2].body.transaction,"dHg=");
  assert.equal(calls.length,3);
  await client.runRegistrationTransaction(async()=>({ok:false,status:403}));
  assert.match(calls[4].url,/documents:rollback$/);
  assert.deepEqual(calls[4].body,{transaction:"dHg="});
});

test("the registration commit requires all three create-only writes in staging", async () => {
  let request;
  const client = createFirestoreRestClient(config, {
    getAccessToken:async()=>token,
    fetch:async(url,init)=>{
      request={url,init};
      return new Response("{}",{status:200});
    }
  });
  const writes=["learningEnrollments","learningRegistrationReceipts","learningAuditLogs"].map(collection=>({
    collection,id:"test-1",operation:"create",fields:{status:"pending"},precondition:{exists:false}
  }));
  await assert.rejects(()=>client.commitDocuments(writes.slice(0,2)),/registration_commit_invalid/);
  await assert.rejects(()=>client.commitDocuments([{...writes[0],operation:"update"},...writes.slice(1)]),/registration_commit_invalid/);
  assert.equal(request,undefined);
  await client.commitDocuments(writes);
  assert.match(request.url,/projects\/wat-connect-staging\/databases\/\(default\)\/documents:commit$/);
  const batch=JSON.parse(request.init.body).writes;
  assert.equal(batch.length,3);
  assert.ok(batch.every(write=>write.currentDocument.exists===false));
});

test("Firestore atomic commit refuses audit mutation, missing preconditions and unrelated collections", async () => {
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => { throw new Error("network must not be called"); },
  });
  await assert.rejects(() => client.commitDocuments([
    { operation: "update", collection: "learningAuditLogs", id: "event-1",
      precondition: { updateTime: "2026-11-22T11:00:00Z" }, fields: { outcome: "failed" } },
    { operation: "create", collection: "learningAssignmentReceipts", id: "receipt-1",
      precondition: { exists: false }, fields: { requestHash: "hash" } },
  ]), /audit_append_only/);
  await assert.rejects(() => client.commitDocuments([
    { operation: "update", collection: "learningStaffAssignments", id: "staff-1",
      precondition: {}, fields: { version: 2 } },
    { operation: "create", collection: "learningAssignmentReceipts", id: "receipt-1",
      precondition: { exists: false }, fields: { requestHash: "hash" } },
  ]), /precondition_invalid/);
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


test("Firestore atomic commit requires operation-matched preconditions", async () => {
  let calls = 0;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => { calls += 1; return new Response("{}", { status: 200 }); },
  });
  const update = { operation: "update", collection: "learningStaffAssignments", id: "staff-1", fields: { active: true } };
  const create = { operation: "create", collection: "learningAssignmentReceipts", id: "receipt-1", fields: { requestHash: "hash" } };

  await assert.rejects(() => client.commitDocuments([
    { ...update, precondition: { exists: false } },
    { ...create, precondition: { exists: false } },
  ]), /precondition_invalid/);
  await assert.rejects(() => client.commitDocuments([
    { ...update, precondition: { updateTime: "2026-11-22T11:00:00Z", exists: false } },
    { ...create, precondition: { exists: false } },
  ]), /precondition_invalid/);
  await assert.rejects(() => client.commitDocuments([
    { ...update, precondition: { updateTime: "2026-11-22T11:00:00Z" } },
    { ...create, precondition: { updateTime: "2026-11-22T11:00:00Z" } },
  ]), /precondition_invalid/);
  assert.equal(calls, 0);
});

test("Firestore atomic commit rejects duplicate document targets before network access", async () => {
  let calls = 0;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => { calls += 1; return new Response("{}", { status: 200 }); },
  });
  await assert.rejects(() => client.commitDocuments([
    { operation: "create", collection: "learningAssignmentReceipts", id: "same-target",
      precondition: { exists: false }, fields: { requestHash: "one" } },
    { operation: "create", collection: "learningAssignmentReceipts", id: "same-target",
      precondition: { exists: false }, fields: { requestHash: "two" } },
  ]), /duplicate_target/);
  assert.equal(calls, 0);
});


test("idempotency receipts are append-only and cannot be updated", async () => {
  let calls = 0;
  const client = createFirestoreRestClient(config, {
    getAccessToken: async () => token,
    fetch: async () => { calls += 1; return new Response("{}", { status: 200 }); },
  });
  await assert.rejects(() => client.updateDocument("learningAssignmentReceipts", "receipt-a", {
    requestHash: "replacement-hash",
  }), /collection_not_allowed/);
  await assert.rejects(() => client.updateDocument("syncReceipts", "receipt-b", {
    status: "replayed",
  }), /collection_not_allowed/);
  await assert.rejects(() => client.commitDocuments([
    { operation: "update", collection: "learningAssignmentReceipts", id: "receipt-a",
      precondition: { updateTime: "2026-11-22T11:00:00Z" }, fields: { requestHash: "replacement-hash" } },
    { operation: "create", collection: "learningAuditLogs", id: "event-a",
      precondition: { exists: false }, fields: { action: "receipt.update" } },
  ]), /receipt_append_only/);
  assert.equal(calls, 0);
});
