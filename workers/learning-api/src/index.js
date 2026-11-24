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

export default createLearningWorker();
