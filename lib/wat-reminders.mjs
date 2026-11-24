// Le traitement appelle cette fonction avec les états relus au moment de l’envoi.
export function prepareReminder({ event, scheduled, recipient }) {
  if (event.status !== "published" || event.id !== scheduled.eventId ||
      event.revision !== scheduled.revision || recipient.uid !== scheduled.recipientUid ||
      recipient.active !== true ||
      !Array.isArray(event.audience) || !event.audience.includes(recipient.uid) ||
      !Array.isArray(recipient.optInChannels) || !recipient.optInChannels.includes(scheduled.channel)) {
    return null;
  }

  return {
    key: JSON.stringify([event.id, event.revision, recipient.uid, scheduled.channel]),
    channel: scheduled.channel,
    message: "Vous avez un rappel WAT Connect."
  };
}

// Les références Firestore sont résolues côté serveur depuis le rappel enregistré.
export async function reserveReminder({ db, eventRef, recipientRef, receipts, scheduled }) {
  return db.runTransaction(async transaction => {
    const event = await transaction.get(eventRef);
    const recipient = await transaction.get(recipientRef);
    if (!event.exists || !recipient.exists) return { status: "ineligible" };

    const reminder = prepareReminder({
      event: { ...event.data(), id: event.id },
      recipient: { ...recipient.data(), uid: recipient.id },
      scheduled
    });
    if (!reminder) return { status: "ineligible" };

    const receiptId = encodeURIComponent(reminder.key);
    if (receiptId.length > 1500) throw new RangeError("Identifiant de réservation trop long.");
    const receiptRef = receipts.doc(receiptId);
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) return { status: "already-reserved" };

    transaction.create(receiptRef, { status: "reserved" });
    return { status: "reserved", reminder, receiptRef };
  });
}

// Le transport est injecté par le serveur. Seule une réservation nouvelle autorise un appel.
export async function distributeReminder({ send, ...input }) {
  if (typeof send !== "function") throw new TypeError("Transport de rappel requis.");
  const reservation = await reserveReminder(input);
  if (reservation.status !== "reserved") return reservation;

  const { reminder, receiptRef } = reservation;
  let response;
  try {
    response = await send({
      idempotencyKey: reminder.key,
      recipientUid: input.scheduled.recipientUid,
      channel: reminder.channel,
      message: reminder.message
    });
  } catch {
    // Le transport peut avoir accepté le message avant une perte de réponse.
  }
  const status = response?.accepted === true ? "accepted" : "uncertain";
  return recordReceiptStatus(input.db, receiptRef, status);
}

async function recordReceiptStatus(db, receiptRef, status) {
  return db.runTransaction(async transaction => {
    const receipt = await transaction.get(receiptRef);
    if (!receipt.exists) return { status: "missing" };
    const current = receipt.data().status;
    if (current === "reserved" || (current === "uncertain" && status === "accepted")) {
      transaction.update(receiptRef, { status });
      return { status };
    }
    return { status: current };
  });
}

// Le rapprochement interroge le transport sans déclencher de distribution.
export async function reconcileReminder({ db, receipts, key, lookup }) {
  if (typeof lookup !== "function") throw new TypeError("Consultation du transport requise.");
  const receiptId = encodeURIComponent(key);
  if (receiptId.length > 1500) throw new RangeError("Identifiant de réservation trop long.");
  const receiptRef = receipts.doc(receiptId);
  const receipt = await receiptRef.get();
  if (!receipt.exists) return { status: "missing" };
  const current = receipt.data().status;
  if (current !== "reserved" && current !== "uncertain") return { status: current };

  const response = await lookup({ idempotencyKey: key });
  if (response?.accepted !== true) return { status: current };
  return recordReceiptStatus(db, receiptRef, "accepted");
}
