import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("le module des activités contient un JavaScript valide", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), "script activités n°" + (index + 1)));
});

test("le pointage peut sélectionner un bénévole du Club sans exposer le registre à tous", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="clubVolunteerPicker" hidden/);
  assert.match(html, /id="clubVolunteer"/);
  assert.match(html, /canSelectClubVolunteers=canAttendanceManage&&\(scopes\.includes\("volunteers\.read"\)\|\|scopes\.includes\("volunteers\.manage"\)\)/);
  assert.match(html, /collection\("volunteers"\)/);
  assert.match(html, /participantType"\)\.value="benevole"/);
});

test("le module conserve un historique nominatif des présences par activité", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /x\.participantLabel\|\|"Participant"/);
  assert.match(html, /labels\[x\.status\]/);
  assert.match(html, /where\("activityId","==",id\)/);
});


test("le tableau de bord des activités calcule les indicateurs depuis Firestore", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  for (const id of ["statActivities", "statScheduled", "statDone", "statCancelled"]) assert.ok(html.includes('id="' + id + '"'));
  assert.match(html, /activities\.filter\(a=>a\.status==="planifiee"\)/);
  assert.match(html, /activities\.filter\(a=>a\.status==="realisee"\)/);
});


test("le registre des activités permet un filtre de statut combiné à la recherche", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="statusFilter"/);
  assert.match(html, /!\$\("statusFilter"\)\.value\|\|a\.status===\$\("statusFilter"\)\.value/);
  assert.match(html, /statusFilter"\)\.addEventListener\("change",render/);
});


test("les activités disposent de fiches détaillées accessibles", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /<dialog id="detailDialog"/);
  assert.match(html, /showActivityDetails\(a\)/);
  assert.match(html, /Description/);
  assert.match(html, /closeDetails/);
});


test("le calendrier des activités affiche une répartition dynamique et accessible", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="activityDistribution"/);
  assert.match(html, /function renderActivityDistribution\(\)/);
  assert.match(html, /bar\.value=Math\.round\(count\/total\*100\)/);
});


test("les fiches de présence peuvent être consultées et corrigées uniquement avec attendance.manage", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /async function updateAttendanceStatus\(/);
  assert.match(html, /if\(canAttendanceManage\)/);
  assert.match(html, /where\("activityId","==",id\)/);
  assert.match(html, /L’historique est conservé/);
});

test("les détails d’activité sont chargés dans un script exécutable, pas dans un script externe", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /<script src="https:\/\/www\.gstatic\.com\/firebasejs\/11\.10\.0\/firebase-app-compat\.js"><\/script>/);
  assert.match(html, /function showActivityDetails\(a\)/);
  assert.match(html, /closeDetails/);
});


test("les activités peuvent être rattachées à un projet sans rendre ce lien obligatoire", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="projectLinkField" hidden/);
  assert.match(html, /canLinkProject=canManage&&\(scopes\.includes\("projects\.read"\)\|\|scopes\.includes\("projects\.manage"\)\)/);
  assert.match(html, /if\(canLinkProject&&\$\("projectId"\)\.value\)data\.projectId=\$\("projectId"\)\.value/);
  assert.match(html, /\["Projet associé",linkedProjects\.find/);
});

test("les règles Firestore valident le projet associé et conservent une liste blanche stricte", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const block = rules.slice(rules.indexOf("match /activities/{activityId}"), rules.indexOf("// Feuilles de présence centralisées"));
  assert.match(block, /"projectId"/);
  assert.match(block, /exists\(\/databases\/\$\(database\)\/documents\/projects\/\$\(request\.resource\.data\.projectId\)\)/);
  assert.equal((block.match(/!\("projectId" in request\.resource\.data\)/g)||[]).length, 2);
});

test("le registre des présences propose des filtres dynamiques et un export CSV protégé", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="attendanceSearch"/);
  assert.match(html, /id="attendanceFilter"/);
  assert.match(html, /function filteredAttendance\(\)/);
  assert.match(html, /function renderAttendance\(\)/);
  assert.match(html, /function exportAttendanceCsv\(\)/);
  assert.match(html, /if\(!canAttendanceRead\)return/);
  assert.match(html, /\\uFEFF/);
  assert.match(html, /replace\(\/"\/g,'""'\)/);
  assert.match(html, /attendanceSearch"\)\.addEventListener\("input",renderAttendance\)/);
  assert.match(html, /attendanceFilter"\)\.addEventListener\("change",renderAttendance\)/);
});

test("le registre filtre les activités par projet uniquement avec le périmètre de lecture projets", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /id="projectFilter"[^>]*hidden/);
  assert.match(html, /\$\("projectFilter"\)\.hidden=!canLinkProject/);
  assert.match(html, /!\$\("projectFilter"\)\.value\|\|a\.projectId===\$\("projectFilter"\)\.value/);
  assert.match(html, /projectFilter"\)\.addEventListener\("change",render\)/);
});

test("modifier manuellement un participant dissocie la sélection préalable du Club Khuddam", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /function clearClubVolunteerSelection\(\)/);
  assert.match(html, /\["participantLabel","participantRef"\]\.forEach\(id=>\$\(id\)\.addEventListener\("input",clearClubVolunteerSelection\)\)/);
  assert.match(html, /participantType"\)\.addEventListener\("change",clearClubVolunteerSelection\)/);
  assert.match(html, /\$\("clubVolunteer"\)\.addEventListener\("change"/);
});




test("le registre Activités et Présences efface les données privées au changement de session", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /authGeneration=0/);
  assert.match(html, /function clearPrivateView\(\)/);
  assert.match(html, /activities=\[\];attendanceRecords=\[\];clubVolunteers=\[\];linkedProjects=\[\]/);
  assert.match(html, /const generation=\+\+authGeneration;clearPrivateView\(\)/);
  assert.match(html, /if\(generation!==authGeneration\)return/g);
  assert.match(html, /async function load\(generation=authGeneration\)/);
  assert.match(html, /async function loadAttendance\(generation=authGeneration\)/);
});


test("le registre des présences ignore une réponse liée à une ancienne activité sélectionnée", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /if\(generation!==authGeneration\|\|\$\("selectedActivity"\)\.value!==id\)return/);
});

test("le registre Activités efface les formulaires privés au changement de session", () => {
 const html=readFileSync(new URL("../activites.html",import.meta.url),"utf8");
 assert.match(html,/function clearPrivateView\(\)[\s\S]*?\$\("activityForm"\)\.reset\(\);\$\("attendanceForm"\)\.reset\(\)/);
});
