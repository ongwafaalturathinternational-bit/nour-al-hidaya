import { routeCalendarExport } from "../../../lib/wat-calendar.mjs";
import { createAgendaFirestore, createCalendarReaders } from "./calendar-readers.mjs";
import { createAgendaSessionVerifier } from "./firebase-session.mjs";
import {
  createGoogleAccessToken,
  lookupFirebaseAuthUser,
  verifyFirebaseIdToken
} from "../../learning-api/src/google-auth.js";

export function createAgendaWorker({ calendar } = {}) {
  return {
    async fetch(request, env) {
      if (env?.WAT_ENV === "staging" &&
          env.FIREBASE_PROJECT_ID === "wat-connect-staging" &&
          env.WAT_ENABLE_AGENDA_EXPORT === "true" &&
          typeof calendar?.authenticate === "function" &&
          typeof calendar.readRecipient === "function" &&
          typeof calendar.readEvent === "function") {
        const response = routeCalendarExport(request, calendar);
        if (response) return response;
      }
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "private, no-store" }
      });
    }
  };
}

export function createAgendaFirestoreWorker({ authenticate, getAccessToken, fetchDocument } = {}) {
  if (typeof getAccessToken !== "function") return createAgendaWorker();
  const firestore = createAgendaFirestore({ getAccessToken, fetchDocument });
  return createAgendaWorker({ calendar: { authenticate, ...createCalendarReaders(firestore) } });
}

const disabledWorker = createAgendaWorker();

export default {
  fetch(request, env) {
    if (env?.WAT_ENV !== "staging" || env.FIREBASE_PROJECT_ID !== "wat-connect-staging" ||
        env.WAT_ENABLE_AGENDA_EXPORT !== "true") return disabledWorker.fetch(request, env);

    const firebaseClientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
    const firebasePrivateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
    if (!/^[a-z0-9-]+@wat-connect-staging\.iam\.gserviceaccount\.com$/.test(firebaseClientEmail) ||
        !firebasePrivateKey?.startsWith("-----BEGIN PRIVATE KEY-----\n") ||
        !firebasePrivateKey.endsWith("\n-----END PRIVATE KEY-----")) return disabledWorker.fetch(request, env);

    return createAgendaFirebaseWorker({
      config: {
        environment: "staging",
        firebaseProjectId: "wat-connect-staging",
        firebaseClientEmail,
        firebasePrivateKey
      },
      verifyFirebaseIdToken,
      lookupFirebaseAuthUser,
      createGoogleAccessToken
    }).fetch(request, env);
  }
};

export function createAgendaFirebaseWorker({
  config, verifyFirebaseIdToken, lookupFirebaseAuthUser, createGoogleAccessToken, fetchDocument
}) {
  const authenticate = createAgendaSessionVerifier({ config, verifyFirebaseIdToken, lookupFirebaseAuthUser });
  return createAgendaFirestoreWorker({
    authenticate,
    getAccessToken: () => createGoogleAccessToken(config),
    fetchDocument
  });
}
