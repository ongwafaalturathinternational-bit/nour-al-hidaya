import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("les scripts JavaScript intégrés à index.html sont syntaxiquement valides", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());

  assert.ok(scripts.length > 0, "un script applicatif intégré doit être présent");
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new vm.Script(source), \`script intégré n°\${index + 1}\`);
  });
});
