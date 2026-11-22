import { authorizeStaffScope } from "./staff-auth.js";
import { evaluateLearningAssignment } from "./assignment-policy.js";
import { validateLearningAssignmentRecord } from "./learning-schema.js";
import { resolveLearningGroup } from "./learning-resource-resolver.js";

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

/** Server-side group authorization. Resource context is resolved from canonical Firestore records. */
export async function authorizeLearningGroup(request, config, scope, groupId, options = {}) {
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
    resource = await (options.resolveGroup ?? resolveLearningGroup)(firestore, groupId);
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
        return { ok: true, principal: staff.principal, assignmentId: assignment.assignmentId, scope, resource };
      }
    }
    return { ok: false, status: 403, error: "learning_assignment_scope_denied" };
  } catch {
    return { ok: false, status: 403, error: "learning_assignment_invalid" };
  }
}
