const ID = /^[A-Za-z0-9_-]{1,128}$/;
const TYPES = new Set(["mosque", "center", "school", "partner_site", "other"]);
const GROUP_STATUSES = new Set(["active", "paused", "closed"]);
const ENROLLMENT_STATUSES = new Set(["pending", "active", "paused", "completed", "withdrawn", "rejected"]);

const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const id = (value, optional = false) => optional && value === null ? true : typeof value === "string" && ID.test(value);
const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 200;

export function validateLearningStructure(value) {
  if (!record(value)) return { ok: false, error: "structure_invalid" };
  if (!nonEmpty(value.name) || !TYPES.has(value.type) || !["active", "inactive", "archived"].includes(value.status)) {
    return { ok: false, error: "structure_fields_invalid" };
  }
  if (value.parentStructureId !== undefined && value.parentStructureId !== null && !id(value.parentStructureId)) {
    return { ok: false, error: "structure_parent_invalid" };
  }
  return { ok: true };
}

export function validateLearningSite(value) {
  if (!record(value)) return { ok: false, error: "site_invalid" };
  if (!nonEmpty(value.name) || !["active", "inactive", "archived"].includes(value.status)) {
    return { ok: false, error: "site_fields_invalid" };
  }
  if (!Array.isArray(value.structureIds) || value.structureIds.length === 0 ||
      value.structureIds.length > 200 || !value.structureIds.every((item) => id(item)) ||
      new Set(value.structureIds).size !== value.structureIds.length) {
    return { ok: false, error: "site_structures_invalid" };
  }
  return { ok: true };
}

export function validateLearningGroup(value) {
  if (!record(value) || !nonEmpty(value.name) || !id(value.programId) ||
      !id(value.structureId) || !GROUP_STATUSES.has(value.status)) {
    return { ok: false, error: "group_fields_invalid" };
  }
  if (value.siteId !== undefined && value.siteId !== null && !id(value.siteId)) {
    return { ok: false, error: "group_site_invalid" };
  }
  if (value.periodId !== undefined && value.periodId !== null && !id(value.periodId)) {
    return { ok: false, error: "group_period_invalid" };
  }
  return { ok: true };
}

export function validateLearningEnrollment(value) {
  if (!record(value) || !id(value.beneficiaryId) || !id(value.programId) ||
      !id(value.structureId) || !id(value.periodId) || !ENROLLMENT_STATUSES.has(value.status)) {
    return { ok: false, error: "enrollment_fields_invalid" };
  }
  for (const key of ["groupId", "siteId"]) {
    if (value[key] !== undefined && value[key] !== null && !id(value[key])) {
      return { ok: false, error: "enrollment_reference_invalid" };
    }
  }
  return { ok: true };
}

export function validateLearningAssignmentRecord(value) {
  if (!record(value) || typeof value.active !== "boolean" ||
      !Array.isArray(value.assignments) || value.assignments.length > 200) {
    return { ok: false, error: "assignment_registry_invalid" };
  }
  const seen = new Set();
  for (const item of value.assignments) {
    if (!record(item) || !id(item.assignmentId) || seen.has(item.assignmentId) ||
        typeof item.active !== "boolean" || !Array.isArray(item.scopeGrants) ||
        !item.scopeGrants.length || !item.scopeGrants.every((scope) =>
          typeof scope === "string" && /^learning\.[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){0,3}$/.test(scope))) {
      return { ok: false, error: "assignment_record_invalid" };
    }
    seen.add(item.assignmentId);
    for (const key of ["structureIds", "siteIds", "groupIds", "programIds"]) {
      if (item[key] !== undefined && (!Array.isArray(item[key]) || item[key].length === 0 ||
          !item[key].every((entry) => id(entry)) || new Set(item[key]).size !== item[key].length)) {
        return { ok: false, error: "assignment_perimeter_invalid" };
      }
    }
  }
  return { ok: true };
}
