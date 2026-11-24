import { lookupFirebaseAuthUser, verifyFirebaseIdToken } from "./google-auth.js";

function stringField(fields, name) {
  const value = fields?.[name]?.stringValue;
  return typeof value === "string" ? value : null;
}

function booleanField(fields, name) {
  return fields?.[name]?.booleanValue === true;
}

function stringArrayField(fields, name) {
  const values = fields?.[name]?.arrayValue?.values;
  if (!Array.isArray(values) || values.length > 100) return null;
  const scopes = values.map((item) => item?.stringValue);
  if (scopes.some((scope) => typeof scope !== "string" ||
      !/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,4}$/.test(scope))) return null;
  if (new Set(scopes).size !== scopes.length) return null;
  return scopes;
}

export function readStaffBearerToken(request) {
  const authorization = request.headers.get("authorization") ?? "";
  return /^Bearer ([A-Za-z0-9._~-]{20,8192})$/.exec(authorization)?.[1] ?? null;
}

export async function verifyStaffIdentity(request, config, options = {}) {
  const token = readStaffBearerToken(request);
  if (!token) return { ok: false, status: 401, error: "authentication_required" };

  let identity;
  try {
    identity = await (options.verifyToken ?? verifyFirebaseIdToken)(
      token, config.firebaseProjectId, options.tokenOptions ?? {},
    );
  } catch {
    return { ok: false, status: 401, error: "authentication_invalid" };
  }

  if (identity.emailVerified !== true) {
    return { ok: false, status: 403, error: "verified_staff_email_required" };
  }
  return { ok: true, identity };
}

export async function authorizeStaffScope(request, config, scope, options = {}) {
  if (typeof scope !== "string" || !/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,4}$/.test(scope)) {
    throw new Error("staff_scope_invalid");
  }

  const verified = await verifyStaffIdentity(request, config, options);
  if (!verified.ok) return verified;
  const { identity } = verified;

  let authUser;
  try {
    authUser = await (options.lookupAuthUser ?? lookupFirebaseAuthUser)(
      identity.uid, config, options.authOptions ?? {},
    );
  } catch {
    return { ok: false, status: 503, error: "firebase_account_state_unavailable" };
  }
  if (!authUser || authUser.uid !== identity.uid || authUser.disabled === true ||
      authUser.emailVerified !== true) {
    return { ok: false, status: 403, error: "firebase_staff_account_inactive" };
  }
  const authTime = identity.claims?.auth_time;
  if (!Number.isFinite(authTime) || !Number.isFinite(authUser.validSince) ||
      authUser.validSince < 0) {
    return { ok: false, status: 503, error: "firebase_account_state_unavailable" };
  }
  if (authTime < authUser.validSince) {
    return { ok: false, status: 401, error: "authentication_revoked" };
  }

  let accessDocument;
  try {
    accessDocument = await options.firestore.getDocument("staffAccess", identity.uid);
  } catch {
    return { ok: false, status: 403, error: "staff_access_unavailable" };
  }

  const fields = accessDocument?.fields;
  if (!fields || !booleanField(fields, "active")) {
    return { ok: false, status: 403, error: "staff_access_inactive" };
  }

  const scopes = stringArrayField(fields, "scopes");
  if (!scopes) {
    return { ok: false, status: 403, error: "staff_access_invalid" };
  }
  if (!scopes.includes(scope)) {
    return { ok: false, status: 403, error: "staff_scope_denied" };
  }

  return {
    ok: true,
    principal: Object.freeze({
      uid: identity.uid,
      role: stringField(fields, "role"),
      scopes: Object.freeze(scopes),
    }),
  };
}
