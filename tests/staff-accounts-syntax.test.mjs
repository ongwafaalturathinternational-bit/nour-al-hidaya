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
  assert.match(html, /wat-recaptcha-site-key/);
  assert.match(html, /WATFirebase\?\.environment!=="staging"/);
  assert.match(html, /WATFirebase\?\.appCheckReady!==true/);
  const init = readFileSync(new URL("../firebase-init.js", import.meta.url), "utf8");
  assert.match(init, /ReCaptchaEnterpriseProvider/);
  assert.match(init, /projectId !== "wat-connect-staging"/);
  assert.ok(init.indexOf("appCheck.activate") < init.indexOf("auth: window.firebase.auth()"));
  const portal = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(portal, /staff-accounts\.html"\+\(window\.WATFirebase\.environment==="staging"\?"\?wat-env=staging":""\)/);
  assert.match(html, /callable\("listStaffAccounts"/);
  assert.match(html, /callable\("createStaffAccount"/);
  assert.match(html, /callable\("setStaffAccountStatus"/);
  assert.match(html, /callable\("updateStaffAccountAccess"/);
  assert.match(html, /Modifier les droits/);
  assert.match(html, /Enregistrer les droits/);
  assert.match(html, /id="searchAccounts"/);
  assert.match(html, /id="statusFilter"/);
  assert.match(html, /toLocaleLowerCase\("fr"\)/);
  assert.match(html, /Aucun compte ne correspond à ces filtres/);
});

test("les liens d'invitation ne sont affichés qu'à l'intérieur de l'espace administrateur", () => {
  const html = readFileSync(new URL("../staff-accounts.html", import.meta.url), "utf8");
  assert.match(html, /inviteResult/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /Transmettez ces deux liens en privé/);
});
