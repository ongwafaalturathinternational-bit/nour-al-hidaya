import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pages = new Map([
  ["administration.html", 1],
  ["programmes.html", 1],
  ["projets.html", 1],
  ["activites.html", 1],
  ["club-khuddam.html", 2],
]);

test("les registres défilants des modules WAT sont accessibles au clavier", () => {
  for (const [file, expected] of pages) {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const wrappers = [...html.matchAll(/<div\b[^>]*class=["'][^"']*\btable-wrap\b[^"']*["'][^>]*>/gi)]
      .map(match => match[0]);
    assert.equal(wrappers.length, expected, file + " conserve ses zones de tableau attendues");
    for (const wrapper of wrappers) {
      assert.match(wrapper, /role=["']region["']/i, file + " expose une région nommée");
      assert.match(wrapper, /tabindex=["']0["']/i, file + " autorise le focus clavier");
      assert.match(wrapper, /aria-label=["'][^"']+["']/i, file + " fournit un nom accessible");
    }
  }
});

test("le focus des zones de tableau est visible dans le socle WAT", () => {
  const css = readFileSync(new URL("../wat-brand.css", import.meta.url), "utf8");
  assert.match(css, /\.table-wrap\[role=["']region["']\]\[tabindex=["']0["']\]:focus-visible/);
  assert.match(css, /outline:3px solid var\(--wat-gold-light\)/);
});

test("la navigation des modules identifie la page courante", () => {
  for (const page of pages.keys()) {
    const html = readFileSync(new URL("../" + page, import.meta.url), "utf8");
    const navStart = html.indexOf('<nav class="module-nav"');
    const navEnd = html.indexOf("</nav>", navStart);
    const nav = html.slice(navStart, navEnd);
    assert.match(nav, new RegExp('<a href="' + page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '" aria-current="page">'));
  }
});
