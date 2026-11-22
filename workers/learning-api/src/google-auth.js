const TOKEN_URI = "https://oauth2.googleapis.com/token";
const FIREBASE_JWKS_URI = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const FIREBASE_ISSUER = "https://securetoken.google.com/";

const encoder = new TextEncoder();
const base64url = (bytes) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
};
const encodeJson = (value) => base64url(encoder.encode(JSON.stringify(value)));
const decodeJson = (value) => JSON.parse(atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)));

function pemToBytes(pem) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importPrivateKey(pem) {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function createGoogleAccessToken(config, options = {}) {
  const now = Math.floor((options.now ?? Date.now()) / 1000);
  const fetcher = options.fetch ?? fetch;
  const assertionHeader = encodeJson({ alg: "RS256", typ: "JWT" });
  const assertionClaims = encodeJson({
    iss: config.firebaseClientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: TOKEN_URI,
    iat: now,
    exp: now + 3600,
  });
  const signingInput = assertionHeader + "." + assertionClaims;
  const key = await importPrivateKey(config.firebasePrivateKey);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signingInput));
  const assertion = signingInput + "." + base64url(new Uint8Array(signature));

  const response = await fetcher(TOKEN_URI, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("google_oauth_token_exchange_failed");
  const payload = await response.json();
  if (typeof payload.access_token !== "string" || !payload.access_token || payload.token_type !== "Bearer") {
    throw new Error("google_oauth_invalid_token_response");
  }
  const expiresIn = Number(payload.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0 || expiresIn > 3600) {
    throw new Error("google_oauth_invalid_expiry");
  }
  return Object.freeze({ accessToken: payload.access_token, expiresAt: now + expiresIn });
}

let cachedKeys = null;
let cachedKeysUntil = 0;

export async function verifyFirebaseIdToken(token, projectId, options = {}) {
  if (typeof token !== "string" || token.length > 8192) throw new Error("firebase_token_invalid");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("firebase_token_invalid");

  const header = decodeJson(parts[0]);
  const claims = decodeJson(parts[1]);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("firebase_token_header_invalid");

  const now = Math.floor((options.now ?? Date.now()) / 1000);
  const fetcher = options.fetch ?? fetch;
  let keys = options.keys;
  if (!keys) {
    if (!cachedKeys || now >= cachedKeysUntil) {
      const response = await fetcher(FIREBASE_JWKS_URI, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("firebase_signing_keys_unavailable");
      const body = await response.json();
      if (!Array.isArray(body.keys)) throw new Error("firebase_signing_keys_invalid");
      cachedKeys = body.keys;
      cachedKeysUntil = now + 300;
    }
    keys = cachedKeys;
  }
  const jwk = keys.find((item) => item.kid === header.kid && item.kty === "RSA" && item.use === "sig");
  if (!jwk) throw new Error("firebase_signing_key_not_found");

  const publicKey = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
  );
  const signature = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - parts[2].length % 4) % 4)), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, encoder.encode(parts[0] + "." + parts[1]));
  if (!valid) throw new Error("firebase_token_signature_invalid");

  if (claims.aud !== projectId || claims.iss !== FIREBASE_ISSUER + projectId) throw new Error("firebase_token_project_invalid");
  if (typeof claims.sub !== "string" || claims.sub.length === 0 || claims.sub.length > 128) throw new Error("firebase_token_subject_invalid");
  if (!Number.isFinite(claims.exp) || claims.exp <= now) throw new Error("firebase_token_expired");
  if (!Number.isFinite(claims.iat) || claims.iat > now + 300) throw new Error("firebase_token_issued_at_invalid");
  if (!Number.isFinite(claims.auth_time) || claims.auth_time > now + 300) throw new Error("firebase_token_auth_time_invalid");

  return Object.freeze({
    uid: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    emailVerified: claims.email_verified === true,
    claims,
  });
}

export function resetFirebaseSigningKeyCacheForTests() {
  cachedKeys = null;
  cachedKeysUntil = 0;
}
