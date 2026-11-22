import test from "node:test";
import assert from "node:assert/strict";
import { authorizeLearningGroup } from "../workers/learning-api/src/learning-authorization.js";

const principal = { uid: "staff-1", role: "formateur", scopes: ["learning.beneficiaries.read"] };
const assignment = {
  assignmentId: "assign-1", active: true,
  siteIds: ["site-a"], structureIds: ["structure-a"], groupIds: ["group-a"], programIds: ["program-a"],
  scopeGrants: ["learning.beneficiaries.read"],
  validFrom: "2026-11-01T00:00:00Z", validUntil: null,
};
const encode = (value) => {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
};
const assignmentDocument = { fields: {
  active: encode(true),
  assignments: encode([assignment]),
} };
const groupDocument = { fields: {
  siteId: encode("site-a"),
  structureId: encode("structure-a"),
  programId: encode("program-a"),
} };
const request = new Request("https://example.test", { headers: { authorization: "Bearer token" } });
function setup({ staff = { ok: true, principal }, group = groupDocument, assignments = assignmentDocument, errorCollection = null } = {}) {
  const calls = [];
  return {
    calls,
    authorizeStaff: async () => staff,
    firestore: { getDocument: async (collection, uid) => {
      calls.push(collection);
      if (errorCollection === collection) throw new Error("offline");
      if (collection === "staffAccess") return { fields: {} };
      if (collection === "learningGroups" && uid === "group-a") return group;
      if (collection === "learningStaffAssignments" && uid === principal.uid) return assignments;
      return null;
    } },
    now: new Date("2026-11-22T12:00:00Z"),
  };
}

test("authorizes only after resolving group perimeter from Firestore", async () => {
  const deps = setup();
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a", deps);
  assert.equal(result.ok, true);
  assert.equal(result.assignmentId, "assign-1");
  assert.deepEqual(result.resource, { groupId: "group-a", siteId: "site-a", mosqueId: "mosque-a", programId: "program-a" });
  assert.deepEqual(deps.calls, ["learningGroups", "learningStaffAssignments"]);
});

test("does not bypass failed staff authorization", async () => {
  const deps = setup({ staff: { ok: false, status: 403, error: "staff_scope_denied" } });
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a", deps);
  assert.equal(result.error, "staff_scope_denied");
  assert.deepEqual(deps.calls, []);
});

test("fails closed when resource or assignment registry is unavailable", async () => {
  const noGroup = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ errorCollection: "learningGroups" }));
  assert.equal(noGroup.error, "learning_resource_unavailable");
  const noAssignments = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ errorCollection: "learningStaffAssignments" }));
  assert.equal(noAssignments.error, "learning_assignment_unavailable");
});

test("denies cross-site and cross-group resource access", async () => {
  const otherSite = { fields: { siteId: encode("site-b"), structureId: encode("structure-a"), programId: encode("program-a") } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a", setup({ group: otherSite }));
  assert.equal(result.error, "learning_assignment_scope_denied");
});

test("denies private-data scope without a matching explicit assignment grant", async () => {
  const result = await authorizeLearningGroup(request, {}, "learning.private.read", "group-a",
    setup({ staff: { ok: true, principal: { ...principal, scopes: ["learning.private.read"] } } }));
  assert.equal(result.error, "learning_assignment_scope_denied");
});

test("rejects malformed group perimeter instead of trusting request data", async () => {
  const malformed = { fields: { siteId: encode("site-a"), structureId: encode("*"), programId: encode("program-a") } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a", setup({ group: malformed }));
  assert.equal(result.error, "learning_resource_unavailable");
});

test("uses the same trusted Firestore client for staff, group and assignment records", async () => {
  const calls = [];
  const firestore = {
    getDocument: async (collection, id) => {
      calls.push(collection);
      if (collection === "staffAccess") return { fields: {
        active: { booleanValue: true },
        role: { stringValue: "formateur" },
        scopes: { arrayValue: { values: [{ stringValue: "learning.beneficiaries.read" }] } },
      } };
      if (collection === "learningGroups" && id === "group-a") return groupDocument;
      if (collection === "learningStaffAssignments" && id === principal.uid) return assignmentDocument;
      return null;
    },
  };
  const result = await authorizeLearningGroup(request, { firebaseProjectId: "wat-connect-staging" },
    "learning.beneficiaries.read", "group-a", {
      firestore,
      verifyToken: async () => ({ uid: principal.uid, emailVerified: true }),
      now: new Date("2026-11-22T12:00:00Z"),
    });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["staffAccess", "learningGroups", "learningStaffAssignments"]);
});


test("selects the matching assignment from a multi-assignment staff record", async () => {
  const otherAssignment = {
    ...assignment,
    assignmentId: "assign-other",
    groupIds: ["group-b"],
  };
  const matchingAssignment = { ...assignment, assignmentId: "assign-matching" };
  const multiple = { fields: {
    active: encode(true),
    assignments: encode([otherAssignment, matchingAssignment]),
  } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ assignments: multiple }));
  assert.equal(result.ok, true);
  assert.equal(result.assignmentId, "assign-matching");
});

test("denies all assignments when the staff assignment registry is inactive", async () => {
  const inactive = { fields: {
    active: encode(false),
    assignments: encode([assignment]),
  } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ assignments: inactive }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_assignment_inactive");
});


test("skips a malformed assignment and selects a later valid assignment", async () => {
  const malformed = { ...assignment, assignmentId: "../invalid" };
  const valid = { ...assignment, assignmentId: "assign-valid-later" };
  const multiple = { fields: { active: encode(true), assignments: encode([malformed, valid]) } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ assignments: multiple }));
  assert.equal(result.ok, true);
  assert.equal(result.assignmentId, "assign-valid-later");
});

test("denies a non-array assignment register", async () => {
  const malformed = { fields: { active: encode(true), assignments: encode("not-an-array") } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ assignments: malformed }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_assignment_inactive");
});

test("does not accept a group without every currently required canonical link", async () => {
  const incomplete = { fields: { siteId: encode("site-a"), mosqueId: encode("mosque-a") } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ group: incomplete }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_resource_unavailable");
});
