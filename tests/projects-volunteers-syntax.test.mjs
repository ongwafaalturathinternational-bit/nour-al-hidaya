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


test("le tableau de bord des projets calcule les indicateurs depuis Firestore", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  for (const id of ["statProjects", "statOngoing", "statPlanned", "statCompleted"]) assert.ok(html.includes('id="' + id + '"'));
  assert.match(html, /projects\.filter\(p=>p\.status==="en_cours"\)/);
  assert.match(html, /projects\.filter\(p=>p\.status==="termine"\)/);
});


test("les registres projets et Club proposent des filtres combinables avec la recherche", () => {
  const projects = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  const club = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  assert.match(projects, /id="statusFilter"/);
  assert.match(projects, /!\$\("statusFilter"\)\.value\|\|p\.status===\$\("statusFilter"\)\.value/);
  assert.match(club, /id="statusFilter"/);
  assert.match(club, /id="categoryFilter"/);
  assert.match(club, /!\$\("categoryFilter"\)\.value\|\|v\.category===\$\("categoryFilter"\)\.value/);
  assert.match(club, /categoryFilter"\)\.addEventListener\("change",render/);
});


test("les projets disposent de fiches détaillées accessibles", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  assert.match(html, /<dialog id="detailDialog"/);
  assert.match(html, /showProjectDetails\(p\)/);
  assert.match(html, /Description/);
  assert.match(html, /closeDetails/);
});


test("le tableau des projets affiche une répartition dynamique et accessible", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  assert.match(html, /id="projectDistribution"/);
  assert.match(html, /function renderProjectDistribution\(\)/);
  assert.match(html, /bar\.value=Math\.round\(count\/total\*100\)/);
});


test("le Club propose une fiche bénévole détaillée avec historique soumis aux périmètres dédiés", () => {
  const html = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  assert.match(html, /id="volunteerDetailDialog"/);
  assert.match(html, /Voir la fiche/);
  assert.match(html, /function showVolunteerDetails\(v\)/);
  assert.match(html, /id="volunteerDistribution"/);
  assert.match(html, /function renderVolunteerDistribution\(\)/);
  assert.match(html, /bar\.value=Math\.round\(count\/total\*100\)/);
  assert.match(html, /where\("participantRef","==",v\.id\)/);
  assert.match(html, /canAttendanceRead/);
  assert.match(html, /canProjectsRead/);
  assert.match(html, /where\("volunteerId","==",v\.id\)/);
  assert.match(html, /canRead=scopes\.includes\("volunteers\.read"\)/);
  assert.doesNotMatch(html, /const scopes=[^;]*,canRead=/);
});


test("les affectations du Club affichent un registre détaillé et permettent le suivi des états", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  assert.match(html, /className="assignment-table"/);
  assert.match(html, /async function updateAssignmentStatus\(/);
  assert.match(html, /collection\("volunteers"\)\.get\(\)/);
  assert.match(html, /Confirmee|Confirmée/);
});


test("la fiche projet expose les activités associées uniquement au périmètre activities.read", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  assert.match(html, /canActivitiesRead=scopes\.includes\("activities\.read"\)\|\|scopes\.includes\("activities\.manage"\)/);
  assert.match(html, /activities\.filter\(a=>a\.projectId===p\.id\)/);
  assert.match(html, /if\(canActivitiesRead\)rows\.push\(\["Activités liées"/);
});
