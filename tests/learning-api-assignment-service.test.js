import test from "node:test";
import assert from "node:assert/strict";
import {
  createLearningStaffAssignment, updateLearningStaffAssignment, revokeLearningStaffAssignment,
} from "../workers/learning-api/src/learning-assignment-service.js";

const config = { environment: "staging", firebaseProjectId: "wat-connect-staging" };
const now = new Date("2026-11-22T12:00:00.000Z");
const encode = (value) => {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
};
const doc = (fields, updateTime = undefined) => ({
  fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encode(value)])),
  ...(updateTime ? { updateTime } : {}),
});

function fixture({ commitFailure = false } = {}) {
  const records = new Map([
    ["staffAccess:staff-target", doc({ active: true, scopes: ["learning.groups.read"] })],
    ["learningGroups:group-a", doc({ name: "Test Group", status: "active", structureId: "structure-a", programId: "program-a" })],
    ["learningStructures:structure-a", doc({ name: "Test Structure", type: "mosque", status: "active" })],
    ["programs:program-a", doc({ name: "Test Program", status: "active" })],
  ]);
  let sequence = 0;
  let tail = Promise.resolve();
  const firestore = {
    getDocument: async (collection, id) => {
      const value = records.get(collection + ":" + id);
      if (!value) throw new Error("firestore_document_not_found");
      return structuredClone(value);
    },
    commitDocuments: async (writes) => {
      let release;
      const previous = tail;
      tail = new Promise((resolve) => { release = resolve; });
      await previous;
      try {
        if (commitFailure) throw new Error("storage unavailable");
        for (const write of writes) {
          const current = records.get(write.collection + ":" + write.id);
          if (write.precondition.exists === false && current) throw new Error("firestore_document_conflict");
          if (write.precondition.updateTime && current?.updateTime !== write.precondition.updateTime) {
            throw new Error("firestore_document_conflict");
          }
        }
        for (const write of writes) {
          sequence += 1;
          const value = doc(write.fields, "test-update-" + sequence);
          records.set(write.collection + ":" + write.id, value);
        }
        return {};
      } finally { release(); }
    },
  };
  const options = {
    firestore, now,
    authorizeStaff: async (_request, _config, scope) => ({
      ok: true, scope, principal: { uid: "staff-admin", scopes: [scope] },
    }),
    lookupAuthUser: async (uid) => ({ uid, disabled: false, emailVerified: true, validSince: 1 }),
  };
  return { firestore, options, records };
}
const request = new Request("https://example.test/internal-assignment", { method: "POST" });
const grantInput = (requestId = "request-1") => ({
  requestId, targetUid: "staff-target", reason: "Annual teaching mandate",
  assignment: {
    scopeGrants: ["learning.groups.read"],
    structureIds: ["structure-a"], groupIds: ["group-a"], programIds: ["program-a"],
    validFrom: null, validUntil: null,
  },
});

test("grant writes registry, idempotency receipt and audit event in one atomic commit", async () => {
  const f = fixture();
  const result = await createLearningStaffAssignment(request, config, grantInput(), f.options);
  assert.equal(result.ok, true);
  assert.equal(result.assignmentVersion, 1);
  assert.equal(result.registryVersion, 1);
  const registry = f.records.get("learningStaffAssignments:staff-target");
  const receipt = [...f.records.entries()].find(([key]) => key.startsWith("learningAssignmentReceipts:"));
  const audit = [...f.records.entries()].find(([key]) => key.startsWith("learningAuditLogs:"));
  assert.ok(registry && receipt && audit);
  assert.equal(audit[1].fields.action.stringValue, "assignment.grant");
  assert.equal(audit[1].fields.targetId.stringValue, "staff-target");
  assert.equal(audit[1].fields.reason.stringValue, grantInput().reason);
  assert.equal(audit[1].fields.requestId.stringValue, grantInput().requestId);
});

test("same request replays its receipt, while reusing the request ID with changed content conflicts", async () => {
  const f = fixture();
  const input = grantInput();
  const first = await createLearningStaffAssignment(request, config, input, f.options);
  const replay = await createLearningStaffAssignment(request, config, input, f.options);
  assert.equal(replay.replayed, true);
  assert.equal(replay.assignmentId, first.assignmentId);
  assert.equal([...f.records.keys()].filter((key) => key.startsWith("learningAuditLogs:")).length, 1);
  const changed = await createLearningStaffAssignment(request, config, {
    ...input, reason: "Different mandate justification",
  }, f.options);
  assert.deepEqual(changed, { ok: false, status: 409, error: "assignment_request_id_reused" });
  assert.equal([...f.records.keys()].filter((key) => key.startsWith("learningAuditLogs:")).length, 1);
});

test("concurrent identical grant retries converge on one receipt and one audit event", async () => {
  const f = fixture();
  const input = grantInput("concurrent-idempotent-grant");
  const results = await Promise.all([
    createLearningStaffAssignment(request, config, input, f.options),
    createLearningStaffAssignment(request, config, input, f.options),
  ]);
  assert.equal(results.every((result) => result.ok), true);
  assert.equal(results.filter((result) => result.replayed === true).length, 1);
  assert.equal(results.filter((result) => result.replayed === false).length, 1);
  assert.equal(results[0].assignmentId, results[1].assignmentId);
  assert.equal([...f.records.keys()].filter((key) => key.startsWith("learningAssignmentReceipts:")).length, 1);
  assert.equal([...f.records.keys()].filter((key) => key.startsWith("learningAuditLogs:")).length, 1);
  assert.equal(f.records.get("learningStaffAssignments:staff-target").fields.version.integerValue, "1");
});

test("update and revoke replays bind patch, expected version and reason without duplicate audit", async () => {
  const f = fixture();
  const created = await createLearningStaffAssignment(request, config, grantInput(), f.options);
  const updateInput = {
    requestId: "request-update-idempotent", targetUid: "staff-target", assignmentId: created.assignmentId,
    expectedVersion: 1, reason: "Update mandate details",
    patch: { scopeGrants: ["learning.groups.read", "learning.groups.manage"] },
  };
  const updated = await updateLearningStaffAssignment(request, config, updateInput, f.options);
  const updateReplay = await updateLearningStaffAssignment(request, config, updateInput, f.options);
  assert.equal(updateReplay.replayed, true);
  assert.deepEqual(await updateLearningStaffAssignment(request, config, {
    ...updateInput, patch: { scopeGrants: ["learning.groups.read"] },
  }, f.options), { ok: false, status: 409, error: "assignment_request_id_reused" });
  assert.equal([...f.records.keys()].filter((key) => key.startsWith("learningAuditLogs:")).length, 2);

  const revokeInput = {
    requestId: "request-revoke-idempotent", targetUid: "staff-target", assignmentId: created.assignmentId,
    expectedVersion: updated.assignmentVersion, reason: "Close teaching mandate",
  };
  const revoked = await revokeLearningStaffAssignment(request, config, revokeInput, f.options);
  const revokeReplay = await revokeLearningStaffAssignment(request, config, revokeInput, f.options);
  assert.equal(revokeReplay.replayed, true);
  assert.deepEqual(await revokeLearningStaffAssignment(request, config, {
    ...revokeInput, expectedVersion: revokeInput.expectedVersion + 1,
  }, f.options), { ok: false, status: 409, error: "assignment_request_id_reused" });
  assert.deepEqual(await revokeLearningStaffAssignment(request, config, {
    ...revokeInput, reason: "Different revocation reason",
  }, f.options), { ok: false, status: 409, error: "assignment_request_id_reused" });
  assert.equal(revoked.assignmentVersion, 3);
  assert.equal([...f.records.keys()].filter((key) => key.startsWith("learningAuditLogs:")).length, 3);
});

test("update uses expected assignment version and revoke is a versioned soft revocation", async () => {
  const f = fixture();
  const created = await createLearningStaffAssignment(request, config, grantInput(), f.options);
  const updated = await updateLearningStaffAssignment(request, config, {
    requestId: "request-update", targetUid: "staff-target", assignmentId: created.assignmentId,
    expectedVersion: 1, reason: "Role responsibilities updated",
    patch: { scopeGrants: ["learning.groups.read", "learning.groups.manage"] },
  }, f.options);
  assert.equal(updated.assignmentVersion, 2);
  const revoked = await revokeLearningStaffAssignment(request, config, {
    requestId: "request-revoke", targetUid: "staff-target", assignmentId: created.assignmentId,
    expectedVersion: 2, reason: "End of teaching mandate",
  }, f.options);
  assert.equal(revoked.assignmentVersion, 3);
  const events = [...f.records.entries()].filter(([key]) => key.startsWith("learningAuditLogs:")).map(([, value]) => value);
  assert.equal(events.find((event) => event.fields.action.stringValue === "assignment.update").fields.reason.stringValue, "Role responsibilities updated");
  assert.equal(events.find((event) => event.fields.action.stringValue === "assignment.update").fields.requestId.stringValue, "request-update");
  assert.equal(events.find((event) => event.fields.action.stringValue === "assignment.revoke").fields.reason.stringValue, "End of teaching mandate");
  assert.equal(events.find((event) => event.fields.action.stringValue === "assignment.revoke").fields.requestId.stringValue, "request-revoke");
  const registry = f.records.get("learningStaffAssignments:staff-target");
  assert.equal(registry.fields.assignments.arrayValue.values[0].mapValue.fields.active.booleanValue, false);
  assert.equal(registry.fields.assignments.arrayValue.values[0].mapValue.fields.revokedBy.stringValue, "staff-admin");
  const stale = await updateLearningStaffAssignment(request, config, {
    requestId: "request-stale", targetUid: "staff-target", assignmentId: created.assignmentId,
    expectedVersion: 2, reason: "Stale update requested",
    patch: { scopeGrants: ["learning.groups.read"] },
  }, f.options);
  assert.deepEqual(stale, { ok: false, status: 409, error: "assignment_version_conflict" });
});

test("concurrent updates with one expected version allow only one commit and one audit", async () => {
  const f = fixture();
  const created = await createLearningStaffAssignment(request, config, grantInput(), f.options);
  const mutate = (requestId, scope) => updateLearningStaffAssignment(request, config, {
    requestId, targetUid: "staff-target", assignmentId: created.assignmentId,
    expectedVersion: 1, reason: "Concurrent change requested",
    patch: { scopeGrants: [scope] },
  }, f.options);
  const results = await Promise.all([
    mutate("concurrent-a", "learning.groups.read"),
    mutate("concurrent-b", "learning.groups.manage"),
  ]);
  assert.equal(results.filter((value) => value.ok).length, 1);
  assert.equal(results.filter((value) => value.status === 409).length, 1);
  assert.equal([...f.records.keys()].filter((key) => key.startsWith("learningAuditLogs:")).length, 2);
});

test("failed atomic write leaves no assignment, receipt or audit record", async () => {
  const f = fixture({ commitFailure: true });
  const result = await createLearningStaffAssignment(request, config, grantInput(), f.options);
  assert.equal(result.status, 503);
  assert.equal([...f.records.keys()].some((key) => /^(learningStaffAssignments|learningAssignmentReceipts|learningAuditLogs):/.test(key)), false);
});

test("grant refuses inactive target accounts, unapproved scopes and out-of-perimeter references", async () => {
  const f = fixture();
  f.options.lookupAuthUser = async (uid) => ({ uid, disabled: true, emailVerified: true, validSince: 1 });
  const inactive = await createLearningStaffAssignment(request, config, grantInput(), f.options);
  assert.equal(inactive.error, "assignment_target_auth_inactive");
  f.options.lookupAuthUser = async (uid) => ({ uid, disabled: false, emailVerified: true, validSince: 1 });
  const elevated = await createLearningStaffAssignment(request, config, {
    ...grantInput("request-elevate"),
    assignment: { ...grantInput().assignment, scopeGrants: ["learning.staffAssignments.manage"] },
  }, f.options);
  assert.equal(elevated.error, "assignment_scope_invalid");
  const wrong = await createLearningStaffAssignment(request, config, {
    ...grantInput("request-wrong"), assignment: { ...grantInput().assignment, structureIds: ["structure-b"] },
  }, f.options);
  assert.equal(wrong.error, "assignment_perimeter_inconsistent");
});

test("assignment management rejects a caller without its exact WAT scope and prevents self-change", async () => {
  const f = fixture();
  f.options.authorizeStaff = async () => ({
    ok: true, principal: { uid: "staff-admin", scopes: ["learning.groups.manage"] },
  });
  const denied = await createLearningStaffAssignment(request, config, grantInput("no-admin-scope"), f.options);
  assert.equal(denied.error, "assignment_admin_denied");

  f.options.authorizeStaff = async (_request, _config, scope) => ({
    ok: true, scope, principal: { uid: "staff-target", scopes: [scope] },
  });
  const self = await createLearningStaffAssignment(request, config, grantInput("self-change"), f.options);
  assert.equal(self.error, "assignment_self_change_forbidden");
  assert.equal([...f.records.keys()].some((key) => key.startsWith("learningAuditLogs:")), false);
});

test("grant rejects client-supplied server-owned assignment fields and inactive WAT targets", async () => {
  const f = fixture();
  const forged = await createLearningStaffAssignment(request, config, {
    ...grantInput("forged-fields"),
    assignment: { ...grantInput().assignment, active: false, version: 99, createdBy: "attacker" },
  }, f.options);
  assert.equal(forged.error, "assignment_scope_invalid");

  f.records.set("staffAccess:staff-target", doc({ active: false, scopes: ["learning.groups.read"] }));
  const inactive = await createLearningStaffAssignment(request, config, grantInput("inactive-wat"), f.options);
  assert.equal(inactive.error, "assignment_target_staff_inactive");
});

test("grant rejects impossible calendar dates while accepting leap-day validity", async () => {
  const invalidFixture = fixture();
  const invalid = await createLearningStaffAssignment(request, config, {
    ...grantInput("invalid-calendar-date"),
    assignment: { ...grantInput().assignment, validFrom: "2026-02-30T00:00:00Z" },
  }, invalidFixture.options);
  assert.deepEqual(invalid, { ok: false, status: 400, error: "assignment_dates_invalid" });
  assert.equal([...invalidFixture.records.keys()].some((key) =>
    key.startsWith("learningAuditLogs:") || key.startsWith("learningAssignmentReceipts:")), false);

  const leapFixture = fixture();
  const valid = await createLearningStaffAssignment(request, config, {
    ...grantInput("valid-leap-day"),
    assignment: { ...grantInput().assignment, validFrom: "2028-02-29T00:00:00Z" },
  }, leapFixture.options);
  assert.equal(valid.ok, true);
});
