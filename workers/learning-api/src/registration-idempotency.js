const OPERATION_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function isRegistrationOperationId(value) {
  return typeof value === "string" && OPERATION_ID.test(value);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

async function sign(key, value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.sign("HMAC", key, bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

// Le serveur fournit l’espace de noms, la clé HMAC et la charge JSON déjà validée.
export async function registrationOperation({ operationId, namespace, payload, key }) {
  if (!isRegistrationOperationId(operationId)) {
    return { ok: false, error: "registration_operation_id_invalid" };
  }
  if (typeof namespace !== "string" || !namespace.trim() || namespace.length > 200) {
    throw new TypeError("Registration namespace required");
  }
  const identity = [namespace, operationId.toLowerCase()];
  return {
    ok: true,
    receiptId: await sign(key, ["registration-receipt-v1", ...identity]),
    fingerprint: await sign(key, ["registration-payload-v1", ...identity, canonical(payload)])
  };
}
