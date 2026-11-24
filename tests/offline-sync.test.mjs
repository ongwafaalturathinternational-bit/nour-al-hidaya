import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const init = fs.readFileSync("firebase-init.js", "utf8");

const nour = fs.readFileSync("nour-al-hidaya.html", "utf8");
const start = nour.indexOf("const queueFlushes = new Map();");
const end = nour.indexOf("const progressQueueKey", start);
const createFlusher = (navigator) => vm.runInNewContext(nour.slice(start, end) + "\nflushQueuedWrites", { navigator });

test("une écriture confirmée ne supprime pas une mise à jour saisie pendant la synchronisation", async () => {
  const flush = createFlusher();
  let items = [{recordId:"reflection_1",value:"première note"}];
  let confirm;
  const sent = [];
  const options = {
    key:"learning:learner",
    isActive:()=>true,
    read:()=>items.slice(),
    save:next=>{items=Array.from(next)},
    send:item=>{
      sent.push(item.value);
      if(sent.length===1)return new Promise(resolve=>{confirm=resolve});
    },
    onError:assert.fail
  };
  const first=flush(options);
  items=[{recordId:"reflection_1",value:"nouvelle note"},{recordId:"practice_2",value:"exercice"}];
  const second=flush(options);
  assert.deepEqual(sent,["première note"]);
  confirm();
  assert.equal(await first,1);
  assert.equal(await second,2);
  assert.deepEqual(sent,["première note","nouvelle note","exercice"]);
  assert.deepEqual(items,[]);
});

test("un refus et un changement de session laissent les écritures à reprendre", async () => {
  const flush = createFlusher();
  let active=true;
  let items=[{lessonId:"1"},{lessonId:"2"},{lessonId:"3"}];
  const sent=[];
  const errors=[];
  const options={
    key:"progress:learner",
    isActive:()=>active,
    read:()=>items.slice(),
    save:next=>{items=Array.from(next)},
    send:async item=>{
      sent.push(item.lessonId);
      if(item.lessonId==="1")throw Error("hors réseau");
      active=false;
    },
    onError:error=>errors.push(error.message)
  };
  assert.equal(await flush(options),0);
  assert.deepEqual(sent,["1","2"]);
  assert.deepEqual(errors,["hors réseau"]);
  assert.deepEqual(items.map(item=>item.lessonId),["1","2","3"]);
  active=true;
  assert.equal(await flush({...options, send:async()=>{}}),3);
  assert.deepEqual(items,[]);
});

test("les modules opérationnels activent le cache Firestore hors connexion multi-onglets", () => {
  assert.match(init, /db\.enablePersistence\(\{\s*synchronizeTabs:\s*true\s*\}\)/);
  assert.doesNotMatch(init, /club-khuddam-inscription\.html/);
  assert.match(init, /persistenceReady/);
  assert.match(init, /persistenceEnabled/);
});

test("les écritures en attente sont synchronisées avant l'effacement du cache à la déconnexion", () => {
  assert.match(init, /await db\.waitForPendingWrites\(\)/);
  assert.match(init, /await db\.terminate\(\)/);
  assert.match(init, /await db\.clearPersistence\(\)/);
  assert.match(init, /Reconnectez-vous pour synchroniser les modifications en attente/);
});

test("les écrans Projets, Activités et Club attendent l'initialisation du cache avant lecture", () => {
  for (const file of ["index.html", "activites.html", "projets.html", "club-khuddam.html"]) {
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, /await WATFirebase\.persistenceReady/, file);
    assert.match(html, /WATFirebase\.signOutSafely\(\)/, file);
  }
});

test("le message hors connexion distingue le cache disponible du mode non pris en charge", () => {
  assert.match(init, /données déjà consultées restent disponibles/);
  assert.match(init, /seront synchronisées au retour du réseau/);
  assert.match(init, /cache hors connexion n'est pas disponible/);
});


test("deux onglets coordonnent l’envoi d’une même file quand Web Locks est disponible", async () => {
  const locks = new Map();
  const navigator = {
    locks: {
      request(name, callback) {
        const previous = locks.get(name) ?? Promise.resolve();
        const pending = previous.then(callback, callback);
        locks.set(name, pending);
        return pending;
      }
    }
  };
  const firstTab = createFlusher(navigator);
  const secondTab = createFlusher(navigator);
  let items = [{ lessonId: "1" }];
  const sent = [];
  let confirm;
  let started;
  const firstSend = new Promise(resolve => { started = resolve; });
  const options = {
    key: "progress:learner",
    isActive: () => true,
    read: () => items.slice(),
    save: next => { items = Array.from(next); },
    send: item => {
      sent.push(item.lessonId);
      return new Promise(resolve => {
        confirm = resolve;
        started();
      });
    },
    onError: assert.fail
  };
  const first = firstTab(options);
  await firstSend;
  const second = secondTab({ ...options, send: item => { sent.push(item.lessonId); } });
  await Promise.resolve();
  assert.deepEqual(sent, ["1"]);
  confirm();
  assert.deepEqual(await Promise.all([first, second]), [1, 0]);
  assert.deepEqual(sent, ["1"]);
  assert.deepEqual(items, []);
});

test("un échec de confirmation locale ne compte pas l’écriture et interrompt l’envoi", async () => {
  const flush = createFlusher();
  const items = [{ lessonId: "1" }, { lessonId: "2" }];
  const sent = [];
  const errors = [];
  const count = await flush({
    key: "progress:learner",
    isActive: () => true,
    read: () => items.slice(),
    save: () => { throw Error("stockage indisponible"); },
    send: async item => sent.push(item.lessonId),
    onError: error => errors.push(error.message),
  });
  assert.equal(count, 0);
  assert.deepEqual(sent, ["1"]);
  assert.deepEqual(errors, ["stockage indisponible"]);
  assert.equal(items.length, 2);
});
