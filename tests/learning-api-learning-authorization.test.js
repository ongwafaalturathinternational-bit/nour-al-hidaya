import test from "node:test";
import assert from "node:assert/strict";
import { authorizeLearningAssignment } from "../workers/learning-api/src/learning-authorization.js";

const principal = { uid: "staff-1", role: "formateur", scopes: ["learning.beneficiaries.read"] };
const assignment = {
  assignmentId: "assign-1", active: true,
  siteIds: ["site-a"], mosqueIds: ["mosque-a"], groupIds: ["group-a"], programIds: ["program-a"],
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
const document = { fields: {
  active: encode(true),
  assignments: encode([assignment]),
} };
const request = new Request("https://example.test", { headers: { authorization: "Bearer token" } });
const resource = { siteId: "site-a", mosqueId: "mosque-a", groupId: "group-a", programId: "program-a" };
function setup({ staff = { ok: true, principal }, doc = document, error = false } = {}) {
  return {
    authorizeStaff: async () => staff,
    firestore: { getDocument: async (collection, uid) => {
      assert.equal(collection, "learningStaffAssignments");
      assert.equal(uid, principal.uid);
      if (error) throw new Error("offline");
      return doc;
    } },
    now: new Date("2026-11-22T12:00:00Z"),
  };
}

test("requires staff scope and a matching active assignment", async () => {
  const result = await authorizeLearningAssignment(request, {}, "learning.beneficiaries.read", resource, setup());
  assert.equal(result.ok, true);
  assert.equal(result.assignmentId, "assign-1");
});

test("does not bypass a failed staff authorization", async () => {
  const result = await authorizeLearningAssignment(request, {}, "learning.beneficiaries.read", resource,
    setup({ staff: { ok: false, status: 403, error: "staff_scope_denied" } }));
  assert.equal(result.error, "staff_scope_denied");
});

test("fails closed when assignment registry is unavailable or absent", async () => {
  const unavailable = await authorizeLearningAssignment(request, {}, "learning.beneficiaries.read", resource, setup({ error: true }));
  assert.equal(unavailable.error, "learning_assignment_unavailable");
  const absent = await authorizeLearningAssignment(request, {}, "learning.beneficiaries.read", resource, setup({ doc: null }));
  assert.equal(absent.error, "learning_assignment_invalid");
});

test("denies cross-site and private-data scopes without a matching grant", async () => {
  const crossSite = await authorizeLearningAssignment(request, {}, "learning.beneficiaries.read",
    { ...resource, siteId: "site-b" }, setup());
  assert.equal(crossSite.error, "learning_assignment_scope_denied");
  const privateRead = await authorizeLearningAssignment(request, {}, "learning.private.read", resource,
    setup({ staff: { ok: true, principal: { ...principal, scopes: ["learning.private.read"] } } }));
  assert.equal(privateRead.error, "learning_assignment_scope_denied");
});

test("rejects malformed assignment documents", async () => {
  const result = await authorizeLearningAssignment(request, {}, "learning.beneficiaries.read", resource,
    setup({ doc: { fields: { active: encode(true), assignments: encode("not-an-array") } } }));
  assert.equal(result.error, "learning_assignment_inactive");
});

test("uses the same trusted Firestore client for staff and assignment records", async () => {
  const calls = [];
  const firestore = {
    getDocument: async (collection, uid) => {
      calls.push(collection);
      if (uid !== principal.uid) throw new Error("unexpected uid");
      if (collection === "staffAccess") return { fields: {
        active: { booleanValue: true },
        role: { stringValue: "formateur" },
        scopes: { arrayValue: { values: [{ stringValue: "learning.beneficiaries.read" }] } },
      } };
      if (collection === "learningStaffAssignments") return document;
      throw new Error("unexpected collection");
    },
  };
  const result = await authorizeLearningAssignment(request, { firebaseProjectId: "wat-connect-staging" },
    "learning.beneficiaries.read", resource, {
      firestore,
      verifyToken: async () => ({ uid: principal.uid, emailVerified: true }),
      now: new Date("2026-11-22T12:00:00Z"),
    });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["staffAccess", "learningStaffAssignments"]);
});
