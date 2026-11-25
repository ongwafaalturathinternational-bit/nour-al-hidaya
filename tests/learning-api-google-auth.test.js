import test from "node:test";
import assert from "node:assert/strict";
import { createGoogleAccessToken, lookupFirebaseAuthUser, verifyFirebaseIdToken, resetFirebaseSigningKeyCacheForTests } from "../workers/learning-api/src/google-auth.js";

const enc = new TextEncoder();
const b64url = (bytes) => {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};
const jsonPart = (value) => b64url(enc.encode(JSON.stringify(value)));

async function makeKeys() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { pair, publicJwk: { ...publicJwk, kid: "test-key", use: "sig", alg: "RS256" } };
}
async function makeToken(pair, claims) {
  const input = jsonPart({ alg: "RS256", kid: "test-key", typ: "JWT" }) + "." + jsonPart(claims);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, enc.encode(input));
  return input + "." + b64url(new Uint8Array(signature));
}

test("Firebase ID token verifies signature and all required project claims", async () => {
  const now = 1_800_000_000;
  const { pair, publicJwk } = await makeKeys();
  const token = await makeToken(pair, {
    aud: "wat-connect-staging", iss: "https://securetoken.google.com/wat-connect-staging",
    sub: "learner-123", iat: now - 30, exp: now + 300, auth_time: now - 60,
    email: "learner@example.test", email_verified: true,
  });
  const result = await verifyFirebaseIdToken(token, "wat-connect-staging", { now: now * 1000, keys: [publicJwk] });
  assert.equal(result.uid, "learner-123");
  assert.equal(result.emailVerified, true);
});

test("Firebase ID token rejects a different project", async () => {
  const now = 1_800_000_000;
  const { pair, publicJwk } = await makeKeys();
  const token = await makeToken(pair, {
    aud: "other-project", iss: "https://securetoken.google.com/other-project",
    sub: "uid", iat: now - 1, exp: now + 60, auth_time: now - 1,
  });
  await assert.rejects(() => verifyFirebaseIdToken(token, "wat-connect-staging", { now: now * 1000, keys: [publicJwk] }), /project_invalid/);
});

test("Firebase ID token rejects expired tokens", async () => {
  const now = 1_800_000_000;
  const { pair, publicJwk } = await makeKeys();
  const token = await makeToken(pair, {
    aud: "wat-connect-staging", iss: "https://securetoken.google.com/wat-connect-staging",
    sub: "uid", iat: now - 100, exp: now - 1, auth_time: now - 100,
  });
  await assert.rejects(() => verifyFirebaseIdToken(token, "wat-connect-staging", { now: now * 1000, keys: [publicJwk] }), /expired/);
});

test("Google OAuth helper exchanges a signed assertion and validates the response", async () => {
  const { pair } = await makeKeys();
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  let requestBody;
  const pem = "-----BEGIN PRIVATE KEY-----\n" + btoa(String.fromCharCode(...new Uint8Array(pkcs8))).match(/.{1,64}/g).join("\n") + "\n-----END PRIVATE KEY-----";
  const result = await createGoogleAccessToken({
    firebaseClientEmail: "wat-nh-staging@wat-connect-staging.iam.gserviceaccount.com",
    firebasePrivateKey: pem,
  }, {
    now: 1_800_000_000_000,
    fetch: async (_url, init) => {
      requestBody = new URLSearchParams(init.body);
      return new Response(JSON.stringify({ access_token: "test-access-token", token_type: "Bearer", expires_in: 3600 }), { status: 200 });
    },
  });
  assert.equal(result.accessToken, "test-access-token");
  assert.equal(result.expiresAt, 1_800_003_600);
  const assertion = requestBody.get("assertion");
  assert.equal(assertion.split(".").length, 3);
  const claims = JSON.parse(atob(assertion.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  assert.equal(claims.scope, "https://www.googleapis.com/auth/datastore");
});

test("Google OAuth helper rejects malformed token responses", async () => {
  const { pair } = await makeKeys();
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const pem = "-----BEGIN PRIVATE KEY-----\n" + btoa(String.fromCharCode(...new Uint8Array(pkcs8))).match(/.{1,64}/g).join("\n") + "\n-----END PRIVATE KEY-----";
  await assert.rejects(() => createGoogleAccessToken({
    firebaseClientEmail: "wat-nh-staging@wat-connect-staging.iam.gserviceaccount.com", firebasePrivateKey: pem,
  }, { fetch: async () => new Response(JSON.stringify({ access_token: "x", token_type: "Bearer", expires_in: 99999 }), { status: 200 }) }), /invalid_expiry/);
});

test("Firebase Auth lookup reads only the requested staging UID and returns security state", async () => {
  let captured, scope;
  const result = await lookupFirebaseAuthUser("staff-123", {
    environment: "staging", firebaseProjectId: "wat-connect-staging",
  }, {
    getAccessToken: async (_config, options) => { scope = options.scope; return { accessToken: "oauth-read-token" }; },
    fetch: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ users: [{
        localId: "staff-123", disabled: false, emailVerified: true, validSince: "1700000000",
      }] }), { status: 200 });
    },
  });
  assert.equal(captured.url, "https://identitytoolkit.googleapis.com/v1/projects/wat-connect-staging/accounts:lookup");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers.authorization, "Bearer oauth-read-token");
  assert.deepEqual(JSON.parse(captured.init.body), { localId: ["staff-123"] });
  assert.equal(scope, "https://www.googleapis.com/auth/identitytoolkit");
  assert.deepEqual(result, { uid: "staff-123", disabled: false, emailVerified: true, validSince: 1_700_000_000 });
});

test("Firebase Auth lookup refuses production configuration before network access", async () => {
  await assert.rejects(() => lookupFirebaseAuthUser("staff-123", {
    environment: "production", firebaseProjectId: "wat-connect",
  }, { fetch: async () => { throw new Error("must not fetch"); } }), /staging_configuration_required/);
});

test("Firebase Auth lookup fails closed on permission errors and malformed user state", async () => {
  const config = { environment: "staging", firebaseProjectId: "wat-connect-staging" };
  const getAccessToken = async () => ({ accessToken: "oauth-read-token" });
  await assert.rejects(() => lookupFirebaseAuthUser("staff-123", config, {
    getAccessToken, fetch: async () => new Response("{}", { status: 403 }),
  }), /lookup_failed_403/);
  await assert.rejects(() => lookupFirebaseAuthUser("staff-123", config, {
    getAccessToken, fetch: async () => new Response(JSON.stringify({ users: [{
      localId: "staff-123", disabled: false, emailVerified: true,
    }] }), { status: 200 }),
  }), /user_record_invalid/);
  assert.equal(await lookupFirebaseAuthUser("staff-123", config, {
    getAccessToken, fetch: async () => new Response(JSON.stringify({ users: [] }), { status: 200 }),
  }), null);
});
