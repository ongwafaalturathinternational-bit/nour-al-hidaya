import { createGoogleAccessToken } from "./google-auth.js";

const API_ROOT = "https://firestore.googleapis.com/v1";
const COLLECTIONS = new Set([
  "beneficiaries",
  "beneficiaryPrivate",
  "beneficiaryEnrollments",
  "beneficiaryAccess",
  "staffDevices",
  "syncReceipts",
  "auditEvents",
]);

function assertDocumentTarget(collection, documentId) {
  if (!COLLECTIONS.has(collection)) throw new Error("firestore_collection_not_allowed");
  if (typeof documentId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(documentId)) {
    throw new Error("firestore_document_id_invalid");
  }
}

function toFirestoreValue(value, depth = 0) {
  if (depth > 10) throw new Error("firestore_value_too_deep");
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("firestore_number_invalid");
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
    if (!cachedToken || cachedToken.expiresAt <= now + 60) cachedToken = await tokenProvider();
    return fetcher(url, {
      ...init,
      headers: {
        authorization: "Bearer " + cachedToken.accessToken,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  }

  const documentUrl = (collection, id) => {
    assertDocumentTarget(collection, id);
    return API_ROOT + "/projects/wat-connect-staging/databases/(default)/documents/" +
      encodeURIComponent(collection) + "/" + encodeURIComponent(id);
  };

  return Object.freeze({
    async getDocument(collection, id) {
      const response = await authorizedRequest(documentUrl(collection, id));
      return parseResponse(response);
    },

    async createDocument(collection, id, fields) {
      assertDocumentTarget(collection, id);
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
  });
}
