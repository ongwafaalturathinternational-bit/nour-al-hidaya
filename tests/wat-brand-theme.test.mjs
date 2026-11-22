import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const watPages = [
  "index.html",
  "site-institutionnel.html",
  "administration.html",
  "programmes.html",
  "projets.html",
  "activites.html",
  "club-khuddam.html",
  "club-khuddam-inscription.html",
  "club-khuddam-espace.html",
];

test("les pages institutionnelles WAT partagent le thème navigateur officiel", () => {
  for (const page of watPages) {
    const html = readFileSync(new URL("../" + page, import.meta.url), "utf8");
    assert.match(html, /<link rel="stylesheet" href="wat-brand\.css">/i, page + " charge le socle WAT");
    assert.match(html, /<meta name="theme-color" content="#103047">/i, page + " utilise le bleu profond officiel");
  }
});

test("le manifeste WAT utilise le thème institutionnel et reste distinct de Nour", () => {
  const wat = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  const nour = JSON.parse(readFileSync(new URL("../manifest-nour.json", import.meta.url), "utf8"));
  assert.equal(wat.theme_color, "#103047");
  assert.equal(nour.theme_color, "#0F2240");
  assert.equal(wat.start_url, "./index.html");
  assert.equal(nour.start_url, "./nour-al-hidaya.html");
});

test("le portail propose un lien d'évitement vers le contenu principal", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<a class="skip-link" href="#main">Aller au contenu principal<\/a>/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /\.skip-link:focus\{top:12px/);
});
