const DIMENSIONS = Object.freeze(["siteIds", "structureIds", "groupIds", "programIds"]);
const SCOPE_PATTERN = /^learning\\.[a-z][a-z0-9]*(?:\\.[a-z][a-z0-9]*){0,3}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function validIdList(value) {
  return Array.isArray(value) && value.length > 0 &&
    value.every((id) => typeof id === "string" && ID_PATTERN.test(id)) &&
    new Set(value).size === value.length;
}

function validTimestamp(value) {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,9})?Z$/.test(value)) return false;
  return Number.isFinite(Date.parse(value));
}

/** Pure fail-closed policy check. The resource must come from trusted server-side resolution. */
export function evaluateLearningAssignment({ assignment, scope, resource, now = new Date() }) {
  if (!assignment || typeof assignment !== "object" || Array.isArray(assignment)) {
    return { allowed: false, reason: "assignment_missing" };
  }
  if (!ID_PATTERN.test(assignment.assignmentId ?? "")) return { allowed: false, reason: "assignment_id_invalid" };
  if (assignment.active !== true) return { allowed: false, reason: "assignment_inactive" };
  if (typeof scope !== "string" || !SCOPE_PATTERN.test(scope)) return { allowed: false, reason: "scope_invalid" };
  if (!Array.isArray(assignment.scopeGrants) || !assignment.scopeGrants.length ||
      assignment.scopeGrants.some((item) => typeof item !== "string" || !SCOPE_PATTERN.test(item)) ||
      new Set(assignment.scopeGrants).size !== assignment.scopeGrants.length ||
      !assignment.scopeGrants.includes(scope)) {
    return { allowed: false, reason: "assignment_scope_denied" };
  }
  if (!validTimestamp(assignment.validFrom) || !validTimestamp(assignment.validUntil)) {
    return { allowed: false, reason: "assignment_dates_invalid" };
  }
  const nowMs = now instanceof Date ? now.getTime() : NaN;
  if (!Number.isFinite(nowMs)) return { allowed: false, reason: "clock_invalid" };
  if (assignment.validFrom !== null && Date.parse(assignment.validFrom) > nowMs) {
    return { allowed: false, reason: "assignment_not_yet_valid" };
  }
  if (assignment.validUntil !== null && Date.parse(assignment.validUntil) <= nowMs) {
    return { allowed: false, reason: "assignment_expired" };
  }
  if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
    return { allowed: false, reason: "resource_perimeter_missing" };
  }

  let matchedDimensions = 0;
  for (const dimension of DIMENSIONS) {
    const resourceKey = dimension.slice(0, -1);
    const resourceId = resource[resourceKey];
    const assignedIds = assignment[dimension];
    const resourceHasDimension = resourceId !== undefined && resourceId !== null;
    const assignmentHasDimension = assignedIds !== undefined && assignedIds !== null;

    // Both sides must describe exactly the dimensions relevant to this resource.
    // An assignment cannot silently widen access by adding an unresolvable dimension.
    if (resourceHasDimension !== assignmentHasDimension) {
      return { allowed: false, reason: "resource_perimeter_incomplete" };
    }
    if (!resourceHasDimension) continue;
    if (typeof resourceId !== "string" || !ID_PATTERN.test(resourceId) || !validIdList(assignedIds)) {
      return { allowed: false, reason: "resource_perimeter_invalid" };
    }
    if (!assignedIds.includes(resourceId)) return { allowed: false, reason: "resource_outside_assignment" };
    matchedDimensions += 1;
  }
  if (matchedDimensions === 0) return { allowed: false, reason: "resource_perimeter_missing" };
  return { allowed: true, reason: "assignment_scope_and_perimeter_match" };
}
