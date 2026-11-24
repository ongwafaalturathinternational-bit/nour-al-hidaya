import test from "node:test";
import { distributeReminder, prepareReminder, reserveReminder } from "../lib/wat-reminders.mjs";

test("un rappel exige la révision courante, une audience et un consentement actifs", () => {
  const event = {id:"e1", revision:1, status:"published", audience:["u1"], title:"Dossier privé"};
  const scheduled = {eventId:"e1", revision:1, recipientUid:"u1", channel:"push"};
  const recipient = {uid:"u1", active:true, optInChannels:["push"]};
  const request = {event, scheduled, recipient};
  const reminder = prepareReminder(request);
  assert.deepEqual(reminder, {key:'["e1",1,"u1","push"]',channel:"push",message:"Vous avez un rappel WAT Connect."});
  assert.deepEqual(prepareReminder(request), reminder);
  for (const override of [
    {event:{...event,status:"cancelled"}}, {event:{...event,revision:2}},
    {event:{...event,audience:[]}}, {recipient:{...recipient,active:false}},
    {recipient:{...recipient,optInChannels:[]}}, {recipient:{...recipient,uid:"u2"}}
  ]) assert.equal(prepareReminder({...request,...override}),null);
});
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("la distribution conserve un résultat incertain sans réexpédier", async () => {
  for (const accepted of [true,false]) {
    const documents = new Map([
      ["event",{status:"published",revision:1,audience:["u1"]}],
      ["u1",{active:true,optInChannels:["push"]}]
    ]);
    const db = {runTransaction:callback=>callback({
      get:async ref=>({id:ref.id,exists:documents.has(ref.id),data:()=>documents.get(ref.id)}),
      create:(ref,value)=>documents.set(ref.id,value)
    })};
    let sent=0;
    const receipts={doc:id=>({id,async update(value){documents.set(id,value)}})};
    const input={db,eventRef:{id:"event"},recipientRef:{id:"u1"},receipts,
      scheduled:{eventId:"event",revision:1,recipientUid:"u1",channel:"push"},
      send:async request=>{
        sent++;
        assert.equal(request.idempotencyKey,'["event",1,"u1","push"]');
        if (!accepted) throw new Error("délai dépassé");
        return {accepted:true};
      }};
    const status=accepted?"accepted":"uncertain";
    assert.deepEqual(await distributeReminder(input),{status});
    assert.deepEqual(documents.get(encodeURIComponent('["event",1,"u1","push"]')),{status});
    assert.deepEqual(await distributeReminder(input),{status:"already-reserved"});
    assert.equal(sent,1);
  }
});

test("la réservation relit l’éligibilité et une seule tentative reçoit le rappel", async () => {
  const eventRef = "event";
  const recipientRef = "recipient";
  const records = new Map([
    [eventRef, {id:"e1", revision:1, status:"published", audience:["u1"]}],
    [recipientRef, {id:"u1", active:true, optInChannels:["push"]}]
  ]);
  let pending = Promise.resolve();
  const db = {
    runTransaction(run) {
      const execution = pending.then(() => run({
        async get(ref) {
          return {exists:records.has(ref), id:records.get(ref)?.id, data:()=>records.get(ref)};
        },
        create(ref, value) {
          assert.equal(records.has(ref),false);
          records.set(ref,value);
        }
      }));
      pending = execution;
      return execution;
    }
  };
  const input = {db,eventRef,recipientRef,receipts:{doc:id=>"receipts/"+id},
    scheduled:{eventId:"e1", revision:1, recipientUid:"u1", channel:"push"}};
  const results = await Promise.all([reserveReminder(input), reserveReminder(input)]);
  assert.deepEqual(results.map(result=>result.status),["reserved","already-reserved"]);
  assert.equal(results[0].reminder.message,"Vous avez un rappel WAT Connect.");
  assert.equal(records.size,3);
  records.set(eventRef, {...records.get(eventRef), revision:2});
  assert.deepEqual(await reserveReminder(input),{status:"ineligible"});
  records.set(recipientRef, {...records.get(recipientRef), optInChannels:[]});
  assert.deepEqual(await reserveReminder({...input, scheduled:{...input.scheduled, revision:2}}),{status:"ineligible"});
  assert.equal(records.size,3);
});

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
  assert.match(html, /function isCurrentAuthAccount\(account,generation\)/);
  assert.match(html, /await WATFirebase\.persistenceReady;if\(!isCurrentAuthAccount\(account,generation\)\)return/);
  assert.match(html, /async function load\(generation=authGeneration\)/);
  assert.match(html, /async function loadAttendance\(generation=authGeneration\)/);
});


test("le registre des présences ignore une réponse liée à une ancienne activité sélectionnée", () => {
  const html = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  assert.match(html, /if\(!isCurrentStaffSession\(user,generation\)\|\|\$\("selectedActivity"\)\.value!==id\)return/);
});

test("le registre Activités efface les formulaires privés au changement de session", () => {
 const html=readFileSync(new URL("../activites.html",import.meta.url),"utf8");
 assert.match(html,/function clearPrivateView\(\)[\s\S]*?\$\("activityForm"\)\.reset\(\);\$\("attendanceForm"\)\.reset\(\)/);
});

test("les formulaires Activités et Présences bloquent les doubles soumissions et réinitialisent les boutons", () => {
  const page = readFileSync(new URL("../activites.html", import.meta.url), "utf8");
  const reset = page.slice(page.indexOf("function clearPrivateView"), page.indexOf("async function init(account)"));
  assert.match(reset, /\$\("saveActivity"\)\.disabled=false/);
  assert.match(reset, /\$\("saveAttendance"\)\.disabled=true/);
  for (const [form, button] of [["activityForm", "saveActivity"], ["attendanceForm", "saveAttendance"]]) {
    const start = page.indexOf('$("' + form + '").addEventListener("submit"');
    const handler = page.slice(start, page.indexOf("\n", start));
    const guard = handler.indexOf('if($("' + button + '").disabled)return');
    const disable = handler.indexOf('$("' + button + '").disabled=true');
    assert.ok(start >= 0 && guard >= 0 && disable > guard);
    assert.ok(handler.indexOf("await WATFirebase.db.collection") > disable);
  }
});
