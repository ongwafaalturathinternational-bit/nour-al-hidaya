import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../nour-al-hidaya.html", import.meta.url), "utf8");

test("la navigation dynamique de Nour est nommée et expose l'onglet actif", () => {
  assert.match(html, /<nav class="bar" aria-label="Navigation principale de Nour Al-Hidaya">/);
  assert.match(html, /type="button" data-a="tab"/);
  assert.match(html, /aria-current=\\"page\\"/);
});

test("la navigation conserve les libellés des onglets définis par rôle", () => {
  assert.match(html, /ro\.tabs\.map\(t=>/);
  assert.match(html, /\$\{t\[1\]\}/);
  assert.match(html, /\$\{ico\[t\[2\]\]\}/);
});
