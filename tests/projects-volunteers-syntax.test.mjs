import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

for (const file of ["projets.html", "club-khuddam.html", "club-khuddam-inscription.html"]) {
  test(file + " contient un JavaScript valide", () => {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
      .map(([, , source]) => source)
      .filter(source => source.trim());
    assert.ok(scripts.length > 0);
    scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), file + " script n°" + (index + 1)));
  });
}


test("le tableau de bord du Club calcule ses indicateurs à partir des données chargées", () => {
  const html = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  for (const id of ["statTotal", "statActive", "statEngaged", "statOccasional", "statContributors", "statPending"]) {
    assert.ok(html.includes('id="' + id + '"'), "indicateur absent : " + id);
  }
  assert.match(html, /records\.filter\(v=>v\.status==="actif"\)/);
  assert.match(html, /applications\.length/);
  assert.match(html, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
