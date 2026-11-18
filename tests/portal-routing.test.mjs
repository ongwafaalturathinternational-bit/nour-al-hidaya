import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("la page d’accueil est WAT Connect et le programme garde sa propre adresse", () => {
  const portal = read("../index.html");
  const program = read("../nour-al-hidaya.html");
  assert.match(portal, /<title>WAT Connect/);
  assert.match(portal, /href="nour-al-hidaya\.html"/);
  assert.match(program, /<title>Nour Al-Hidaya<\/title>/);
  assert.match(program, /manifest-nour\.json/);
});

test("les manifestes installables ouvrent chacun le bon espace", () => {
  const wat = JSON.parse(read("../manifest.json"));
  const nour = JSON.parse(read("../manifest-nour.json"));
  assert.match(wat.name, /WAT Connect/);
  assert.equal(wat.start_url, "./index.html");
  assert.equal(nour.name, "Nour Al-Hidaya");
  assert.equal(nour.start_url, "./nour-al-hidaya.html");
});
