import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("l'interface des comptes d'équipe ne s'ouvre qu'avec le claim watAdmin et App Check", () => {
  const html = readFileSync(new URL("../staff-accounts.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach(source => assert.doesNotThrow(() => new vm.Script(source)));
  assert.match(html, /token\.claims\.watAdmin!==true/);
  assert.match(html, /ReCaptchaV3Provider/);
  assert.match(html, /httpsCallable\("listStaffAccounts"\)/);
  assert.match(html, /httpsCallable\("createStaffAccount"\)/);
  assert.match(html, /httpsCallable\("setStaffAccountStatus"\)/);
});

test("les liens d'invitation ne sont affichés qu'à l'intérieur de l'espace administrateur", () => {
  const html = readFileSync(new URL("../staff-accounts.html", import.meta.url), "utf8");
  assert.match(html, /inviteResult/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Transmettez ces deux liens en privé/);
});
