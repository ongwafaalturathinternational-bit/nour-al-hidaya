import test from "node:test";
import assert from "node:assert/strict";
import { evaluateLearningAssignment } from "../workers/learning-api/src/assignment-policy.js";

const now = new Date("2026-11-22T12:00:00.000Z");
const base = {
  assignmentId: "assign-1", active: true,
  siteIds: ["site-a"], structureIds: ["structure-a"], groupIds: ["group-a"], programIds: ["program-a"],
  scopeGrants: ["learning.beneficiaries.read", "learning.private.read"],
  validFrom: "2026-11-01T00:00:00Z", validUntil: null,
};
const resource = { siteId: "site-a", structureId: "structure-a", groupId: "group-a", programId: "program-a" };
const evaluate = (assignment = base, scope = "learning.beneficiaries.read", target = resource) =>
  evaluateLearningAssignment({ assignment, scope, resource: target, now });

test("allows exact scope and all explicitly matching perimeter dimensions", () => {
  assert.deepEqual(evaluate(), { allowed: true, reason: "assignment_scope_and_perimeter_match" });
});
test("denies missing or malformed assignment identifiers", () => {
  assert.equal(evaluate({ ...base, assignmentId: undefined }).reason, "assignment_id_invalid");
  assert.equal(evaluate({ ...base, assignmentId: "../assignment" }).reason, "assignment_id_invalid");
});
test("denies a scope not granted by the assignment", () => {
  assert.equal(evaluate(base, "learning.beneficiaries.review").reason, "assignment_scope_denied");
});
test("denies inactive, future and expired assignments", () => {
  assert.equal(evaluate({ ...base, active: false }).reason, "assignment_inactive");
  assert.equal(evaluate({ ...base, validFrom: "2026-12-01T00:00:00Z" }).reason, "assignment_not_yet_valid");
  assert.equal(evaluate({ ...base, validUntil: "2026-11-22T12:00:00Z" }).reason, "assignment_expired");
});
test("denies cross-site, cross-structure, cross-group and cross-program access", () => {
  for (const [key, value] of [["siteId", "site-b"], ["structureId", "structure-b"], ["groupId", "group-b"], ["programId", "program-b"]]) {
    assert.equal(evaluate(base, undefined, { ...resource, [key]: value }).reason, "resource_outside_assignment");
  }
});
test("denies absent, empty and incomplete perimeters rather than inferring global access", () => {
  assert.equal(evaluate(base, undefined, {}).reason, "resource_perimeter_missing");
  assert.equal(evaluate({ ...base, siteIds: [] }, undefined, { siteId: "site-a" }).reason, "resource_perimeter_invalid");
  const noSiteContext = { structureId: "structure-a", groupId: "group-a", programId: "program-a" };
  assert.equal(evaluate(base, undefined, noSiteContext).reason, "resource_perimeter_incomplete");
  const noSiteAssignment = { ...base }; delete noSiteAssignment.siteIds;
  assert.equal(evaluate(noSiteAssignment, undefined, noSiteContext).allowed, true);
});
test("denies malformed dates, identifiers, scopes and invalid clock", () => {
  assert.equal(evaluate({ ...base, validFrom: "tomorrow" }).reason, "assignment_dates_invalid");
  assert.equal(evaluate({ ...base, groupIds: ["*"] }).reason, "resource_perimeter_invalid");
  assert.equal(evaluate(base, "learning.*").reason, "scope_invalid");
  assert.equal(evaluate(base, undefined, resource).allowed, true);
  assert.equal(evaluateLearningAssignment({ assignment: base, scope: "learning.beneficiaries.read", resource, now: "now" }).reason, "clock_invalid");
});
test("requires at least one explicit resource dimension", () => {
  assert.equal(evaluate(base, undefined, { unrelated: "value" }).reason, "resource_perimeter_missing");
});
