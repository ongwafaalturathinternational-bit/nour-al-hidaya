import test from "node:test";
import assert from "node:assert/strict";
import { authorizeLearningGroup, authorizeLearningEnrollment } from "../workers/learning-api/src/learning-authorization.js";

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
  name: encode("Groupe A"), status: encode("active"),
  siteId: encode("site-a"), structureId: encode("structure-a"), programId: encode("program-a"),
} };
const request = new Request("https://example.test", { headers: { authorization: "Bearer token-token-token-123456" } });
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
      if (collection === "learningStructures" && uid === "structure-a") return { fields: {
        name: encode("Mosquée centrale"), type: encode("mosque"), status: encode("active"),
      } };
      if (collection === "learningSites" && ["site-a", "site-b"].includes(uid)) return { fields: {
        name: encode("Secteur"), status: encode("active"), structureIds: encode(["structure-a"]),
      } };
      if (collection === "programs" && uid === "program-a") return { fields: { name: encode("Nour Al-Hidaya"), status: encode("active") } };
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
  assert.deepEqual(result.resource, {
    groupId: "group-a", groupName: "Groupe A", groupStatus: "active",
    structureId: "structure-a", structureType: "mosque", programId: "program-a", siteId: "site-a",
  });
  assert.deepEqual(deps.calls, [
    "learningGroups", "learningStructures", "programs", "learningSites", "learningStaffAssignments",
  ]);
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
  const otherSite = { fields: {
    name: encode("Groupe A"), status: encode("active"),
    siteId: encode("site-b"), structureId: encode("structure-a"), programId: encode("program-a"),
  } };
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
      if (collection === "learningStructures" && id === "structure-a") return { fields: {
        name: encode("Mosquée centrale"), type: encode("mosque"), status: encode("active"),
      } };
      if (collection === "learningSites" && id === "site-a") return { fields: {
        name: encode("Secteur Sud"), status: encode("active"), structureIds: encode(["structure-a"]),
      } };
      if (collection === "programs" && id === "program-a") return { fields: { name: encode("Nour Al-Hidaya"), status: encode("active") } };
      if (collection === "learningStaffAssignments" && id === principal.uid) return assignmentDocument;
      return null;
    },
  };
  const result = await authorizeLearningGroup(request, { firebaseProjectId: "wat-connect-staging" },
    "learning.beneficiaries.read", "group-a", {
      firestore,
      verifyToken: async () => ({ uid: principal.uid, emailVerified: true, claims: { auth_time: 1_800_000_000 } }),
      lookupAuthUser: async (uid) => ({ uid, disabled: false, emailVerified: true, validSince: 1_700_000_000 }),
      now: new Date("2026-11-22T12:00:00Z"),
    });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    "staffAccess", "learningGroups", "learningStructures", "programs", "learningSites", "learningStaffAssignments",
  ]);
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


test("rejects a malformed assignment registry instead of partially trusting it", async () => {
  const malformed = { ...assignment, assignmentId: "../invalid" };
  const multiple = { fields: { active: encode(true), assignments: encode([malformed, assignment]) } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ assignments: multiple }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_assignment_invalid");
});

test("denies a non-array assignment register", async () => {
  const malformed = { fields: { active: encode(true), assignments: encode("not-an-array") } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ assignments: malformed }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_assignment_invalid");
});

test("rejects invalid assignment periods and duplicate grants even beside a valid assignment", async () => {
  for (const override of [
    {validFrom:"2026-02-30T00:00:00Z"},
    {validUntil:"2026-10-31T00:00:00Z"},
    {scopeGrants:["learning.beneficiaries.read","learning.beneficiaries.read"]}
  ]) {
    const invalid={...assignment,assignmentId:"invalid-assignment",...override};
    const assignments={fields:{active:encode(true),assignments:encode([assignment,invalid])}};
    const result=await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",setup({assignments}));
    assert.equal(result.ok,false);
    assert.equal(result.error,"learning_assignment_invalid");
  }
});

test("does not accept a group without every currently required canonical link", async () => {
  const incomplete = { fields: { siteId: encode("site-a"), mosqueId: encode("mosque-a") } };
  const result = await authorizeLearningGroup(request, {}, "learning.beneficiaries.read", "group-a",
    setup({ group: incomplete }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_resource_unavailable");
});


test("authorizes an enrollment only through canonical resolver output and matching assignment", async () => {
  const trustedEnrollment = Object.freeze({
    enrollmentId: "enrollment-a", beneficiaryId: "beneficiary-a",
    siteId: "site-a", structureId: "structure-a", groupId: "group-a",
    programId: "program-a", periodId: "period-2026", status: "active",
  });
  const deps = setup();
  const result = await authorizeLearningEnrollment(
    request, {}, "learning.beneficiaries.read", "enrollment-a",
    { ...deps, resolveEnrollment: async (_firestore, id) => {
      assert.equal(id, "enrollment-a");
      return trustedEnrollment;
    } },
  );
  assert.equal(result.ok, true);
  assert.equal(result.resourceKind, "enrollment");
  assert.equal(result.resource.enrollmentId, "enrollment-a");
  assert.equal(result.assignmentId, "assign-1");
});

test("denies enrollment authorization when canonical enrollment resolution fails", async () => {
  const deps = setup();
  const result = await authorizeLearningEnrollment(
    request, {}, "learning.beneficiaries.read", "enrollment-a",
    { ...deps, resolveEnrollment: async () => { throw new Error("enrollment_not_active"); } },
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, "learning_resource_unavailable");
});
