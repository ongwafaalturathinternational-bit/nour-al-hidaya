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


test("la fiche du Club synthétise les participations et les affectations sans contourner les périmètres", () => {
  const html = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  assert.match(html, /Vue d’ensemble de l’engagement/);
  assert.match(html, /Participations enregistrées/);
  assert.match(html, /Présences confirmées/);
  assert.match(html, /Projets confirmés/);
  assert.match(html, /if\(canAttendanceRead\)tasks\.push/);
  assert.match(html, /canAssignmentsRead=canProjectsRead&&canRead/);
  assert.match(html, /if\(canAssignmentsRead\)tasks\.push/);
  assert.match(html, /if\(canActivitiesRead\)/);
  assert.match(html, /where\("participantRef","==",v\.id\)/);
  assert.match(html, /where\("volunteerId","==",v\.id\)/);
});

test("la recherche du Club inclut les disponibilités des bénévoles", () => {
  const html = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  assert.match(html, /v\.availability\]\s*\.join\(" "\)/);
  assert.match(html, /disponibilité/);
});

test("une affectation d'un bénévole inactif ne peut être réactivée depuis l'interface", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  assert.match(html, /const assignedVolunteer=volunteers\.find\(v=>v\.id===d\.id\),isActive=assignedVolunteer\?\.status==="actif"/);
  assert.match(html, /if\(!isActive&&value!=="retire"\)option\.disabled=true/);
  assert.match(html, /status!=="retire"&&assignedVolunteer\?\.status!=="actif"/);
});


test("le registre projets masque et vide les données privées à chaque changement de session", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  assert.match(html, /let scopes=\[\],authGeneration=0/);
  assert.match(html, /function clearPrivateView\(\)/);
  assert.match(html, /\$\("app"\)\.hidden=true/);
  assert.match(html, /projects=\[\];programs=\[\];volunteers=\[\];activities=\[\]/);
  assert.match(html, /const generation=\+\+authGeneration;clearPrivateView\(\)/);
  assert.match(html, /if\(generation!==authGeneration\)return/g);
  assert.match(html, /async function load\(generation=authGeneration\)/);
  assert.match(html, /async function loadAssignments\(generation=authGeneration\)/);
});


test("le registre Club masque et vide les données privées à chaque changement de session", () => {
  const html = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  assert.match(html, /authGeneration=0/);
  assert.match(html, /function clearPrivateView\(\)/);
  assert.match(html, /records=\[\];applications=\[\]/);
  assert.match(html, /const generation=\+\+authGeneration;clearPrivateView\(\)/);
  assert.match(html, /if\(generation!==authGeneration\)return/g);
  assert.match(html, /async function load\(generation=authGeneration\)/);
});


test("les historiques de la fiche bénévole ignorent les lectures asynchrones d'une ancienne session", () => {
  const html = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  const profile = html.slice(html.indexOf("async function showVolunteerDetails"), html.indexOf('$("closeVolunteerDetails")'));
  assert.match(profile, /const generation=authGeneration/);
  assert.match(profile, /if\(generation!==authGeneration\)return/g);
  assert.match(profile, /if\(generation!==authGeneration\)return;\s*const present=/);
});


test("le registre projets ignore une réponse d'affectations pour un autre projet sélectionné", () => {
  const html = readFileSync(new URL("../projets.html", import.meta.url), "utf8");
  assert.match(html, /if\(generation!==authGeneration\|\|\$\("assignmentProject"\)\.value!==id\)return/);
});

test("le registre projets efface les formulaires privés au changement de session", () => {
 const html=readFileSync(new URL("../projets.html",import.meta.url),"utf8");
 assert.match(html,/function clearPrivateView\(\)[\s\S]*?\$\("projectForm"\)\.reset\(\);\$\("assignmentForm"\)\.reset\(\)/);
});

test("le registre Club efface le formulaire privé au changement de session", () => {
 const html=readFileSync(new URL("../club-khuddam.html",import.meta.url),"utf8");
 assert.match(html,/function clearPrivateView\(\)[\s\S]*?\$\("volunteerForm"\)\.reset\(\)/);
});


test("les décisions et enregistrements du registre Club restent liés à la session initiatrice", () => {
  const html = readFileSync(new URL("../club-khuddam.html", import.meta.url), "utf8");
  assert.match(html, /function isCurrentStaffSession\(account,generation\)/);
  const review = html.slice(html.indexOf("async function reviewApplication"), html.indexOf("\nfunction safeDate"));
  assert.match(review, /const actor=user,generation=authGeneration/);
  assert.match(review, /createdBy:actor\.uid/);
  assert.match(review, /reviewedBy:actor\.uid/);
  assert.match(review, /if\(!isCurrentStaffSession\(actor,generation\)\)return/);
  const submit = html.slice(html.indexOf('$("volunteerForm").addEventListener("submit"'), html.indexOf('\n$("cancelEdit")'));
  assert.match(submit, /const actor=user,generation=authGeneration/);
  assert.match(submit, /const targetId=editingId/);
  assert.match(submit, /updatedBy:actor\.uid/);
  assert.match(submit, /if\(generation===authGeneration\)\$\("saveButton"\)\.disabled=false/);
  assert.match(html, /expectedGeneration===authGeneration/);
});
