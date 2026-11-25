const root = "projects/wat-connect-staging/databases/(default)/documents/";

async function readFields(firestore, collection, id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  const document = await firestore.getDocument(collection, id);
  if (document?.name !== root + collection + "/" + id) return null;
  return document.fields ?? null;
}

export function createCalendarReaders(firestore) {
  return {
    async readRecipient(uid) {
      const fields = await readFields(firestore, "agendaRecipients", uid);
      if (fields?.active?.booleanValue !== true) return null;
      return { uid, active: true };
    },
    async readEvent(id) {
      const fields = await readFields(firestore, "agendaEvents", id);
      if (!fields) return null;
      const audience = fields.audience?.arrayValue?.values;
      if (!Array.isArray(audience) || audience.some(item => typeof item?.stringValue !== "string")) {
        return null;
      }
      return {
        id,
        audience: audience.map(item => item.stringValue),
        status: fields.status?.stringValue,
        revision: Number(fields.revision?.integerValue ?? NaN),
        startsAt: fields.startsAt?.timestampValue,
        endsAt: fields.endsAt?.timestampValue,
        updatedAt: fields.updatedAt?.timestampValue
      };
    }
  };
}
