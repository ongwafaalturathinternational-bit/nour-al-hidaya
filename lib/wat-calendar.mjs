const encoder = new TextEncoder();
const MAX_LINE_BYTES = 75;

function utcTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(value)) {
    throw new TypeError("Un horodatage UTC à la seconde est requis.");
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value.replace("Z", ".000Z")) {
    throw new RangeError("Date ou heure UTC invalide.");
  }
  return value.replace(/[-:]/g, "");
}

function foldLine(line) {
  const segments = [];
  let part = "";
  let count = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (count + bytes > MAX_LINE_BYTES) {
      segments.push(part);
      part = " ";
      count = 1;
    }
    part += character;
    count += bytes;
  }
  segments.push(part);
  return segments.join("\r\n");
}

// Le code appelant contrôle les droits et ne passe ici que des événements publiés ou annulés.
export function exportCalendarEvent({ id, revision, status, startsAt, endsAt, updatedAt }) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    throw new TypeError("L’identifiant de l’événement est invalide.");
  }
  if (!Number.isInteger(revision) || revision < 0 || revision > 2147483647) {
    throw new RangeError("La révision de l’événement est invalide.");
  }
  if (status !== "published" && status !== "cancelled") {
    throw new TypeError("L’événement doit être publié ou annulé.");
  }
  const start = utcTimestamp(startsAt);
  const end = utcTimestamp(endsAt);
  if (end <= start) throw new RangeError("La fin doit suivre le début.");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wafa Al-Turath//WAT Connect//FR",
    "BEGIN:VEVENT",
    "UID:" + id + "@wat-connect",
    "DTSTAMP:" + utcTimestamp(updatedAt),
    "DTSTART:" + start,
    "DTEND:" + end,
    "SEQUENCE:" + revision,
    "SUMMARY:Événement WAT Connect",
    "CLASS:PRIVATE",
    "STATUS:" + (status === "cancelled" ? "CANCELLED" : "CONFIRMED"),
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].map(foldLine).join("\r\n");
}

// Le serveur fournit le profil authentifié et l’événement relu.
export function exportCalendarEventForRecipient(event, recipient) {
  if (recipient?.active !== true || typeof recipient.uid !== "string" ||
      !recipient.uid.trim() || !Array.isArray(event?.audience) ||
      !event.audience.includes(recipient.uid)) return null;
  return exportCalendarEvent(event);
}

// L’identité est vérifiée par le serveur avant l’appel. Les lecteurs utilisent le stockage de confiance.
export async function loadCalendarExport({ eventId, authenticatedUser, readEvent, readRecipient }) {
  if (typeof eventId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(eventId)) return null;
  const uid = authenticatedUser?.uid;
  if (typeof uid !== "string" || !uid.trim() || authenticatedUser.emailVerified !== true) return null;
  const recipient = await readRecipient(uid);
  if (recipient?.uid !== uid || recipient.active !== true) return null;
  const event = await readEvent(eventId);
  if (event?.id !== eventId || !["published", "cancelled"].includes(event.status)) return null;
  return exportCalendarEventForRecipient(event, recipient);
}

export async function respondWithCalendarExport(request, eventId, { authenticate, readEvent, readRecipient }) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { ...headers, Allow: "GET" } });
  }

  let calendar;
  try {
    const authenticatedUser = await authenticate(request);
    if (!authenticatedUser) return new Response(null, { status: 401, headers });
    calendar = await loadCalendarExport({ eventId, authenticatedUser, readEvent, readRecipient });
  } catch {
    return new Response(null, { status: 500, headers });
  }
  if (calendar === null) return new Response(null, { status: 404, headers });

  return new Response(calendar, {
    headers: {
      ...headers,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="wat-agenda.ics"',
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function routeCalendarExport(request, dependencies) {
  const { pathname } = new URL(request.url);
  const match = /^\/api\/agenda\/([A-Za-z0-9_-]{1,100})\/calendar\.ics$/.exec(pathname);
  if (!match) return null;
  return respondWithCalendarExport(request, match[1], dependencies);
}
