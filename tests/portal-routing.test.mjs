import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("la page d’accueil est WAT Connect et le programme garde sa propre adresse", () => {
  const portal = read("../index.html");
  const program = read("../nour-al-hidaya.html");
  assert.match(portal, /<title>WAT Connect/);
  assert.match(portal, /href="nour-al-hidaya\.html"/);
  assert.match(portal, /href="club-khuddam-inscription\.html"/);
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


test("le portail n’affiche le module Finance qu’aux comptes disposant d’un périmètre financier", () => {
  const portal = read("../index.html");
  assert.match(portal, /scopes\.includes\("finance\.read"\)\|\|scopes\.includes\("finance\.manage"\)\|\|scopes\.includes\("finance\.validate"\)\|\|scopes\.includes\("finance\.budgets\.manage"\)\|\|scopes\.includes\("finance\.accounts\.manage"\)\|\|scopes\.includes\("finance\.periods\.manage"\)/);
  assert.match(portal, /addModule\("₣","Gestion financière WAT"/);
  assert.match(portal, /"finance\.html"/);
});

test("les modules métier partagent une navigation cohérente incluant les finances", () => {
  for (const path of ["../administration.html", "../programmes.html", "../projets.html", "../activites.html", "../club-khuddam.html", "../finance.html"]) {
    const html = read(path);
    assert.match(html, /href="index\.html">Portail/);
    assert.match(html, /href="finance\.html"[^>]*>Finances/);
  }
});
