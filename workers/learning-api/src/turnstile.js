const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(token, secret, options = {}) {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    throw new Error("turnstile_token_invalid");
  }
  if (typeof secret !== "string" || secret.length < 16) {
    throw new Error("turnstile_secret_unavailable");
  }
  if (typeof options.expectedAction !== "string" || !/^[a-z][a-z0-9_-]{1,63}$/.test(options.expectedAction)) {
    throw new Error("turnstile_action_configuration_invalid");
  }
  const expectedHostnames = new Set(
    (options.expectedHostnames ?? []).map((hostname) => String(hostname).toLowerCase()),
  );
  if (expectedHostnames.size === 0 || [...expectedHostnames].some((hostname) =>
    !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(hostname) || hostname.includes("..")
  )) {
    throw new Error("turnstile_hostname_configuration_invalid");
  }

  const body = new URLSearchParams({ secret, response: token });
  if (typeof options.remoteIp === "string" && options.remoteIp.length <= 64) {
    body.set("remoteip", options.remoteIp);
  }

  let response;
  try {
    response = await (options.fetch ?? fetch)(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("turnstile_service_unavailable");
  }
  if (!response.ok) throw new Error("turnstile_service_unavailable");

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("turnstile_response_invalid");
  }
  if (result?.success !== true) throw new Error("turnstile_token_rejected");
  if (result.action !== options.expectedAction) throw new Error("turnstile_action_mismatch");
  if (typeof result.hostname !== "string" || !expectedHostnames.has(result.hostname.toLowerCase())) {
    throw new Error("turnstile_hostname_mismatch");
  }

  const challengeTime = Date.parse(result.challenge_ts);
  const now = options.now ?? Date.now();
  const age = now - challengeTime;
  if (!Number.isFinite(challengeTime) || age < -30_000 || age > 300_000) {
    throw new Error("turnstile_token_expired");
  }

  return Object.freeze({
    hostname: result.hostname.toLowerCase(),
    action: result.action,
    challengeTimestamp: new Date(challengeTime).toISOString(),
  });
}
