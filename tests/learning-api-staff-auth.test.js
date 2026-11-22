import test from "node:test";
import assert from "node:assert/strict";
import { authorizeStaffScope } from "../workers/learning-api/src/staff-auth.js";

const config = { firebaseProjectId: "wat-connect-staging" };
const goodIdentity = { uid: "staff-123", emailVerified: true, claims: { auth_time: 1_800_000_000 } };

function request(authorization = "Bearer abcdefghijklmnopqrstuvwxyz123456") {
  return new Request("https://example.test/api/learning/registrations/review", {
    headers: { authorization },
  });
}

function dependencies({ identity = goodIdentity, document, verifyError, firestoreError, authUser, authError } = {}) {
  return {
    verifyToken: async (token, projectId) => {
      assert.equal(token, "abcdefghijklmnopqrstuvwxyz123456");
      assert.equal(projectId, "wat-connect-staging");
      if (verifyError) throw verifyError;
      return identity;
    },
    lookupAuthUser: async (uid, targetConfig) => {
      assert.equal(uid, identity.uid);
      assert.equal(targetConfig, config);
      if (authError) throw authError;
      return authUser ?? { uid, disabled: false, emailVerified: true, validSince: 1_700_000_000 };
    },
    firestore: {
      getDocument: async (collection, id) => {
        assert.equal(collection, "staffAccess");
        assert.equal(id, goodIdentity.uid);
        if (firestoreError) throw firestoreError;
        return document ?? { fields: {
          active: { booleanValue: true },
          role: { stringValue: "formateur" },
          scopes: { arrayValue: { values: [{ stringValue: "learning.beneficiaries.read" }, { stringValue: "learning.beneficiaries.review" }] } },
        } };
      },
    },
  };
}

test("staff scope authorization accepts active verified staff with exact scope", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies());
  assert.equal(result.ok, true);
  assert.equal(result.principal.uid, "staff-123");
  assert.equal(result.principal.role, "formateur");
});

test("staff scope authorization rejects missing bearer token", async () => {
  const result = await authorizeStaffScope(request("Basic xyz"), config, "learning.beneficiaries.read", dependencies());
  assert.deepEqual(result, { ok: false, status: 401, error: "authentication_required" });
});

test("staff scope authorization rejects invalid Firebase tokens", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({ verifyError: new Error("bad token") }));
  assert.equal(result.error, "authentication_invalid");
  assert.equal(result.status, 401);
});

test("staff scope authorization requires verified email", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({ identity: { uid: "staff-123", emailVerified: false } }));
  assert.equal(result.error, "verified_staff_email_required");
});

test("staff scope authorization rechecks current Firebase disabled and verified state", async () => {
  for (const authUser of [
    { uid: "staff-123", disabled: true, emailVerified: true, validSince: 1 },
    { uid: "staff-123", disabled: false, emailVerified: false, validSince: 1 },
    { uid: "another-user", disabled: false, emailVerified: true, validSince: 1 },
    false,
  ]) {
    const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({ authUser }));
    assert.equal(result.error, "firebase_staff_account_inactive");
  }
});

test("staff scope authorization rejects revoked Firebase sessions", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({
    identity: { ...goodIdentity, claims: { auth_time: 1_700_000_000 } },
    authUser: { uid: "staff-123", disabled: false, emailVerified: true, validSince: 1_700_000_001 },
  }));
  assert.deepEqual(result, { ok: false, status: 401, error: "authentication_revoked" });
});

test("staff scope authorization fails closed when Firebase Auth state cannot be checked", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({ authError: new Error("permission denied") }));
  assert.deepEqual(result, { ok: false, status: 503, error: "firebase_account_state_unavailable" });
});

test("staff scope authorization rejects malformed revocation state", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({
    authUser: { uid: "staff-123", disabled: false, emailVerified: true, validSince: NaN },
  }));
  assert.equal(result.error, "firebase_account_state_unavailable");
});

test("staff scope authorization rejects inactive staff", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({
    document: { fields: { active: { booleanValue: false }, scopes: { arrayValue: { values: [{ stringValue: "learning.beneficiaries.read" }] } } } },
  }));
  assert.equal(result.error, "staff_access_inactive");
});

test("staff scope authorization rejects absent scope even when role exists", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.review", dependencies({
    document: { fields: { active: { booleanValue: true }, role: { stringValue: "president" }, scopes: { arrayValue: { values: [{ stringValue: "learning.beneficiaries.read" }] } } } },
  }));
  assert.equal(result.error, "staff_scope_denied");
});

test("staff scope authorization fails closed if staff registry is unavailable", async () => {
  const result = await authorizeStaffScope(request(), config, "learning.beneficiaries.read", dependencies({ firestoreError: new Error("unavailable") }));
  assert.equal(result.error, "staff_access_unavailable");
  assert.equal(result.status, 403);
});
