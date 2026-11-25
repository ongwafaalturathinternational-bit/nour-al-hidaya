const root = "projects/wat-connect-staging/databases/(default)/documents/";

export function createAgendaFirestore({ getAccessToken, fetchDocument = fetch }) {
  return {
    async getDocument(collection, id) {
      if ((collection !== "agendaRecipients" && collection !== "agendaEvents") ||
          typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
        throw new TypeError("Cible Firestore Agenda invalide.");
      }
      const token = await getAccessToken();
      if (typeof token !== "string" || !token.trim()) throw new Error("Accès Firestore indisponible.");
      const response = await fetchDocument(
        "https://firestore.googleapis.com/v1/" + root + collection + "/" + id,
        { method: "GET", headers: { Authorization: "Bearer " + token }, redirect: "error" }
      );
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Lecture Firestore Agenda indisponible.");
      return response.json();
    }
  };
}

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
        updatedAt: fields.updatedAt?.timestampValue?.replace(/\.\d{1,9}Z$/, "Z")
      };
    }
  };
}
