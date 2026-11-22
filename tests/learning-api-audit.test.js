import test from "node:test";
import assert from "node:assert/strict";
import { writeLearningAuditEvent } from "../workers/learning-api/src/learning-audit.js";

const authorization = {
  ok: true,
  principal: { uid: "staff-1", scopes: ["learning.beneficiaries.read", "learning.private.read"] },
  scope: "learning.private.read",
  assignmentId: "assign-1",
  resource: { siteId: "site-a", mosqueId: "mosque-a", groupId: "group-a", programId: "program-a" },
};
const now = new Date("2026-11-22T12:00:00Z");

test("writes a minimal server-generated audit event with exact scope and perimeter", async () => {
  let write;
  const result = await writeLearningAuditEvent({
    authorization, action: "beneficiary.private.read", targetType: "beneficiary", targetId: "beneficiary-1", outcome: "allowed", now,
    firestore: { createDocument: async (...args) => { write = args; return {}; } },
  });
  assert.equal(result.ok, true);
  assert.equal(write[0], "learningAuditLogs");
  assert.equal(write[1], result.eventId);
  assert.deepEqual(write[2], {
    actorUid: "staff-1",
    action: "beneficiary.private.read",
    targetType: "beneficiary",
    targetId: "beneficiary-1",
    scope: "learning.private.read",
    outcome: "allowed",
    occurredAt: now,
    assignmentId: "assign-1",
    siteId: "site-a",
    mosqueId: "mosque-a",
    groupId: "group-a",
    programId: "program-a",
  });
  assert.equal(Object.hasOwn(write[2], "name"), false);
  assert.equal(Object.hasOwn(write[2], "phone"), false);
});

test("does not write an event without successful authorization", async () => {
  let writes = 0;
  const result = await writeLearningAuditEvent({
    authorization: { ok: false }, action: "beneficiary.private.read",
    targetType: "beneficiary", targetId: "b-1", outcome: "allowed",
    firestore: { createDocument: async () => { writes += 1; } },
  });
  assert.equal(result.error, "learning_audit_authorization_required");
  assert.equal(writes, 0);
});

test("fails closed when audit storage is unavailable", async () => {
  const result = await writeLearningAuditEvent({
    authorization, action: "beneficiary.update", targetType: "beneficiary",
    targetId: "b-1", outcome: "completed", now,
    firestore: { createDocument: async () => { throw new Error("offline"); } },
  });
  assert.equal(result.error, "learning_audit_write_failed");
});

test("rejects unapproved actions, outcomes and malformed identifiers", async () => {
  const firestore = { createDocument: async () => ({}) };
  assert.equal((await writeLearningAuditEvent({
    authorization, action: "anything", targetType: "beneficiary", targetId: "b-1", outcome: "allowed", now, firestore,
  })).error, "learning_audit_event_invalid");
  assert.equal((await writeLearningAuditEvent({
    authorization, action: "beneficiary.update", targetType: "beneficiary", targetId: "../b", outcome: "allowed", now, firestore,
  })).error, "learning_audit_write_failed");
});
