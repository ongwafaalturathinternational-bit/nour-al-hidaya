import test from "node:test";
import assert from "node:assert/strict";
import {
  validateLearningStructure, validateLearningSite, validateLearningGroup,
  validateLearningEnrollment, validateLearningAssignmentRecord,
} from "../workers/learning-api/src/learning-schema.js";
import { resolveLearningGroup, resolveLearningEnrollment } from "../workers/learning-api/src/learning-resource-resolver.js";

const structure = { name: "Mosquée centrale", type: "mosque", status: "active" };
const site = { name: "Secteur Sud", status: "active", structureIds: ["structure-a"] };
const group = { name: "Groupe A", status: "active", programId: "program-a", structureId: "structure-a", siteId: "site-a" };
const enrollment = { beneficiaryId: "beneficiary-a", programId: "program-a", structureId: "structure-a", siteId: "site-a", groupId: "group-a", periodId: "period-2026", status: "active" };
const encode = (value) => {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
};
const doc = (value) => ({ fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) });
function db(overrides = {}) {
  const docs = {
    "learningGroups/group-a": group,
    "learningStructures/structure-a": structure,
    "learningSites/site-a": site,
    "programs/program-a": { name: "Nour Al-Hidaya", status: "active" },
    "programs/program-b": { name: "Other program", status: "active" },
    "learningEnrollments/enrollment-a": enrollment,
    ...overrides,
  };
  const calls = [];
  return {
    calls,
    getDocument: async (collection, id) => {
      calls.push(collection + "/" + id);
      const value = docs[collection + "/" + id];
      return value ? doc(value) : null;
    },
  };
}

test("validates the proposed canonical structure, site, group and enrollment contracts", () => {
  assert.deepEqual(validateLearningStructure(structure), { ok: true });
  assert.deepEqual(validateLearningSite(site), { ok: true });
  assert.deepEqual(validateLearningGroup(group), { ok: true });
  assert.deepEqual(validateLearningEnrollment(enrollment), { ok: true });
});

test("rejects malformed or incomplete canonical records", () => {
  assert.equal(validateLearningStructure({ ...structure, type: "unknown" }).ok, false);
  assert.equal(validateLearningSite({ ...site, structureIds: [] }).ok, false);
  assert.equal(validateLearningGroup({ ...group, programId: "*" }).ok, false);
  assert.equal(validateLearningEnrollment({ ...enrollment, status: "unknown" }).ok, false);
});

test("validates assignment registry and rejects duplicate or empty perimeter IDs", () => {
  const valid = { active: true, assignments: [{
    assignmentId: "assignment-a", active: true, scopeGrants: ["learning.groups.read"],
    structureIds: ["structure-a"], programIds: ["program-a"],
  }] };
  assert.equal(validateLearningAssignmentRecord(valid).ok, true);
  assert.equal(validateLearningAssignmentRecord({ ...valid, assignments: [valid.assignments[0], valid.assignments[0]] }).ok, false);
  assert.equal(validateLearningAssignmentRecord({ ...valid, assignments: [{ ...valid.assignments[0], structureIds: [] }] }).ok, false);
});

test("resolves group using trusted records and returns only canonical perimeter", async () => {
  const firestore = db();
  const result = await resolveLearningGroup(firestore, "group-a");
  assert.deepEqual(result, {
    groupId: "group-a", groupName: "Groupe A", groupStatus: "active",
    structureId: "structure-a", structureType: "mosque", programId: "program-a", siteId: "site-a",
  });
  assert.ok(firestore.calls.includes("learningStructures/structure-a"));
  assert.ok(firestore.calls.includes("programs/program-a"));
});

test("fails closed on inactive group, missing structure, missing program or invalid site link", async () => {
  await assert.rejects(() => resolveLearningGroup(db({ "learningGroups/group-a": { ...group, status: "closed" } }), "group-a"), /resource_inactive/);
  await assert.rejects(() => resolveLearningGroup(db({ "learningStructures/structure-a": undefined }), "group-a"), /resource_not_found/);
  await assert.rejects(() => resolveLearningGroup(db({ "programs/program-a": undefined }), "group-a"), /resource_not_found/);
  await assert.rejects(() => resolveLearningGroup(db({ "learningSites/site-a": { ...site, structureIds: ["structure-b"] } }), "group-a"), /resource_site_invalid/);
});

test("refuses client-controlled malformed identifiers before reading Firestore", async () => {
  const firestore = db();
  await assert.rejects(() => resolveLearningGroup(firestore, "../group-a"), /resource_reference_invalid/);
  assert.deepEqual(firestore.calls, []);
});

test("resolves enrollment and checks that its group links match the enrollment", async () => {
  const result = await resolveLearningEnrollment(db(), "enrollment-a");
  assert.deepEqual(result, {
    enrollmentId: "enrollment-a", beneficiaryId: "beneficiary-a", programId: "program-a",
    structureId: "structure-a", siteId: "site-a", groupId: "group-a",
    periodId: "period-2026", status: "active",
  });
  await assert.rejects(() => resolveLearningEnrollment(db({
    "learningEnrollments/enrollment-a": { ...enrollment, programId: "program-b" },
  }), "enrollment-a"), /enrollment_group_mismatch/);
});

test("does not resolve a pending or withdrawn enrollment as an active resource", async () => {
  await assert.rejects(() => resolveLearningEnrollment(db({
    "learningEnrollments/enrollment-a": { ...enrollment, status: "pending" },
  }), "enrollment-a"), /enrollment_not_active/);
});
