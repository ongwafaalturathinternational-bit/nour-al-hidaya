import assert from "node:assert/strict";
import test from "node:test";
import { exportCalendarEvent } from "../lib/wat-calendar.mjs";

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
