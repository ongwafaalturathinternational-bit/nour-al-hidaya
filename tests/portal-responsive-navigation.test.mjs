import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("mobile portal keeps public navigation links visible and wrap-safe", () => {
  assert.ok(html.includes(".nav{width:100%;gap:9px;flex-wrap:wrap}"));
  assert.ok(html.includes(".nav a:not(.nav-cta){display:inline-flex;font-size:.82rem}"));
  assert.doesNotMatch(html, /\.nav a:not\(\.nav-cta\)\{display:none\}/);
  for (const href of ["#engagements", "#programmes", "site-institutionnel.html", "#connexion"]) {
    assert.ok(html.includes(`href="${href}"`), `mobile navigation entry is missing: ${href}`);
  }
});

test("portal navigation has a visible keyboard focus indicator", () => {
  assert.ok(html.includes(".nav a:focus-visible{outline:3px solid #f0ce83"));
});
