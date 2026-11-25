const projectId = "wat-connect-staging";

export function createAgendaSessionVerifier({ config, verifyFirebaseIdToken, lookupFirebaseAuthUser }) {
  if (config?.environment !== "staging" || config.firebaseProjectId !== projectId) {
    throw new TypeError("Configuration Firebase Agenda hors staging.");
  }
  return async function authenticate(request) {
    const match = /^Bearer ([A-Za-z0-9._~-]{20,8192})$/.exec(request.headers.get("authorization") ?? "");
    if (!match) return null;

    let identity;
    try {
      identity = await verifyFirebaseIdToken(match[1], projectId);
    } catch {
      return null;
    }
    const uid = identity?.uid;
    const authTime = identity?.claims?.auth_time;
    if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid) ||
        identity.emailVerified !== true || !Number.isSafeInteger(authTime) || authTime < 0) return null;

    const account = await lookupFirebaseAuthUser(uid, config);
    if (!account || account.uid !== uid || account.disabled !== false || account.emailVerified !== true) return null;
    if (!Number.isSafeInteger(account.validSince) || account.validSince < 0) {
      throw new Error("État de session Firebase indisponible.");
    }
    if (authTime < account.validSince) return null;
    return { uid, emailVerified: true };
  };
}
