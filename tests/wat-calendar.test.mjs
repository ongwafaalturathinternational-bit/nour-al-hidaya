import assert from "node:assert/strict";
import test from "node:test";
import { exportCalendarEvent, exportCalendarEventForRecipient, loadCalendarExport, respondWithCalendarExport } from "../lib/wat-calendar.mjs";

const event = {
  id:"conseil-01", revision:0, status:"published",
  startsAt:"2026-11-26T09:00:00Z", endsAt:"2026-11-26T10:00:00Z",
  updatedAt:"2026-11-24T12:01:02Z"
};

test("un report et une annulation préservent l’identifiant et expriment la révision", () => {
  const first = exportCalendarEvent(event);
  const update = exportCalendarEvent({...event, revision:1, startsAt:"2026-11-26T09:30:00Z"});
  const cancelled = exportCalendarEvent({...event, revision:2, status:"cancelled"});
  for (const calendar of [first,update,cancelled]) {
    assert.match(calendar, /UID:conseil-01@wat-connect\r\n/);
    assert.match(calendar, /END:VCALENDAR\r\n$/);
  }
  assert.match(update, /DTSTART:20261126T093000Z/);
  assert.match(update, /SEQUENCE:1/);
  assert.match(cancelled, /SEQUENCE:2/);
  assert.match(cancelled, /STATUS:CANCELLED/);
});

test("l’export local plie les longues lignes et omet les données privées", () => {
  const id = "a".repeat(100);
  const calendar = exportCalendarEvent({...event,id,title:"dossier confidentiel",email:"exemple@example.invalid"});
  assert.ok(calendar.split("\r\n").every(line => Buffer.byteLength(line) <= 75));
  assert.ok(calendar.replace(/\r\n /g,"").includes("UID:" + id + "@wat-connect"));
  assert.doesNotMatch(calendar, /confidentiel|exemple@example|VALARM|ATTENDEE/);
});

test("l’export refuse les brouillons, les dates invalides et les identifiants injectés", () => {
  for (const invalid of [
    {status:"draft"}, {revision:-1}, {id:"a\r\nATTENDEE:foo"},
    {startsAt:"2026-02-31T09:00:00Z"}, {endsAt:event.startsAt},
    {startsAt:"2026-11-26T10:00:00+01:00"}
  ]) assert.throws(() => exportCalendarEvent({...event,...invalid}));
});

test("le calendrier conserve le libellé générique UTF-8 et omet les données privées", () => {
  const calendar = exportCalendarEvent({
    ...event, title: "Réunion privée", location: "Lieu confidentiel", audience: ["profil-fictif"],
  });
  const bytes = new TextEncoder().encode(calendar);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  assert.ok(decoded.split("\r\n").includes("SUMMARY:Événement WAT Connect"));
  assert.doesNotMatch(decoded, /Réunion privée|Lieu confidentiel|profil-fictif/);
});

test("l’export Agenda exige un destinataire actif et invité", () => {
  const meeting = { ...event, audience: ["invite-fictif"], location: "lieu privé" };
  const invited = { uid: "invite-fictif", active: true };
  assert.equal(exportCalendarEventForRecipient(meeting, invited), exportCalendarEvent(meeting));
  assert.match(exportCalendarEventForRecipient({ ...meeting, status: "cancelled" }, invited), /STATUS:CANCELLED/);
  assert.equal(exportCalendarEventForRecipient(meeting, { ...invited, active: false }), null);
  assert.equal(exportCalendarEventForRecipient(meeting, { ...invited, uid: "autre" }), null);
  assert.equal(exportCalendarEventForRecipient(meeting), null);
  assert.equal(exportCalendarEventForRecipient(event, invited), null);
});

test("le service Agenda relit l’invitation et le profil du compte vérifié", async () => {
  const calls = [];
  const stored = { ...event, audience: ["invite-fictif"] };
  const input = {
    eventId: event.id,
    authenticatedUser: { uid: "invite-fictif", emailVerified: true },
    readRecipient: async uid => { calls.push(uid); return { uid, active: true }; },
    readEvent: async id => { calls.push(id); return stored; }
  };
  assert.equal(await loadCalendarExport(input), exportCalendarEvent(event));
  assert.deepEqual(calls, ["invite-fictif", event.id]);
  calls.length = 0;
  assert.equal(await loadCalendarExport({ ...input, authenticatedUser: { uid: "invite-fictif" } }), null);
  assert.equal(await loadCalendarExport({ ...input, eventId: "../conseil" }), null);
  assert.deepEqual(calls, []);
  assert.equal(await loadCalendarExport({ ...input, readRecipient: async () => ({
    uid: "autre", active: true
  }) }), null);
  assert.deepEqual(calls, []);
  assert.equal(await loadCalendarExport({ ...input, readEvent: async () => ({
    ...stored, status: "draft"
  }) }), null);
});

test("la réponse HTTP Agenda protège le téléchargement et masque les événements non accessibles", async () => {
  const request = new Request("https://staging.example/agenda");
  const inputs = {
    authenticate: async () => ({ uid: "invite-fictif", emailVerified: true }),
    readRecipient: async uid => ({ uid, active: true }),
    readEvent: async () => ({ ...event, audience: ["invite-fictif"] })
  };
  const allowed = await respondWithCalendarExport(request, event.id, inputs);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("Content-Type"), "text/calendar; charset=utf-8");
  assert.equal(allowed.headers.get("Content-Disposition"), 'attachment; filename="wat-agenda.ics"');
  assert.equal(allowed.headers.get("Cache-Control"), "private, no-store");
  assert.equal(await allowed.text(), exportCalendarEvent(event));
  const denied = await respondWithCalendarExport(request, event.id, {
    ...inputs, readEvent: async () => ({ ...event, audience: ["autre"] })
  });
  const missing = await respondWithCalendarExport(request, event.id, { ...inputs, readEvent: async () => null });
  for (const response of [denied, missing]) {
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(await response.text(), "");
  }
  assert.equal((await respondWithCalendarExport(request, event.id, {
    ...inputs, authenticate: async () => null
  })).status, 401);
  const post = new Request(request.url, { method: "POST" });
  const invalid = await respondWithCalendarExport(post, event.id, { authenticate: assert.fail });
  assert.equal(invalid.status, 405);
  assert.equal(invalid.headers.get("Allow"), "GET");
});
