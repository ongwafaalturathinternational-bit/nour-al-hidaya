import { routeCalendarExport } from "../../../lib/wat-calendar.mjs";
import { createAgendaFirestore, createCalendarReaders } from "./calendar-readers.mjs";
import { createAgendaSessionVerifier } from "./firebase-session.mjs";

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

export default createAgendaWorker();

export function createAgendaFirestoreWorker({ authenticate, getAccessToken, fetchDocument } = {}) {
  if (typeof getAccessToken !== "function") return createAgendaWorker();
  const firestore = createAgendaFirestore({ getAccessToken, fetchDocument });
  return createAgendaWorker({ calendar: { authenticate, ...createCalendarReaders(firestore) } });
}

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
