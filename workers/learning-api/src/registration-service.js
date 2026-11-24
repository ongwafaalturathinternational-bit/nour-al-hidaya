import { validateLearningEnrollment } from "./learning-schema.js";
import { registrationOperation } from "./registration-idempotency.js";

const receipts = "learningRegistrationReceipts";
const unavailable = { ok: false, status: 503, error: "registration_unavailable" };

async function findReceipt(firestore, identity) {
  let document;
  try {
    document = await firestore.getDocument(receipts, identity.receiptId);
  } catch (error) {
    if (error?.message === "firestore_document_not_found") return null;
    throw error;
  }
  const hash = document?.fields?.fingerprint?.stringValue;
  const enrollmentId = document?.fields?.enrollmentId?.stringValue;
  if (!/^[a-f0-9]{64}$/.test(hash ?? "") || !/^[A-Za-z0-9_-]{1,128}$/.test(enrollmentId ?? "")) return unavailable;
  return hash === identity.fingerprint
    ? { ok: true, enrollmentId, status: "pending" }
    : { ok: false, status: 409, error: "registration_operation_conflict" };
}

// L'appelant serveur résout le bénéficiaire et les références, et contrôle le périmètre.
export async function persistVerifiedRegistration({ firestore, namespace, operationId, key, enrollment }) {
  const { beneficiaryId, programId, structureId, periodId, siteId = null, groupId = null } = enrollment ?? {};
  const pending = { beneficiaryId, programId, structureId, periodId, siteId, groupId, status: "pending" };
  if (!validateLearningEnrollment(pending).ok) {
    return { ok: false, status: 400, error: "registration_enrollment_invalid" };
  }
  const identity = await registrationOperation({ namespace, operationId, key, payload: pending });
  if (!identity.ok) return { ...identity, status: 400 };

  try {
    const existing = await findReceipt(firestore, identity);
    if (existing) return existing;
    const enrollmentId = crypto.randomUUID();
    const create = (collection,id,fields) => ({
      operation:"create",collection,id,fields,precondition:{exists:false}
    });
    await firestore.commitDocuments([
      create("learningEnrollments",enrollmentId,pending),
      create(receipts,identity.receiptId,{enrollmentId,fingerprint:identity.fingerprint}),
      create("learningAuditLogs",crypto.randomUUID(),{
        action:"registration.submit",targetId:enrollmentId,occurredAt:new Date()
      })
    ]);
    return { ok: true, enrollmentId, status: "pending" };
  } catch {
    try {
      return await findReceipt(firestore, identity) ?? unavailable;
    } catch {
      return unavailable;
    }
  }
}
