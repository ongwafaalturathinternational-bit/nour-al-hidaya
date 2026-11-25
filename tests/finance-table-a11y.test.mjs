import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../wat-brand.css", import.meta.url), "utf8");

test("les neuf registres financiers sont nommés et accessibles au clavier", () => {
  const wrappers = [...html.matchAll(/<div\b[^>]*class=["'][^"']*\btable-wrap\b[^"']*["'][^>]*>/gi)]
    .map(match => match[0]);
  assert.equal(wrappers.length, 9);
  for (const wrapper of wrappers) {
    assert.match(wrapper, /role=["']region["']/i);
    assert.match(wrapper, /aria-label=["'][^"']+["']/i);
    assert.match(wrapper, /tabindex=["']0["']/i);
  }
});

test("le socle WAT rend le focus des tableaux financiers visible", () => {
  assert.match(css, /\.table-wrap\[role=["']region["']\]\[tabindex=["']0["']\]:focus-visible/);
  assert.match(css, /outline:3px solid var\(--wat-gold-light\)/);
});
