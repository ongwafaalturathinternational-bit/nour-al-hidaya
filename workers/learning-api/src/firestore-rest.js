import { createGoogleAccessToken } from "./google-auth.js";

const API_ROOT = "https://firestore.googleapis.com/v1";
const READ_ONLY_COLLECTIONS = new Set(["programs", "learningStructures", "learningSites"]);
const COLLECTIONS = new Set([
  "staffAccess",
  "learningBeneficiaries",
  "learningBeneficiaryPrivate",
  "learningEnrollments",
  "learningRegistrationReceipts",
  "learningBeneficiaryAccess",
  "learningProfiles",
  "learningGroups",
  "learningStaffAssignments",
  "learningAssignmentReceipts",
  "learningSessions",
  "learningAttendance",
  "learningAssessments",
  "learningResults",
  "staffDevices",
  "syncReceipts",
  "learningAuditLogs",
 ]);
const WRITABLE_COLLECTIONS = new Set([...COLLECTIONS].filter((name) => name !== "staffAccess"));
const APPEND_ONLY_COLLECTIONS = new Set(["learningAuditLogs", "learningRegistrationReceipts", "learningAssignmentReceipts", "syncReceipts"]);
const UPDATABLE_COLLECTIONS = new Set([...WRITABLE_COLLECTIONS].filter((name) => !APPEND_ONLY_COLLECTIONS.has(name)));

function assertDocumentTarget(collection, documentId, allowedCollections = COLLECTIONS) {
  if (!(allowedCollections.has(collection) || (allowedCollections === COLLECTIONS && READ_ONLY_COLLECTIONS.has(collection)))) throw new Error("firestore_collection_not_allowed");
  if (typeof documentId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(documentId)) {
    throw new Error("firestore_document_id_invalid");
  }
}

function toFirestoreValue(value, depth = 0) {
  if (depth > 10) throw new Error("firestore_value_too_deep");
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error("firestore_timestamp_invalid");
    return { timestampValue: value.toISOString() };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("firestore_number_invalid");
    if (Number.isInteger(value) && !Number.isSafeInteger(value)) throw new Error("firestore_integer_unsafe");
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    if (value.length > 500) throw new Error("firestore_array_too_large");
    return { arrayValue: { values: value.map((item) => toFirestoreValue(item, depth + 1)) } };
  }
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return { mapValue: { fields: encodeFields(value, depth + 1) } };
  }
  throw new Error("firestore_value_type_invalid");
}

function encodeFields(fields, depth = 0) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields) || Object.getPrototypeOf(fields) !== Object.prototype) {
    throw new Error("firestore_fields_invalid");
  }
  const entries = Object.entries(fields);
  if (entries.length === 0 || entries.length > 80) throw new Error("firestore_fields_count_invalid");
  const encoded = {};
  for (const [key, value] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) || key.startsWith("__")) {
      throw new Error("firestore_field_name_invalid");
    }
    encoded[key] = toFirestoreValue(value, depth);
  }
  return encoded;
}

async function parseResponse(response) {
  if (response.status === 404) throw new Error("firestore_document_not_found");
  if (response.status === 409 || response.status === 412) throw new Error("firestore_document_conflict");
  if (!response.ok) throw new Error("firestore_request_failed_" + response.status);
  return response.status === 204 ? null : response.json();
}

export function createFirestoreRestClient(config, options = {}) {
  if (config?.environment !== "staging" || config?.firebaseProjectId !== "wat-connect-staging") {
    throw new Error("firestore_staging_configuration_required");
  }
  const fetcher = options.fetch ?? fetch;
  const tokenProvider = options.getAccessToken ?? (() => createGoogleAccessToken(config, { fetch: fetcher }));
  let cachedToken = null;

  async function authorizedRequest(url, init = {}) {
    const now = Math.floor(Date.now() / 1000);
    if (!cachedToken || cachedToken.expiresAt <= now + 60) {
      cachedToken = await tokenProvider();
      if (typeof cachedToken?.accessToken !== "string" || !cachedToken.accessToken ||
          !Number.isFinite(cachedToken.expiresAt) || cachedToken.expiresAt <= now) {
        throw new Error("firestore_access_token_invalid");
      }
    }
    return fetcher(url, {
      redirect: "error",
      ...init,
      headers: {
        authorization: "Bearer " + cachedToken.accessToken,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  }

  const documentUrl = (collection, id, readOnly = false) => {
    assertDocumentTarget(collection, id, readOnly ? COLLECTIONS : UPDATABLE_COLLECTIONS);
    return API_ROOT + "/projects/wat-connect-staging/databases/(default)/documents/" +
      encodeURIComponent(collection) + "/" + encodeURIComponent(id);
  };

  const operationsUrl = API_ROOT + "/projects/wat-connect-staging/databases/(default)/documents:";
  const client = Object.freeze({
    async getDocument(collection, id, transaction) {
      const url = documentUrl(collection, id, true);
      const response = await authorizedRequest(transaction ? url + "?transaction=" + encodeURIComponent(transaction) : url);
      return parseResponse(response);
    },

    async createDocument(collection, id, fields) {
      assertDocumentTarget(collection, id, WRITABLE_COLLECTIONS);
      const encodedFields = encodeFields(fields);
      const url = API_ROOT + "/projects/wat-connect-staging/databases/(default)/documents/" +
        encodeURIComponent(collection) + "?documentId=" + encodeURIComponent(id);
      const response = await authorizedRequest(url, {
        method: "POST",
        body: JSON.stringify({ fields: encodedFields }),
      });
      return parseResponse(response);
    },

    async updateDocument(collection, id, fields) {
      assertDocumentTarget(collection, id, UPDATABLE_COLLECTIONS);
      const encodedFields = encodeFields(fields);
      const url = documentUrl(collection, id) + "?" +
        Object.keys(encodedFields).map((key) => "updateMask.fieldPaths=" + encodeURIComponent(key)).join("&") +
        "&currentDocument.exists=true";
      const response = await authorizedRequest(url, {
        method: "PATCH",
        body: JSON.stringify({ name: "projects/wat-connect-staging/databases/(default)/documents/" +
          collection + "/" + id, fields: encodedFields }),
      });
      return parseResponse(response);
    },

    async runRegistrationTransaction(run) {
      const { transaction } = await parseResponse(await authorizedRequest(operationsUrl + "beginTransaction", {
        method: "POST", body: JSON.stringify({ options: { readWrite: {} } })
      }));
      if (typeof transaction !== "string" || !transaction) throw new Error("firestore_transaction_invalid");
      let committed = false;
      try {
        return await run({
          getDocument: (collection,id) => client.getDocument(collection,id,transaction),
          async commitDocuments(writes) {
            const result = await client.commitDocuments(writes,transaction);
            committed = true;
            return result;
          }
        });
      } finally {
        if (!committed) {
          try {
            await authorizedRequest(operationsUrl + "rollback", {
              method: "POST", body: JSON.stringify({ transaction })
            });
          } catch { /* Preserve the application result, including on transport failure. */ }
        }
      }
    },

    async commitDocuments(writes, transaction) {
      if (!Array.isArray(writes) || writes.length < 2 || writes.length > 10) {
        throw new Error("firestore_commit_writes_invalid");
      }
      const registration = writes.some(write =>
        write?.collection === "learningEnrollments" || write?.collection === "learningRegistrationReceipts");
      if (transaction && !registration) throw new Error("firestore_transaction_target_invalid");
      const allowed = registration
        ? ["learningEnrollments", "learningRegistrationReceipts", "learningAuditLogs"]
        : ["learningStaffAssignments", "learningAssignmentReceipts", "learningAuditLogs"];
      if (registration && (writes.length !== allowed.length ||
          allowed.some(collection => !writes.some(write => write?.collection === collection)) ||
          writes.some(write => write?.operation !== "create"))) {
        throw new Error("firestore_registration_commit_invalid");
      }
      const targets = new Set();
      const normalized = writes.map((write) => {
        if (!write || !["create", "update"].includes(write.operation) ||
            !allowed.includes(write.collection)) {
          throw new Error("firestore_commit_target_invalid");
        }
        if (write.collection === "learningAuditLogs" && write.operation !== "create") {
          throw new Error("firestore_audit_append_only");
        }
        if (APPEND_ONLY_COLLECTIONS.has(write.collection) && write.operation !== "create") {
          throw new Error("firestore_receipt_append_only");
        }
        if (write.operation === "update" && write.collection !== "learningStaffAssignments") {
          throw new Error("firestore_commit_update_target_invalid");
        }
        assertDocumentTarget(write.collection, write.id,
          write.operation === "create" ? WRITABLE_COLLECTIONS : UPDATABLE_COLLECTIONS);
        const target = write.collection + "/" + write.id;
        if (targets.has(target)) throw new Error("firestore_commit_duplicate_target");
        targets.add(target);
        const precondition = write.precondition;
        if (!precondition || typeof precondition !== "object" || Array.isArray(precondition) ||
            Object.keys(precondition).length !== 1) {
          throw new Error("firestore_commit_precondition_invalid");
        }
        const currentDocument = write.operation === "create" && precondition.exists === false
          ? { exists: false }
          : write.operation === "update" && typeof precondition.updateTime === "string" &&
            precondition.updateTime.length > 0
            ? { updateTime: precondition.updateTime }
            : null;
        if (!currentDocument) throw new Error("firestore_commit_precondition_invalid");
        const fields = encodeFields(write.fields);
        const name = "projects/wat-connect-staging/databases/(default)/documents/" +
          write.collection + "/" + write.id;
        return {
          update: { name, fields },
          updateMask: { fieldPaths: Object.keys(fields) },
          currentDocument,
        };
      });
      const response = await authorizedRequest(
        operationsUrl + "commit",
        { method: "POST", body: JSON.stringify({ writes: normalized, ...(transaction ? { transaction } : {}) }) },
      );
      return parseResponse(response);
    },
  });
  return client;
}
