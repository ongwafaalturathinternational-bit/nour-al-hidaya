import { validateLearningEnrollment } from "./learning-schema.js";
import { registrationOperation } from "./registration-idempotency.js";
import { authorizeLearningBeneficiary, authorizeLearningGroup } from "./learning-authorization.js";

const receipts = "learningRegistrationReceipts";
const unavailable = { ok: false, status: 503, error: "registration_unavailable" };
const isTransactionConflict = error => error?.message === "firestore_document_conflict";

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
export async function persistVerifiedRegistration({ firestore, namespace, operationId, key, enrollment, actorUid, retryTransaction = false }) {
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
        action:"registration.submit",targetId:enrollmentId,occurredAt:new Date(),
        ...(actorUid ? { actorUid } : {})
      })
    ]);
    return { ok: true, enrollmentId, status: "pending" };
  } catch (error) {
    if (retryTransaction && isTransactionConflict(error)) throw error;
    try {
      return await findReceipt(firestore, identity) ?? unavailable;
    } catch {
      return unavailable;
    }
  }
}

const INPUT_KEYS = ["beneficiaryId", "sourceEnrollmentId", "groupId", "operationId"];
const ID = /^[A-Za-z0-9_-]{1,128}$/;

// Fonction interne. Le parcours HTTP reste fermé en attendant la recette staging.
export async function submitAgentRegistration(request, config, input, options = {}) {
  if (!input || typeof input !== "object" || Object.keys(input).some(key => !INPUT_KEYS.includes(key)) ||
      !INPUT_KEYS.every(key => typeof input[key] === "string" && ID.test(input[key]))) {
    return { ok:false,status:400,error:"registration_input_invalid" };
  }
  if (!options.registrationKey || typeof options.firestore?.runRegistrationTransaction !== "function") return unavailable;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await options.firestore.runRegistrationTransaction(firestore =>
        submitInTransaction(request, config, input, { ...options, firestore }));
    } catch (error) {
      if (!isTransactionConflict(error)) return unavailable;
    }
  }
  return { ok:false,status:409,error:"registration_transaction_conflict" };
}

async function submitInTransaction(request, config, input, options) {
  const source = await authorizeLearningBeneficiary(
    request, config, "learning.beneficiaries.read", input.beneficiaryId,input.sourceEnrollmentId,options
  );
  if (!source.ok) return source;
  const destination = await authorizeLearningGroup(
    request, config, "learning.beneficiaries.create", input.groupId,options
  );
  if (!destination.ok) return destination;
  const actorUid = source.principal.uid;
  if (destination.principal.uid !== actorUid) return { ok:false,status:403,error:"registration_actor_changed" };
  const { groupId,programId,structureId,siteId,periodId } = destination.resource;
  if (!periodId) return { ok:false,status:409,error:"registration_group_period_required" };
  return persistVerifiedRegistration({
    firestore:options.firestore,key:options.registrationKey,namespace:"agent:"+actorUid,
    operationId:input.operationId,actorUid,retryTransaction:true,
    enrollment:{beneficiaryId:source.resource.beneficiaryId,groupId,programId,structureId,siteId,periodId}
  });
}
