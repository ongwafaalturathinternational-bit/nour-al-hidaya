const STAGING_PROJECT_ID = "wat-connect-staging";
const STAGING_SERVICE_ACCOUNT_DOMAIN = STAGING_PROJECT_ID + ".iam.gserviceaccount.com";

export function readServerConfig(env = {}) {
  const errors = [];

  if (env.WAT_ENV !== "staging") {
    errors.push("WAT_ENV must be staging");
  }

  if (env.FIREBASE_PROJECT_ID !== STAGING_PROJECT_ID) {
    errors.push("FIREBASE_PROJECT_ID must target the approved staging project");
  }

  const clientEmail = String(env.FIREBASE_CLIENT_EMAIL ?? "").trim();
  const [accountName, domain, ...extra] = clientEmail.split("@");
  if (!/^[a-z0-9-]+$/.test(accountName) || domain !== STAGING_SERVICE_ACCOUNT_DOMAIN || extra.length) {
    errors.push("FIREBASE_CLIENT_EMAIL must belong to the approved staging project");
  }

  const privateKey = String(env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  if (
    !privateKey.startsWith("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.endsWith("-----END PRIVATE KEY-----")
  ) {
    errors.push("FIREBASE_PRIVATE_KEY is missing or is not a PKCS#8 PEM key");
  }

  const turnstileSecret = String(env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (turnstileSecret.length < 16) {
    errors.push("TURNSTILE_SECRET_KEY is missing");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    config: Object.freeze({
      environment: "staging",
      firebaseProjectId: STAGING_PROJECT_ID,
      firebaseClientEmail: clientEmail,
      firebasePrivateKey: privateKey,
      firestoreDatabaseId: "(default)",
      turnstileSecret,
    }),
  };
}
