import { routeCalendarExport } from "../../../lib/wat-calendar.mjs";

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
