import {
  validateLearningGroup,
  validateLearningStructure,
  validateLearningSite,
  validateLearningEnrollment,
  validateLearningBeneficiary,
  validateLearningBeneficiaryPrivate,
  validateLearningProfile,
} from "./learning-schema.js";

function decodeValue(value) {
  if (!value || typeof value !== "object") throw new Error("firestore_value_invalid");
  if (Object.hasOwn(value, "stringValue")) return value.stringValue;
  if (Object.hasOwn(value, "booleanValue")) return value.booleanValue;
  if (Object.hasOwn(value, "integerValue")) return Number(value.integerValue);
  if (Object.hasOwn(value, "doubleValue")) return value.doubleValue;
  if (Object.hasOwn(value, "timestampValue")) return value.timestampValue;
  if (Object.hasOwn(value, "nullValue")) return null;
  if (value.arrayValue) {
    const values = value.arrayValue.values ?? [];
    if (!Array.isArray(values)) throw new Error("firestore_array_invalid");
    return values.map(decodeValue);
  }
  if (value.mapValue) return decodeFields(value.mapValue.fields);
  throw new Error("firestore_value_type_unsupported");
}

function decodeFields(fields) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("firestore_fields_invalid");
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

const validId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

async function read(firestore, collection, id) {
  if (!validId(id)) throw new Error("resource_reference_invalid");
  const document = await firestore.getDocument(collection, id);
  if (!document || !document.fields) throw new Error("resource_not_found");
  return decodeFields(document.fields);
}

/**
 * Server-only resolver. All IDs are loaded from trusted Firestore records.
 * It deliberately does not accept a client-built perimeter object.
 */
export async function resolveLearningGroup(firestore, groupId) {
  if (!firestore || typeof firestore.getDocument !== "function") throw new Error("resource_resolver_unavailable");
  const group = await read(firestore, "learningGroups", groupId);
  const groupCheck = validateLearningGroup(group);
  if (!groupCheck.ok) throw new Error(groupCheck.error);
  if (group.status !== "active") throw new Error("resource_inactive");

  const [structure, program] = await Promise.all([
    read(firestore, "learningStructures", group.structureId),
    read(firestore, "programs", group.programId),
  ]);
  const structureCheck = validateLearningStructure(structure);
  if (!structureCheck.ok || structure.status !== "active") throw new Error("resource_structure_invalid");

  const resolved = {
    groupId,
    groupName: group.name,
    groupStatus: group.status,
    structureId: group.structureId,
    structureType: structure.type,
    programId: group.programId,
  };

  if (group.siteId !== undefined && group.siteId !== null) {
    const site = await read(firestore, "learningSites", group.siteId);
    const siteCheck = validateLearningSite(site);
    if (!siteCheck.ok || site.status !== "active" || !site.structureIds.includes(group.structureId)) {
      throw new Error("resource_site_invalid");
    }
    resolved.siteId = group.siteId;
  }
  // Program is intentionally existence-checked only: the legacy WAT program
  // document's canonical field schema has not yet been approved for NH-1.
  if (program.status === "inactive" || program.status === "archived") throw new Error("resource_program_inactive");
  return Object.freeze(resolved);
}

export async function resolveLearningEnrollment(firestore, enrollmentId) {
  if (!firestore || typeof firestore.getDocument !== "function") throw new Error("resource_resolver_unavailable");
  const enrollment = await read(firestore, "learningEnrollments", enrollmentId);
  const check = validateLearningEnrollment(enrollment);
  if (!check.ok) throw new Error(check.error);
  if (enrollment.status !== "active") throw new Error("enrollment_not_active");

  const [structure, program] = await Promise.all([
    read(firestore, "learningStructures", enrollment.structureId),
    read(firestore, "programs", enrollment.programId),
  ]);
  const structureCheck = validateLearningStructure(structure);
  if (!structureCheck.ok || structure.status !== "active") throw new Error("resource_structure_invalid");
  if (program.status === "inactive" || program.status === "archived") throw new Error("resource_program_inactive");

  let group = null;
  if (enrollment.groupId) {
    group = await resolveLearningGroup(firestore, enrollment.groupId);
    if (group.programId !== enrollment.programId || group.structureId !== enrollment.structureId ||
        (group.siteId ?? null) !== (enrollment.siteId ?? null)) {
      throw new Error("enrollment_group_mismatch");
    }
  }
  if (enrollment.siteId) {
    const site = await read(firestore, "learningSites", enrollment.siteId);
    const siteCheck = validateLearningSite(site);
    if (!siteCheck.ok || site.status !== "active" || !site.structureIds.includes(enrollment.structureId)) {
      throw new Error("resource_site_invalid");
    }
  }
  return Object.freeze({
    enrollmentId,
    beneficiaryId: enrollment.beneficiaryId,
    programId: enrollment.programId,
    structureId: enrollment.structureId,
    ...(enrollment.siteId ? { siteId: enrollment.siteId } : {}),
    ...(enrollment.groupId ? { groupId: enrollment.groupId } : {}),
    periodId: enrollment.periodId,
    status: enrollment.status,
  });
}


/**
 * Resolves a beneficiary only through a trusted active enrollment. The enrollment
 * ID is a selector, not proof of access; its beneficiary link is checked here.
 * Private data is loaded only on the separate private resolver path.
 */
export async function resolveLearningBeneficiary(firestore, beneficiaryId, enrollmentId) {
  if (!firestore || typeof firestore.getDocument !== "function") throw new Error("resource_resolver_unavailable");
  if (!validId(beneficiaryId)) throw new Error("resource_reference_invalid");
  const beneficiary = await read(firestore, "learningBeneficiaries", beneficiaryId);
  const check = validateLearningBeneficiary(beneficiary);
  if (!check.ok || beneficiary.status !== "active") throw new Error("beneficiary_not_active");
  const enrollment = await resolveLearningEnrollment(firestore, enrollmentId);
  if (enrollment.beneficiaryId !== beneficiaryId) throw new Error("beneficiary_enrollment_mismatch");
  return Object.freeze({
    beneficiaryId,
    beneficiaryStatus: beneficiary.status,
    enrollmentId: enrollment.enrollmentId,
    programId: enrollment.programId,
    structureId: enrollment.structureId,
    ...(enrollment.siteId ? { siteId: enrollment.siteId } : {}),
    ...(enrollment.groupId ? { groupId: enrollment.groupId } : {}),
  });
}

export async function resolveLearningBeneficiaryPrivate(firestore, beneficiaryId, enrollmentId) {
  const beneficiary = await resolveLearningBeneficiary(firestore, beneficiaryId, enrollmentId);
  const privateRecord = await read(firestore, "learningBeneficiaryPrivate", beneficiaryId);
  const check = validateLearningBeneficiaryPrivate(privateRecord, beneficiaryId);
  if (!check.ok || privateRecord.status !== "active") throw new Error("beneficiary_private_unavailable");
  // Deliberately return only the validated identity link and status. A route
  // must fetch/serialize private fields only after this authorization succeeds.
  return Object.freeze({
    ...beneficiary,
    privateRecordId: beneficiaryId,
    privateRecordStatus: privateRecord.status,
  });
}


/**
 * Resolves a non-private pedagogical profile through its beneficiary and active
 * enrollment. No client-provided pedagogical perimeter is accepted.
 */
export async function resolveLearningProfile(firestore, beneficiaryId, enrollmentId) {
  const beneficiary = await resolveLearningBeneficiary(firestore, beneficiaryId, enrollmentId);
  const profile = await read(firestore, "learningProfiles", beneficiaryId);
  const check = validateLearningProfile(profile, beneficiaryId, enrollmentId);
  if (!check.ok || profile.status !== "active") throw new Error("learning_profile_unavailable");
  return Object.freeze({
    profileId: beneficiaryId,
    profileStatus: profile.status,
    beneficiaryId: beneficiary.beneficiaryId,
    enrollmentId: beneficiary.enrollmentId,
    programId: beneficiary.programId,
    structureId: beneficiary.structureId,
    ...(beneficiary.siteId ? { siteId: beneficiary.siteId } : {}),
    ...(beneficiary.groupId ? { groupId: beneficiary.groupId } : {}),
  });
}
