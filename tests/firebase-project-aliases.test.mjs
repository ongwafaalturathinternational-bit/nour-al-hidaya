import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("le projet Firebase par défaut reste la production", () => {
  const config = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
  assert.equal(config.projects.default, "wat-connect");
});

test("l'alias staging pointe uniquement vers le projet de test", () => {
  const config = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
  assert.equal(config.projects.staging, "wat-connect-staging");
  assert.notEqual(config.projects.staging, config.projects.default);
});
