const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const REGISTRATION_PATHS = new Set([
  "/api/learning/registrations/public",
  "/api/learning/registrations/agent",
  "/api/learning/registrations/review",
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        service: "wat-learning-api",
        status: "not-configured",
        acceptsRegistrations: false,
      });
    }

    if (REGISTRATION_PATHS.has(url.pathname)) {
      // Deliberately fail closed until server identity, Firestore adapter,
      // authentication, rate limiting and integration tests are configured.
      return json(
        {
          error: "service_not_configured",
          message: "Les inscriptions en ligne ne sont pas encore disponibles.",
        },
        503,
      );
    }

    return json({ error: "not_found" }, 404);
  },
};
