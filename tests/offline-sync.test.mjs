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

test("les files Nour isolent les entrées locales illisibles et gardent les éléments valides", () => {
  const readerSource = ["function readStoredQueue", "const progressQueueKey", "function readProgressQueue",
    "const learningQueueKey", "function readLearningQueue"].map(marker => {
    const offset = nour.indexOf(marker);
    assert.notEqual(offset, -1);
    const end = nour.indexOf(marker.startsWith("const") ? "\n" : "\n}", offset);
    return nour.slice(offset, end + (marker.startsWith("const") ? 0 : 2));
  }).join("\n");
  const storage = new Map();
  const { readProgressQueue, readLearningQueue } = vm.runInNewContext(
    readerSource + "\n({ readProgressQueue, readLearningQueue })",
    { localStorage: { getItem: key => storage.get(key) } },
  );
  const progress = { lessonId: 1, score: 2, total: 3 };
  const learning = { recordId: "reflection_1", data: { kind: "reflection", value: "" } };
  storage.set("nh_progress_queue_learner", JSON.stringify([null, {}, progress]));
  storage.set("nh_learning_queue_learner", JSON.stringify([null, { recordId: "bad", data: [] }, learning]));
  assert.deepEqual(JSON.parse(JSON.stringify(readProgressQueue("learner"))), [progress]);
  assert.deepEqual(JSON.parse(JSON.stringify(readLearningQueue("learner"))), [learning]);
  storage.set("nh_progress_queue_learner", "{}");
  storage.set("nh_learning_queue_learner", "[");
  assert.equal(readProgressQueue("learner").length, 0);
  assert.equal(readLearningQueue("learner").length, 0);
});

test("Nour signale un refus du stockage local pour les deux files", async () => {
  const messages = [];
  const queues = vm.runInNewContext(
    nour.slice(start, nour.indexOf("/* ---------- authentification Firebase", start)) +
      "\n({queueAndSyncProgress,queueAndSyncLearning})",
    {
      localStorage: {
        getItem: () => "[]",
        setItem: () => { throw Error("quota"); }
      },
      toast: message => messages.push(message),
      console: { error() {} }
    }
  );
  await queues.queueAndSyncProgress("learner", "1", 1, 2);
  await queues.queueAndSyncLearning("learner", "reflection_1", { value: "test" });
  assert.equal(messages.length, 2);
  assert.ok(messages.every(message => /file de synchronisation/.test(message)));
});

test("un devoir Nour reste en attente jusqu’à la confirmation de son envoi", async () => {
  const stored = new Map();
  const state = { subs: [] };
  let confirm;
  const navigator = { onLine: false };
  const user = { emailVerified: true };
  const firebase = {
    ready: true,
    auth: { currentUser: user },
    db: {
      collection() { return this; },
      doc() { return this; },
      set() { return new Promise(resolve => { confirm = resolve; }); }
    }
  };
  const queues = vm.runInNewContext(
    nour.slice(start, nour.indexOf("/* ---------- authentification Firebase", start)) +
      "\n({queueAndSyncLearning,syncPendingLearning})",
    {
      S: state,
      navigator,
      localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
      window: { WATFirebase: firebase },
      WATFirebase: firebase,
      firebase: { firestore: { FieldValue: { serverTimestamp() {} } } },
      firebaseAuthGeneration: 0,
      isCurrentFirebaseSession: () => true,
      render() {},
      console
    }
  );

  const data = { kind: "submission", itemId: "1", value: "devoir", date: "2026-11-24" };
  await queues.queueAndSyncLearning("learner", "submission_1", data);
  assert.equal(state.subs[0].pending, true);
  navigator.onLine = true;
  const flush = queues.syncPendingLearning("learner");
  assert.equal(state.subs[0].pending, true);
  confirm();
  assert.equal(await flush, 1);
  assert.equal(state.subs[0].pending, false);
});
