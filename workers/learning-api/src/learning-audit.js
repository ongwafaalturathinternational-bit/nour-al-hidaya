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
const SCOPE_PATTERN = /^learning\.[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){0,3}$/;

function isValidId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/**
 * Append-only, server-generated audit event.
 * Never pass request bodies, names, contacts, documents or other PII here.
 */
export async function writeLearningAuditEvent({
  firestore, authorization, action, targetType, targetId, outcome, now = new Date(),
}) {
  if (!authorization?.ok || !isValidId(authorization.principal?.uid) ||
      typeof authorization.scope !== "string" || !SCOPE_PATTERN.test(authorization.scope)) {
    return { ok: false, error: "learning_audit_authorization_required" };
  }
  if (!firestore || typeof firestore.createDocument !== "function") {
    return { ok: false, error: "learning_audit_unavailable" };
  }
  if (!ALLOWED_ACTIONS.has(action) || !ALLOWED_TARGETS.has(targetType) ||
      !ALLOWED_OUTCOMES.has(outcome) || !(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      !isValidId(targetId) ||
      (authorization.assignmentId !== undefined && !isValidId(authorization.assignmentId))) {
    return { ok: false, error: "learning_audit_event_invalid" };
  }

  const resourceFields = {};
  if (authorization.resource !== undefined) {
    if (!authorization.resource || typeof authorization.resource !== "object" || Array.isArray(authorization.resource)) {
      return { ok: false, error: "learning_audit_event_invalid" };
    }
    for (const key of ["siteId", "mosqueId", "groupId", "programId"]) {
      const value = authorization.resource[key];
      if (value !== undefined && !isValidId(value)) {
        return { ok: false, error: "learning_audit_event_invalid" };
      }
      if (value !== undefined) resourceFields[key] = value;
    }
  }

  const fields = {
    actorUid: authorization.principal.uid,
    action,
    targetType,
    targetId,
    scope: authorization.scope,
    outcome,
    occurredAt: now,
    ...(authorization.assignmentId ? { assignmentId: authorization.assignmentId } : {}),
    ...resourceFields,
  };

  try {
    const eventId = crypto.randomUUID();
    await firestore.createDocument("learningAuditLogs", eventId, fields);
    return { ok: true, eventId };
  } catch {
    return { ok: false, error: "learning_audit_write_failed" };
  }
}
