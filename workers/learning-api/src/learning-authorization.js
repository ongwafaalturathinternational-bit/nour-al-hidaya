import { authorizeStaffScope } from "./staff-auth.js";
import { evaluateLearningAssignment } from "./assignment-policy.js";

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
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    throw new Error("assignment_fields_invalid");
  }
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

/**
 * Server-side authorization composition. The resource argument MUST be loaded
 * from Firestore by trusted server code, never copied from client request data.
 */
export async function authorizeLearningAssignment(request, config, scope, resource, options = {}) {
  const staff = await (options.authorizeStaff ?? authorizeStaffScope)(
    request, config, scope, { ...(options.staffOptions ?? {}), firestore: options.firestore },
  );
  if (!staff.ok) return staff;

  let document;
  try {
    document = await options.firestore.getDocument("learningStaffAssignments", staff.principal.uid);
  } catch {
    return { ok: false, status: 403, error: "learning_assignment_unavailable" };
  }

  try {
    const fields = decodeFields(document?.fields);
    if (fields.active !== true || !Array.isArray(fields.assignments)) {
      return { ok: false, status: 403, error: "learning_assignment_inactive" };
    }

    const now = options.now ?? new Date();
    for (const assignment of fields.assignments) {
      // Both the institutional staff scope and the dated NH assignment are required.
      const result = evaluateLearningAssignment({ assignment, scope, resource, now });
      if (result.allowed) {
        return {
          ok: true,
          principal: staff.principal,
          assignmentId: assignment.assignmentId,
        };
      }
    }
    return { ok: false, status: 403, error: "learning_assignment_scope_denied" };
  } catch {
    return { ok: false, status: 403, error: "learning_assignment_invalid" };
  }
}
