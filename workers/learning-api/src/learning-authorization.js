import { authorizeStaffScope } from "./staff-auth.js";
import { evaluateLearningAssignment } from "./assignment-policy.js";
import { validateLearningAssignmentRecord } from "./learning-schema.js";
import { resolveLearningGroup, resolveLearningEnrollment, resolveLearningBeneficiary, resolveLearningBeneficiaryPrivate } from "./learning-resource-resolver.js";

function decodeValue(value) {
  if (!value || typeof value !== "object") throw new Error("assignment_value_invalid");
  if (Object.hasOwn(value, "stringValue")) return value.stringValue;
  if (Object.hasOwn(value, "booleanValue")) return value.booleanValue;
  if (Object.hasOwn(value, "timestampValue")) return value.timestampValue;
  if (Object.hasOwn(value, "nullValue")) return null;
  if (value.arrayValue) {
    const values = value.arrayValue.values ?? [];
    if (!Array.isArray(values)) throw new Error("assignment_array_invalid");
    return values.map(decodeValue);
  }
  if (value.mapValue) return decodeFields(value.mapValue.fields);
  throw new Error("assignment_value_type_unsupported");
}

function decodeFields(fields) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("assignment_fields_invalid");
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

async function authorizeResolvedResource(request, config, scope, resourceId, options, resolver, resourceKind) {
  const firestore = options.firestore;
  if (!firestore || typeof firestore.getDocument !== "function") {
    return { ok: false, status: 403, error: "learning_authorization_unavailable" };
  }
  const staff = await (options.authorizeStaff ?? authorizeStaffScope)(
    request, config, scope, { ...(options.staffOptions ?? {}), firestore,
      verifyToken: options.verifyToken ?? options.staffOptions?.verifyToken },
  );
  if (!staff.ok) return staff;

  let resource;
  try {
    resource = await resolver(firestore, resourceId);
  } catch {
    return { ok: false, status: 404, error: "learning_resource_unavailable" };
  }

  let document;
  try {
    document = await firestore.getDocument("learningStaffAssignments", staff.principal.uid);
  } catch {
    return { ok: false, status: 403, error: "learning_assignment_unavailable" };
  }

  try {
    const registry = decodeFields(document?.fields);
    const validation = validateLearningAssignmentRecord(registry);
    if (!validation.ok) return { ok: false, status: 403, error: "learning_assignment_invalid" };
    if (registry.active !== true) return { ok: false, status: 403, error: "learning_assignment_inactive" };

    const now = options.now ?? new Date();
    for (const assignment of registry.assignments) {
      const result = evaluateLearningAssignment({ assignment, scope, resource, now });
      if (result.allowed) {
        return {
          ok: true, principal: staff.principal, assignmentId: assignment.assignmentId,
          scope, resource, resourceKind,
        };
      }
    }
    return { ok: false, status: 403, error: "learning_assignment_scope_denied" };
  } catch {
    return { ok: false, status: 403, error: "learning_assignment_invalid" };
  }
}

/** Server-side authorization using canonical, Firestore-resolved group context. */
export function authorizeLearningGroup(request, config, scope, groupId, options = {}) {
  return authorizeResolvedResource(
    request, config, scope, groupId, options,
    options.resolveGroup ?? resolveLearningGroup, "group",
  );
}

/** Server-side authorization using canonical, Firestore-resolved active enrollment context. */
export function authorizeLearningEnrollment(request, config, scope, enrollmentId, options = {}) {
  return authorizeResolvedResource(
    request, config, scope, enrollmentId, options,
    options.resolveEnrollment ?? resolveLearningEnrollment, "enrollment",
  );
}


/** Beneficiary dossier access is anchored to a server-resolved active enrollment. */
export function authorizeLearningBeneficiary(request, config, scope, beneficiaryId, enrollmentId, options = {}) {
  return authorizeResolvedResource(
    request, config, scope, enrollmentId, options,
    async (firestore, id) => {
      const resolved = await (options.resolveBeneficiary ?? resolveLearningBeneficiary)(firestore, beneficiaryId, id);
      if (resolved.enrollmentId !== id || resolved.beneficiaryId !== beneficiaryId) {
        throw new Error("beneficiary_resource_mismatch");
      }
      return resolved;
    }, "beneficiary",
  );
}

/** Private beneficiary fields require a distinct explicit scope grant. */
export function authorizeLearningBeneficiaryPrivate(request, config, beneficiaryId, enrollmentId, options = {}) {
  const scope = "learning.beneficiaries.private.read";
  return authorizeResolvedResource(
    request, config, scope, enrollmentId, options,
    async (firestore, id) => {
      const resolved = await (options.resolveBeneficiaryPrivate ?? resolveLearningBeneficiaryPrivate)(
        firestore, beneficiaryId, id,
      );
      if (resolved.enrollmentId !== id || resolved.beneficiaryId !== beneficiaryId ||
          resolved.privateRecordId !== beneficiaryId) {
        throw new Error("beneficiary_private_resource_mismatch");
      }
      return resolved;
    }, "beneficiary-private",
  );
}
