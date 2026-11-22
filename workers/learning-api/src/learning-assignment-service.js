import { lookupFirebaseAuthUser } from "./google-auth.js";
import { authorizeStaffScope } from "./staff-auth.js";
import { resolveLearningGroup } from "./learning-resource-resolver.js";
import {
  validateLearningAssignmentRecord, validateLearningSite, validateLearningStructure,
} from "./learning-schema.js";

const ADMIN_SCOPE = "learning.staffAssignments.manage";
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const GRANTABLE_SCOPES = new Set([
  "learning.structures.read", "learning.sites.read", "learning.groups.read", "learning.groups.manage",
  "learning.beneficiaries.read", "learning.beneficiaries.update", "learning.beneficiaries.review",
  "learning.beneficiaries.private.read", "learning.enrollments.read", "learning.enrollments.review",
  "learning.profiles.read", "learning.sessions.read", "learning.sessions.manage",
  "learning.attendance.read", "learning.attendance.manage", "learning.assessments.read",
  "learning.assessments.manage", "learning.results.read", "learning.results.manage",
]);
const PATCH_FIELDS = new Set([
  "scopeGrants", "structureIds", "siteIds", "groupIds", "programIds", "validFrom", "validUntil",
]);
const COLLECTIONS = {
  assignments: "learningStaffAssignments",
  receipts: "learningAssignmentReceipts",
  audits: "learningAuditLogs",
};

function decodeValue(value) {
  if (!value || typeof value !== "object") throw new Error("assignment_value_invalid");
  if (Object.hasOwn(value, "stringValue")) return value.stringValue;
  if (Object.hasOwn(value, "booleanValue")) return value.booleanValue;
  if (Object.hasOwn(value, "integerValue")) return Number(value.integerValue);
  if (Object.hasOwn(value, "doubleValue")) return value.doubleValue;
  if (Object.hasOwn(value, "timestampValue")) return value.timestampValue;
  if (Object.hasOwn(value, "nullValue")) return null;
  if (value.arrayValue) return (value.arrayValue.values ?? []).map(decodeValue);
  if (value.mapValue) return decodeFields(value.mapValue.fields);
  throw new Error("assignment_value_type_unsupported");
}
function decodeFields(fields) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("assignment_fields_invalid");
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}
async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(value)));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function validRequest(input) {
  return input && typeof input === "object" && ID.test(input.requestId ?? "") &&
    typeof input.targetUid === "string" && ID.test(input.targetUid) &&
    typeof input.reason === "string" && input.reason.trim().length >= 8 &&
    input.reason.trim().length <= 500 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.reason);
}
function validTimestamp(value) {
  return value === null || (typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value)));
}
function validateDraft(draft) {
  const draftFields = new Set([
    "scopeGrants", "structureIds", "siteIds", "groupIds", "programIds", "validFrom", "validUntil",
  ]);
  if (!draft || typeof draft !== "object" || Array.isArray(draft) ||
      Object.keys(draft).some((key) => !draftFields.has(key)) ||
      !Array.isArray(draft.scopeGrants) || draft.scopeGrants.length === 0 ||
      new Set(draft.scopeGrants).size !== draft.scopeGrants.length ||
      !draft.scopeGrants.every((scope) => GRANTABLE_SCOPES.has(scope))) {
    return { ok: false, error: "assignment_scope_invalid" };
  }
  let hasPerimeter = false;
  for (const key of ["siteIds", "structureIds", "groupIds", "programIds"]) {
    if (draft[key] === undefined) continue;
    hasPerimeter = true;
    if (!Array.isArray(draft[key]) || !draft[key].length ||
        !draft[key].every((id) => typeof id === "string" && ID.test(id)) ||
        new Set(draft[key]).size !== draft[key].length) {
      return { ok: false, error: "assignment_perimeter_invalid" };
    }
  }
  if (!hasPerimeter) return { ok: false, error: "assignment_perimeter_required" };
  if ((draft.siteIds || draft.programIds) && !draft.structureIds) {
    return { ok: false, error: "assignment_perimeter_incomplete" };
  }
  if (draft.groupIds && (!draft.structureIds || !draft.programIds)) {
    return { ok: false, error: "assignment_perimeter_incomplete" };
  }
  if (!validTimestamp(draft.validFrom) || !validTimestamp(draft.validUntil) ||
      (draft.validFrom !== null && draft.validUntil !== null && Date.parse(draft.validUntil) <= Date.parse(draft.validFrom))) {
    return { ok: false, error: "assignment_dates_invalid" };
  }
  return { ok: true };
}
async function readDocument(firestore, collection, id) {
  try {
    return await firestore.getDocument(collection, id);
  } catch (error) {
    if (error?.message === "firestore_document_not_found") return null;
    throw error;
  }
}
async function validateTarget(firestore, targetUid, config, lookupAuth) {
  const user = await lookupAuth(targetUid, config);
  if (!user || user.uid !== targetUid || user.disabled || !user.emailVerified) {
    return { ok: false, error: "assignment_target_auth_inactive" };
  }
  const record = await readDocument(firestore, "staffAccess", targetUid);
  const fields = record?.fields ? decodeFields(record.fields) : null;
  if (!fields || fields.active !== true) return { ok: false, error: "assignment_target_staff_inactive" };
  return { ok: true };
}
async function validatePerimeter(firestore, draft) {
  if (draft.groupIds) {
    for (const groupId of draft.groupIds) {
      let resource;
      try { resource = await resolveLearningGroup(firestore, groupId); }
      catch { return { ok: false, error: "assignment_perimeter_reference_invalid" }; }
      for (const [assignmentKey, resourceKey] of [
        ["siteIds", "siteId"], ["structureIds", "structureId"], ["groupIds", "groupId"], ["programIds", "programId"],
      ]) {
        const inAssignment = draft[assignmentKey]?.includes(resource[resourceKey]) ?? false;
        if (resource[resourceKey] !== undefined && !inAssignment) {
          return { ok: false, error: "assignment_perimeter_inconsistent" };
        }
        if (draft[assignmentKey] && resource[resourceKey] === undefined) {
          return { ok: false, error: "assignment_perimeter_inconsistent" };
        }
      }
    }
  }
  for (const [key, collection] of [
    ["structureIds", "learningStructures"], ["siteIds", "learningSites"], ["programIds", "programs"],
  ]) {
    for (const id of draft[key] ?? []) {
      const document = await readDocument(firestore, collection, id);
      if (!document?.fields) return { ok: false, error: "assignment_perimeter_reference_invalid" };
      const resource = decodeFields(document.fields);
      if (collection === "learningStructures" &&
          (!validateLearningStructure(resource).ok || resource.status !== "active")) {
        return { ok: false, error: "assignment_perimeter_reference_inactive" };
      }
      if (collection === "learningSites" &&
          (!validateLearningSite(resource).ok || resource.status !== "active" ||
           !resource.structureIds.some((structureId) => draft.structureIds?.includes(structureId)))) {
        return { ok: false, error: "assignment_perimeter_inconsistent" };
      }
      if (resource.status === "inactive" || resource.status === "archived") {
        return { ok: false, error: "assignment_perimeter_reference_inactive" };
      }
    }
  }
  return { ok: true };
}
function resultFromReceipt(receipt, hash) {
  const data = receipt?.fields ? decodeFields(receipt.fields) : null;
  if (!data || typeof data.requestHash !== "string" || !ID.test(data.assignmentId ?? "") ||
      !Number.isSafeInteger(data.assignmentVersion) || !Number.isSafeInteger(data.registryVersion)) {
    return { ok: false, status: 503, error: "assignment_receipt_invalid" };
  }
  if (data.requestHash !== hash) return { ok: false, status: 409, error: "assignment_request_id_reused" };
  return {
    ok: true, replayed: true, assignmentId: data.assignmentId,
    assignmentVersion: data.assignmentVersion, registryVersion: data.registryVersion,
  };
}

async function mutate(action, request, config, input, options = {}) {
  const firestore = options.firestore;
  if (!firestore || typeof firestore.getDocument !== "function" ||
      typeof firestore.commitDocuments !== "function") {
    return { ok: false, status: 503, error: "assignment_storage_unavailable" };
  }
  const auth = await (options.authorizeStaff ?? authorizeStaffScope)(
    request, config, ADMIN_SCOPE, { ...(options.staffOptions ?? {}), firestore },
  );
  if (!auth?.ok) return auth ?? { ok: false, status: 403, error: "assignment_admin_denied" };
  if (!ID.test(auth.principal?.uid ?? "") ||
      !Array.isArray(auth.principal?.scopes) || !auth.principal.scopes.includes(ADMIN_SCOPE)) {
    return { ok: false, status: 403, error: "assignment_admin_denied" };
  }
  if (!validRequest(input)) return { ok: false, status: 400, error: "assignment_request_invalid" };
  if (input.targetUid === auth.principal.uid) {
    return { ok: false, status: 403, error: "assignment_self_change_forbidden" };
  }

  const body = action === "assignment.grant"
    ? { action, targetUid: input.targetUid, assignment: input.assignment }
    : { action, targetUid: input.targetUid, assignmentId: input.assignmentId,
      expectedVersion: input.expectedVersion, patch: input.patch, reason: input.reason.trim() };
  const hash = await sha256(body);
  const receiptId = await sha256({ actorUid: auth.principal.uid, requestId: input.requestId });
  let existingReceipt;
  try { existingReceipt = await readDocument(firestore, COLLECTIONS.receipts, receiptId); }
  catch { return { ok: false, status: 503, error: "assignment_storage_unavailable" }; }
  if (existingReceipt) return resultFromReceipt(existingReceipt, hash);

  const lookupAuth = options.lookupAuthUser ?? ((uid, cfg) => lookupFirebaseAuthUser(uid, cfg, options.authOptions ?? {}));
  try {
    const target = await validateTarget(firestore, input.targetUid, config, lookupAuth);
    if (!target.ok) return { ...target, status: 403 };
    let assignmentDocument = await readDocument(firestore, COLLECTIONS.assignments, input.targetUid);
    if (assignmentDocument && !assignmentDocument.fields) {
      return { ok: false, status: 409, error: "assignment_registry_invalid" };
    }
    let registry = assignmentDocument
      ? decodeFields(assignmentDocument.fields)
      : { schemaVersion: 1, version: 0, active: true, assignments: [] };
    if (registry.active !== true || !Array.isArray(registry.assignments)) {
      return { ok: false, status: 409, error: "assignment_registry_inactive_or_invalid" };
    }
    let assignment;
    let targetAssignmentId;
    if (action === "assignment.grant") {
      const draft = input.assignment;
      const check = validateDraft(draft);
      if (!check.ok) return { ...check, status: 400 };
      const perimeter = await validatePerimeter(firestore, draft);
      if (!perimeter.ok) return { ...perimeter, status: 400 };
      targetAssignmentId = crypto.randomUUID();
      assignment = {
        ...draft, assignmentId: targetAssignmentId, active: true, version: 1,
        createdAt: (options.now ?? new Date()).toISOString(), createdBy: auth.principal.uid,
        updatedAt: (options.now ?? new Date()).toISOString(), updatedBy: auth.principal.uid,
      };
      registry.assignments.push(assignment);
    } else {
      if (!ID.test(input.assignmentId ?? "") || !Number.isSafeInteger(input.expectedVersion) ||
          input.expectedVersion < 1) {
        return { ok: false, status: 400, error: "assignment_version_request_invalid" };
      }
      const index = registry.assignments.findIndex((item) => item.assignmentId === input.assignmentId);
      if (index < 0) return { ok: false, status: 404, error: "assignment_not_found" };
      const current = registry.assignments[index];
      const currentVersion = Number.isSafeInteger(current.version) && current.version > 0 ? current.version : 1;
      if (!current.active || currentVersion !== input.expectedVersion) {
        return { ok: false, status: 409, error: "assignment_version_conflict" };
      }
      targetAssignmentId = current.assignmentId;
      if (action === "assignment.revoke") {
        assignment = { ...current, active: false, version: currentVersion + 1,
          revokedAt: (options.now ?? new Date()).toISOString(), revokedBy: auth.principal.uid,
          revocationReason: input.reason.trim(), updatedAt: (options.now ?? new Date()).toISOString(),
          updatedBy: auth.principal.uid };
      } else {
        const patch = input.patch;
        if (!patch || typeof patch !== "object" || Array.isArray(patch) ||
            !Object.keys(patch).length || Object.keys(patch).some((key) => !PATCH_FIELDS.has(key))) {
          return { ok: false, status: 400, error: "assignment_patch_invalid" };
        }
        assignment = { ...current, ...patch, version: currentVersion + 1,
          updatedAt: (options.now ?? new Date()).toISOString(), updatedBy: auth.principal.uid };
        const check = validateDraft(Object.fromEntries(
          [...PATCH_FIELDS].filter((key) => assignment[key] !== undefined).map((key) => [key, assignment[key]]),
        ));
        if (!check.ok) return { ...check, status: 400 };
        const perimeter = await validatePerimeter(firestore, assignment);
        if (!perimeter.ok) return { ...perimeter, status: 400 };
      }
      registry.assignments[index] = assignment;
    }
    const registryVersion = (Number.isSafeInteger(registry.version) && registry.version >= 0 ? registry.version : 0) + 1;
    registry = { ...registry, schemaVersion: 1, version: registryVersion, updatedAt: (options.now ?? new Date()).toISOString(),
      updatedBy: auth.principal.uid };
    const validRegistry = validateLearningAssignmentRecord(registry);
    if (!validRegistry.ok) return { ok: false, status: 400, error: validRegistry.error };

    const auditId = crypto.randomUUID();
    const response = { ok: true, replayed: false, assignmentId: targetAssignmentId,
      assignmentVersion: assignment.version, registryVersion };
    const precondition = assignmentDocument?.updateTime
      ? { updateTime: assignmentDocument.updateTime } : { exists: false };
    await firestore.commitDocuments([
      { operation: assignmentDocument ? "update" : "create", collection: COLLECTIONS.assignments,
        id: input.targetUid, precondition, fields: registry },
      { operation: "create", collection: COLLECTIONS.receipts, id: receiptId, precondition: { exists: false },
        fields: { requestHash: hash, action, targetUid: input.targetUid, assignmentId: targetAssignmentId,
          assignmentVersion: response.assignmentVersion, registryVersion } },
      { operation: "create", collection: COLLECTIONS.audits, id: auditId, precondition: { exists: false },
        fields: { actorUid: auth.principal.uid, action, targetType: "staff_assignment",
          targetId: input.targetUid, assignmentId: targetAssignmentId, scope: ADMIN_SCOPE,
          outcome: "completed", occurredAt: options.now ?? new Date(), registryVersion } },
    ]);
    return response;
  } catch (error) {
    if (/conflict|precondition|already_exists|409|412/i.test(error?.message ?? "")) {
      try {
        const racedReceipt = await readDocument(firestore, COLLECTIONS.receipts, receiptId);
        if (racedReceipt) return resultFromReceipt(racedReceipt, hash);
      } catch { /* return the stable conflict below */ }
      return { ok: false, status: 409, error: "assignment_version_conflict" };
    }
    return { ok: false, status: 503, error: "assignment_mutation_failed" };
  }
}

/** Internal callable handler only; intentionally not registered as an HTTP route. */
export function createLearningStaffAssignment(request, config, input, options = {}) {
  return mutate("assignment.grant", request, config, input, options);
}
/** Internal callable handler only; intentionally not registered as an HTTP route. */
export function updateLearningStaffAssignment(request, config, input, options = {}) {
  return mutate("assignment.update", request, config, input, options);
}
/** Internal callable handler only; intentionally not registered as an HTTP route. */
export function revokeLearningStaffAssignment(request, config, input, options = {}) {
  return mutate("assignment.revoke", request, config, input, options);
}
