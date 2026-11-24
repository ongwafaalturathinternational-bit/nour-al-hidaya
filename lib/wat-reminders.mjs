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
