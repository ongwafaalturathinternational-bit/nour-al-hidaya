import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const club = fs.readFileSync("club-khuddam.html", "utf8");
const projects = fs.readFileSync("projets.html", "utf8");
const activities = fs.readFileSync("activites.html", "utf8");
const rules = fs.readFileSync("firestore.rules", "utf8");
const firebaseInit = fs.readFileSync("firebase-init.js", "utf8");

test("le Club conserve les trois catégories officielles de bénévoles", () => {
  for (const category of ["occasionnel", "engage", "contributeur"]) {
    assert.ok(club.includes(`value="${category}"`), `catégorie absente : ${category}`);
    assert.ok(rules.includes(`"${category}"`), `catégorie non autorisée par les règles : ${category}`);
  }
});

test("une candidature publique vérifiée est examinée avant son entrée au registre privé", () => {
  assert.match(rules, /match \/volunteerApplications\/\{applicationId\}/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /request\.resource\.data\.privacyConsent == true/);
  assert.match(club, /runTransaction\(async tx =>?\s*\{/);
  assert.match(club, /appSnap\.data\(\)\.status!==\"en_attente\"/);
  assert.match(club, /tx\.set\(volRef/);
  assert.match(club, /reviewedBy:user\.uid/);
  assert.match(rules, /allow delete: if false;/);
});

test("l'affectation projet est réservée aux bénévoles actifs et aux gestionnaires autorisés", () => {
  assert.match(projects, /volunteers\.filter\(x=>x\.status===\"actif\"\)/);
  assert.match(projects, /collection\(\"volunteers\"\)\.doc\(volunteerId\)/);
  assert.match(rules, /match \/projects\/\{projectId\}[\s\S]*?match \/volunteers\/\{assignmentId\}/);
  assert.match(rules, /staffHasScope\(\"projects\.manage\"\)/);
  assert.match(rules, /request\.resource\.data\.status in \[\"propose\", \"confirme\", \"retire\"\]/);
});

test("les présences sont centralisées et reliées à une activité", () => {
  assert.match(activities, /collection\(\"attendance\"\)\.where\(\"activityId\",\"==\",id\)/);
  assert.match(activities, /collection\(\"attendance\"\)\.add\(data\)/);
  assert.match(activities, /participantRef,participantLabel,participantType/);
  assert.match(rules, /match \/attendance\/\{recordId\}/);
  assert.match(rules, /exists\(\/databases\/\$\(database\)\/documents\/activities\/\$\(request\.resource\.data\.activityId\)\)/);
  assert.match(rules, /request\.resource\.data\.status in \[\"present\", \"absent\", \"excuse\"\]/);
});

test("les pages internes activent la persistance sans exposer le formulaire public au cache Firestore", () => {
  for (const page of ["index.html", "activites.html", "projets.html", "club-khuddam.html"]) {
    assert.ok(firebaseInit.includes(`"${page}"`), `page interne hors persistance : ${page}`);
  }
  assert.doesNotMatch(firebaseInit, /club-khuddam-inscription\.html/);
  assert.match(firebaseInit, /enablePersistence\(\{\s*synchronizeTabs:\s*true\s*\}\)/);
  assert.match(firebaseInit, /waitForPendingWrites\(\)/);
});

test("les fiches bénévoles et historiques opérationnels ne sont pas supprimables", () => {
  const volunteerRules = rules.slice(rules.indexOf("match /volunteers/{volunteerId}"), rules.indexOf("match /volunteerApplications"));
  assert.match(volunteerRules, /allow delete: if false;/);
  const attendanceRules = rules.slice(rules.indexOf("match /attendance/{recordId}"), rules.indexOf("match /volunteers/{volunteerId}"));
  assert.match(attendanceRules, /allow delete: if false;/);
});
