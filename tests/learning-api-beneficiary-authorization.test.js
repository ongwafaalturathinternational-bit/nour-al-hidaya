import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveLearningBeneficiary, resolveLearningBeneficiaryPrivate,
} from "../workers/learning-api/src/learning-resource-resolver.js";
import {
  authorizeLearningBeneficiary, authorizeLearningBeneficiaryPrivate,
} from "../workers/learning-api/src/learning-authorization.js";

const encode = (value) => {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
};
const doc = (value) => ({ fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) });
const records = {
  "learningBeneficiaries/beneficiary-a": { status: "active" },
  "learningBeneficiaryPrivate/beneficiary-a": { beneficiaryId: "beneficiary-a", status: "active", phone: "private" },
  "learningEnrollments/enrollment-a": {
    beneficiaryId: "beneficiary-a", programId: "program-a", structureId: "structure-a",
    siteId: "site-a", groupId: "group-a", periodId: "period-a", status: "active",
  },
  "learningGroups/group-a": {
    name: "Groupe A", status: "active", programId: "program-a",
    structureId: "structure-a", siteId: "site-a",
  },
  "learningStructures/structure-a": { name: "Mosquée A", type: "mosque", status: "active" },
  "learningSites/site-a": { name: "Site A", status: "active", structureIds: ["structure-a"] },
  "programs/program-a": { name: "Nour Al-Hidaya", status: "active" },
};
function firestore(overrides = {}) {
  const calls = [];
  return {
    calls,
    getDocument: async (collection, id) => {
      calls.push(collection + "/" + id);
      const value = overrides[collection + "/" + id] ?? records[collection + "/" + id];
      return value ? doc(value) : null;
    },
  };
}
const request = new Request("https://example.test", { headers: { authorization: "Bearer token-token-token-123456" } });
const baseAssignment = {
  assignmentId: "assignment-a", active: true,
  scopeGrants: ["learning.beneficiaries.read", "learning.beneficiaries.private.read"],
  structureIds: ["structure-a"], siteIds: ["site-a"], groupIds: ["group-a"], programIds: ["program-a"],
  validFrom: "2026-01-01T00:00:00Z", validUntil: null,
};
function authDeps(scope, overrides = {}) {
  const db = firestore(overrides.records);
  return {
    ...overrides,
    firestore: db,
    authorizeStaff: async () => ({ ok: true, principal: { uid: "staff-a", role: "formateur", scopes: [scope] } }),
    resolveBeneficiary: overrides.resolveBeneficiary,
    resolveBeneficiaryPrivate: overrides.resolveBeneficiaryPrivate,
    now: new Date("2026-11-22T12:00:00Z"),
  };
}

test("resolves beneficiary only when active enrollment links the same beneficiary", async () => {
  const db = firestore();
  const result = await resolveLearningBeneficiary(db, "beneficiary-a", "enrollment-a");
  assert.equal(result.beneficiaryId, "beneficiary-a");
  assert.equal(result.structureId, "structure-a");
  assert.equal("phone" in result, false);
  await assert.rejects(
    () => resolveLearningBeneficiary(firestore({
      "learningEnrollments/enrollment-a": { ...records["learningEnrollments/enrollment-a"], beneficiaryId: "beneficiary-b" },
    }), "beneficiary-a", "enrollment-a"),
    /beneficiary_enrollment_mismatch/,
  );
});

test("rejects missing, inactive and malformed beneficiary records", async () => {
  await assert.rejects(() => resolveLearningBeneficiary(firestore({
    "learningBeneficiaries/beneficiary-a": { status: "inactive" },
  }), "beneficiary-a", "enrollment-a"));
  await assert.rejects(() => resolveLearningBeneficiary(firestore({
    "learningBeneficiaries/beneficiary-a": { status: "invalid" },
  }), "beneficiary-a", "enrollment-a"));
  await assert.rejects(() => resolveLearningBeneficiary(firestore(), "../bad", "enrollment-a"));
});

test("private resolver requires a matching active private record", async () => {
  const result = await resolveLearningBeneficiaryPrivate(firestore(), "beneficiary-a", "enrollment-a");
  assert.equal(result.privateRecordId, "beneficiary-a");
  assert.equal("phone" in result, false);
  await assert.rejects(() => resolveLearningBeneficiaryPrivate(firestore({
    "learningBeneficiaryPrivate/beneficiary-a": { beneficiaryId: "beneficiary-b", status: "active" },
  }), "beneficiary-a", "enrollment-a"));
  await assert.rejects(() => resolveLearningBeneficiaryPrivate(firestore({
    "learningBeneficiaryPrivate/beneficiary-a": { beneficiaryId: "beneficiary-a", status: "inactive" },
  }), "beneficiary-a", "enrollment-a"));
});

test("authorizes dossier access only with matching enrollment perimeter and explicit scope", async () => {
  const deps = authDeps("learning.beneficiaries.read", {
    resolveBeneficiary: async () => ({
      beneficiaryId: "beneficiary-a", enrollmentId: "enrollment-a",
      structureId: "structure-a", siteId: "site-a", groupId: "group-a", programId: "program-a",
    }),
  });
  deps.firestore.getDocument = async (collection, id) => {
    if (collection === "learningStaffAssignments") return doc({ active: true, assignments: [baseAssignment] });
    return null;
  };
  const allowed = await authorizeLearningBeneficiary(request, {}, "learning.beneficiaries.read",
    "beneficiary-a", "enrollment-a", deps);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.resourceKind, "beneficiary");
  const mismatch = await authorizeLearningBeneficiary(request, {}, "learning.beneficiaries.read",
    "beneficiary-b", "enrollment-a", {
      ...deps, resolveBeneficiary: async () => ({ beneficiaryId: "beneficiary-a", enrollmentId: "enrollment-a" }),
    });
  assert.equal(mismatch.ok, false);
});

test("private dossier requires the distinct private scope and assignment grant", async () => {
  const deps = authDeps("learning.beneficiaries.private.read", {
    resolveBeneficiaryPrivate: async () => ({
      beneficiaryId: "beneficiary-a", privateRecordId: "beneficiary-a", enrollmentId: "enrollment-a",
      structureId: "structure-a", siteId: "site-a", groupId: "group-a", programId: "program-a",
    }),
  });
  deps.firestore.getDocument = async (collection) => collection === "learningStaffAssignments"
    ? doc({ active: true, assignments: [baseAssignment] }) : null;
  const allowed = await authorizeLearningBeneficiaryPrivate(request, {}, "beneficiary-a", "enrollment-a", deps);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.resourceKind, "beneficiary-private");
  const denied = await authorizeLearningBeneficiaryPrivate(request, {}, "beneficiary-a", "enrollment-a", {
    ...deps,
    firestore: { getDocument: async () => doc({ active: true, assignments: [{
      ...baseAssignment, scopeGrants: ["learning.beneficiaries.read"],
    }] }) },
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "learning_assignment_scope_denied");
});


test("does not load private beneficiary document before assignment authorization", async () => {
  let privateReads = 0;
  const deps = authDeps("learning.beneficiaries.private.read", {
    resolveBeneficiary: async () => ({
      beneficiaryId: "beneficiary-a", enrollmentId: "enrollment-a",
      structureId: "structure-a", siteId: "site-a", groupId: "group-a", programId: "program-a",
    }),
    resolveBeneficiaryPrivate: async () => {
      privateReads += 1;
      throw new Error("private_read_should_not_happen");
    },
  });
  deps.firestore.getDocument = async (collection) => collection === "learningStaffAssignments"
    ? doc({ active: true, assignments: [{
      ...baseAssignment, scopeGrants: ["learning.beneficiaries.read"],
    }] }) : null;
  const denied = await authorizeLearningBeneficiaryPrivate(request, {}, "beneficiary-a", "enrollment-a", deps);
  assert.equal(denied.ok, false);
  assert.equal(privateReads, 0);
});
