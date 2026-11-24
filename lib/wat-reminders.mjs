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
    return { status: "reserved", reminder };
  });
}
