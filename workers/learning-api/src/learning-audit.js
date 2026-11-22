const ALLOWED_ACTIONS = new Set([
  "beneficiary.private.read",
  "beneficiary.update",
  "registration.review",
  "registration.duplicate_review",
  "assignment.grant",
  "assignment.revoke",
]);
const ALLOWED_TARGETS = new Set(["beneficiary", "registration", "staff_assignment"]);
const ALLOWED_OUTCOMES = new Set(["allowed", "denied", "completed", "failed"]);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function requiredId(value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new Error("learning_audit_identifier_invalid");
  }
  return value;
}

/**
 * Append-only, server-generated audit event.
 * Never pass request bodies, names, contacts, documents or other PII here.
 */
export async function writeLearningAuditEvent({
  firestore, authorization, action, targetType, targetId, outcome, now = new Date(),
}) {
  if (!authorization?.ok || !authorization.principal?.uid ||
      typeof authorization.scope !== "string" || !/^learning\\.[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*){0,3}$/.test(authorization.scope)) {
    return { ok: false, error: "learning_audit_authorization_required" };
  }
  if (!firestore || typeof firestore.createDocument !== "function") {
    return { ok: false, error: "learning_audit_unavailable" };
  }
  if (!ALLOWED_ACTIONS.has(action) || !ALLOWED_TARGETS.has(targetType) ||
      !ALLOWED_OUTCOMES.has(outcome) || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    return { ok: false, error: "learning_audit_event_invalid" };
  }

  let eventId;
  try {
    eventId = crypto.randomUUID();
    const fields = {
      actorUid: requiredId(authorization.principal.uid),
      action,
      targetType,
      targetId: requiredId(targetId),
      scope: authorization.scope,
      outcome,
      occurredAt: now,
    };
    if (authorization.assignmentId) fields.assignmentId = requiredId(authorization.assignmentId);
    if (authorization.resource) {
      for (const key of ["siteId", "mosqueId", "groupId", "programId"]) {
        if (authorization.resource[key] !== undefined) fields[key] = requiredId(authorization.resource[key]);
      }
    }
    await firestore.createDocument("learningAuditLogs", eventId, fields);
    return { ok: true, eventId };
  } catch {
    return { ok: false, error: "learning_audit_write_failed" };
  }
}
