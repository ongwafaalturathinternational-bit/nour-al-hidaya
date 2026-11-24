const DEFAULT_MAX_BYTES = 16 * 1024;

// La validation métier est effectuée après décodage, sur une liste de champs autorisés.
export async function readRegistrationRequest(request, maxBytes = DEFAULT_MAX_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError("Invalid body limit");
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, status: 415, error: "registration_content_type" };
  }
  const length = request.headers.get("content-length");
  if (length !== null && Number(length) > maxBytes) {
    return { ok: false, status: 413, error: "registration_body_too_large" };
  }
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "registration_json_invalid" };

  let size = 0;
  let text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413, error: "registration_body_too_large" };
      }
      text += decoder.decode(value, { stream: true });
    }
    const data = JSON.parse(text + decoder.decode());
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, status: 400, error: "registration_object_required" };
    }
    return { ok: true, data };
  } catch {
    void reader.cancel().catch(() => {});
    return { ok: false, status: 400, error: "registration_json_invalid" };
  } finally {
    reader.releaseLock();
  }
}
