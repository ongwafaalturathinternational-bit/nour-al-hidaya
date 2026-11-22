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

function validResourceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

async function loadTrustedGroup(firestore, groupId) {
  if (!validResourceId(groupId)) throw new Error("learning_resource_id_invalid");
  const document = await firestore.getDocument("learningGroups", groupId);
  const fields = decodeFields(document?.fields);
  // These links are read from the canonical server-side group record.
  // Client-supplied site/mosque/program IDs are never accepted.
  const { siteId, mosqueId, programId } = fields;
  if (![siteId, mosqueId, programId].every(validResourceId)) {
    throw new Error("learning_resource_perimeter_invalid");
  }
  return Object.freeze({ groupId, siteId, mosqueId, programId });
}

/**
 * Resolve the resource from the server registry before checking assignments.
 * The caller supplies only a group ID; all perimeter links come from Firestore.
 */
export async function authorizeLearningGroup(request, config, scope, groupId, options = {}) {
  const firestore = options.firestore;
  if (!firestore || typeof firestore.getDocument !== "function") {
    return { ok: false, status: 403, error: "learning_authorization_unavailable" };
  }

  const staff = await (options.authorizeStaff ?? authorizeStaffScope)(
    request, config, scope, { ...(options.staffOptions ?? {}), firestore },
  );
  if (!staff.ok) return staff;

  let resource;
  try {
    resource = await loadTrustedGroup(firestore, groupId);
  } catch {
    // Do not disclose whether a group exists outside the caller's perimeter.
    return { ok: false, status: 404, error: "learning_resource_unavailable" };
  }

  let document;
  try {
    document = await firestore.getDocument("learningStaffAssignments", staff.principal.uid);
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
      const result = evaluateLearningAssignment({ assignment, scope, resource, now });
      if (result.allowed) {
        return {
          ok: true,
          principal: staff.principal,
          assignmentId: assignment.assignmentId,
          resource,
        };
      }
    }
    return { ok: false, status: 403, error: "learning_assignment_scope_denied" };
  } catch {
    return { ok: false, status: 403, error: "learning_assignment_invalid" };
  }
}
