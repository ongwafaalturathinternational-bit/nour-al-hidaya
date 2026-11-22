import test from "node:test";
import assert from "node:assert/strict";
import worker from "../workers/learning-api/src/index.js";

test("health endpoint reports that registration is disabled", async () => {
  const response = await worker.fetch(new Request("https://example.test/health"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    service: "wat-learning-api",
    status: "not-configured",
    acceptsRegistrations: false,
  });
});

test("public registration fails closed with 503", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/public",
    { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
  ));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "service_not_configured",
    message: "Les inscriptions en ligne ne sont pas encore disponibles.",
  });
});

test("agent registration fails closed with 503", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/agent",
    { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
  ));
  assert.equal(response.status, 503);
});

test("review endpoint does not expose a public queue", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/learning/registrations/review",
  ));
  assert.equal(response.status, 503);
});

test("unknown paths return 404", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/other"));
  assert.equal(response.status, 404);
});
