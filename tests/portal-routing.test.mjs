import vm from "node:vm";
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

test("le parcours candidat possède un espace de suivi personnel et l'APK l'embarque", () => {
  const signup = read("../club-khuddam-inscription.html");
  const candidate = read("../club-khuddam-espace.html");
  const worker = read("../sw.js");
  const build = read("../scripts/prepare-capacitor-web.mjs");
  assert.match(signup, /club-khuddam-espace\.html/);
  assert.match(candidate, /volunteerApplications/);
  assert.match(candidate, /emailVerified/);
  assert.match(candidate, /En attente d’examen/);
  assert.match(worker, /\.\/club-khuddam-espace\.html/);
  assert.match(build, /"club-khuddam-espace\.html"/);
});

test("un candidat vérifié retrouve son espace depuis la connexion centrale sans devenir membre de l'équipe", () => {
  const portal = read("../index.html");
  assert.match(portal, /collection\("volunteerApplications"\)\.doc\(user\.uid\)/);
  assert.match(portal, /Candidat au Club Khuddam Al-Turath/);
  assert.match(portal, /club-khuddam-espace\.html/);
  assert.match(portal, /staffAccess/);
});

test("le portail masque son contenu public après authentification sans référence DOM absente", () => {
  const portal = read("../index.html");
  assert.match(portal, /<div id="public">/);
  assert.match(portal, /\$\("public"\)\.hidden=true/);
  assert.match(portal, /<section id="workspace"/);
});


test("le portail conserve le mot de passe après un refus et le vide après une connexion acceptée", () => {
  const portal = read("../index.html");
  assert.match(portal, /finally\{if\(signedIn\)\$\("password"\)\.value="";b\.disabled=false/);
});

test("le paquet conjoint contient la page Finance proposée au contrôleur", () => {
  const route = read("../index.html").match(/if\(scopes\.includes\("finance\.read"\)[^;\r\n]*?"finance\.html"\)/)?.[0];
  assert.ok(route);
  const links = [];
  vm.runInNewContext(route, { scopes: ["finance.control.read"], addModule: (...args) => links.push(args.at(-1)) });
  assert.deepEqual(links, ["finance.html"]);
  assert.match(read("../scripts/prepare-capacitor-web.mjs"), /"finance\.html"/);
  assert.match(read("../finance.html"), /financeSession/);
});

test("le raccourci Nour suit le profil accepté par le parcours apprenant", () => {
  const portal = read("../index.html");
  const source = portal.match(/^function show\(user,profile,staff,application\).*?^}/ms)?.[0];
  assert.ok(source);
  assert.match(read("../nour-al-hidaya.html"), /snap\.data\(\)\.role!=="apprenant"/);
  const elements = { modules: { replaceChildren() {} } };
  const links = [];
  const show = vm.runInNewContext(source + "\nshow", {
    roles: {},
    $: id => elements[id] ??= {},
    addModule: (...args) => links.push(args.at(-1))
  });
  show({}, {}, { scopes: ["learning.beneficiaries.create", "finance.control.read"] }, null);
  assert.equal(elements.welcome.textContent, "Bienvenue, membre WAT");
  assert.ok(links.includes("finance.html"));
  assert.ok(!links.includes("nour-al-hidaya.html"));
  links.length = 0;
  show({}, { role: "apprenant" }, { scopes: [] }, null);
  assert.ok(links.includes("nour-al-hidaya.html"));
});
