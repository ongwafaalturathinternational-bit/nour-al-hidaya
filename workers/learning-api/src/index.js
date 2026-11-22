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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (url.pathname === "/health") {
      if (method !== "GET") {
        return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
      }

      return json({
        service: "wat-learning-api",
        status: "not-configured",
        acceptsRegistrations: false,
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

      // Deliberately fail closed until server identity, Firestore adapter,
      // authentication, rate limiting and integration tests are configured.
      return json(NOT_CONFIGURED, 503);
    }

    return json({ error: "not_found" }, 404);
  },
};
