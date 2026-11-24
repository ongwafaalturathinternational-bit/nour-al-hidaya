import { readStaffBearerToken } from "./staff-auth.js";
import { readServerConfig } from "./config.js";
import { createFirestoreRestClient } from "./firestore-rest.js";
import { readRegistrationRequest } from "./registration-request.js";
import { submitAgentRegistration } from "./registration-service.js";

const json = (body, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });

const ROUTES = new Map([
  ["/api/learning/registrations/public", "POST"],
  ["/api/learning/registrations/agent", "POST"],
  ["/api/learning/registrations/review", "GET"],
  ["/api/learning/registrations/:id/decision", "POST"],
  ["/api/learning/registrations/:id/duplicate-review", "POST"],
]);

const NOT_CONFIGURED = {
  error: "service_not_configured",
  message: "Les inscriptions en ligne ne sont pas encore disponibles.",
};

export function createLearningWorker({ agentRegistration } = {}) {
  const agentEnabled = agentRegistration?.enabled === true &&
    agentRegistration.config?.environment === "staging" &&
    agentRegistration.config.firebaseProjectId === "wat-connect-staging" &&
    typeof agentRegistration.options?.firestore?.runRegistrationTransaction === "function" &&
    Boolean(agentRegistration.options.registrationKey);
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();

      if (url.pathname === "/health") {
        if (method !== "GET") {
          return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
        }

        return json({
          service: "wat-learning-api",
          status: agentEnabled ? "agent-ready" : "not-configured",
          acceptsRegistrations: false,
          ...(agentEnabled ? { acceptsAgentRegistrations: true } : {}),
        });
      }

      const routeMethod = ROUTES.get(url.pathname);
      const isParameterizedRoute =
        /^\/api\/learning\/registrations\/[^/]+\/(decision|duplicate-review)$/.test(url.pathname);
      const allowedMethod = routeMethod ?? (isParameterizedRoute ? "POST" : null);

      if (allowedMethod) {
        if (method !== allowedMethod) {
          return json(
            { error: "method_not_allowed" },
            405,
            { allow: allowedMethod },
          );
        }

        if (agentEnabled && url.pathname === "/api/learning/registrations/agent") {
          if (!readStaffBearerToken(request)) {
            return json({ error: "authentication_required" }, 401, { "www-authenticate": "Bearer" });
          }
          const decoded = await readRegistrationRequest(request);
          if (!decoded.ok) return json({ error: decoded.error }, decoded.status);
          const result = await submitAgentRegistration(request, agentRegistration.config, decoded.data, agentRegistration.options);
          return result.ok
            ? json({ enrollmentId: result.enrollmentId, status: result.status })
            : json({ error: result.error }, result.status);
        }
        return json(NOT_CONFIGURED, 503);
      }

      return json({ error: "not_found" }, 404);
    },
  };
}

const disabledWorker = createLearningWorker();

export default {
  async fetch(request, env) {
    if (env?.WAT_ENABLE_AGENT_REGISTRATION !== "true") return disabledWorker.fetch(request);

    const config = readServerConfig(env);
    const secret = env.WAT_REGISTRATION_HMAC_HEX;
    if (!config.ok || typeof secret !== "string" || !/^[a-f0-9]{64}$/i.test(secret)) {
      return disabledWorker.fetch(request);
    }
    const registrationKey = await crypto.subtle.importKey(
      "raw",
      Uint8Array.from(secret.match(/../g), byte => parseInt(byte, 16)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    return createLearningWorker({
      agentRegistration: {
        enabled: true,
        config: config.config,
        options: { registrationKey, firestore: createFirestoreRestClient(config.config) },
      },
    }).fetch(request);
  },
};
