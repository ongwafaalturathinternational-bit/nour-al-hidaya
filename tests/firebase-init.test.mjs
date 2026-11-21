import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("firebase-init.js", "utf8");

function createFirebaseHarness({ online = true, clearPersistence = async () => {}, page = "administration.html", hostname = "example.org" } = {}) {
  const calls = [];
  const auth = {
    signOut: async () => { calls.push("auth.signOut"); }
  };
  const db = {
    enablePersistence: async () => { calls.push("enablePersistence"); },
    waitForPendingWrites: async () => { calls.push("waitForPendingWrites"); },
    terminate: async () => { calls.push("terminate"); },
    clearPersistence: async () => { calls.push("clearPersistence"); return clearPersistence(); }
  };
  const firebase = {
    apps: [],
    initializeApp: (options) => {
      const app = { options };
      firebase.apps.push(app);
      return app;
    },
    app: () => firebase.apps[0],
    auth: () => auth,
    firestore: () => db
  };
  const window = {
    firebase,
    location: {
      pathname: "/" + page,
      hostname,
      assign: (url) => calls.push("navigate:" + url)
    }
  };
  const document = {
    readyState: "complete",
    body: null,
    getElementById: () => null
  };
  vm.runInNewContext(source, {
    window,
    document,
    navigator: { onLine: online },
    console
  });
  return { wat: window.WATFirebase, calls };
}

test("une erreur d'effacement du cache (ex. autre onglet actif) bloque la déconnexion", async () => {
  const harness = createFirebaseHarness({
    clearPersistence: async () => {
      const error = new Error("Firestore persistence is still active in another tab");
      error.code = "failed-precondition";
      throw error;
    }
  });

  await harness.wat.persistenceReady;
  await assert.rejects(harness.wat.signOutSafely(), /still active in another tab/);
  assert.deepEqual(harness.calls, [
    "enablePersistence",
    "waitForPendingWrites",
    "terminate",
    "clearPersistence"
  ]);
  assert.equal(harness.calls.includes("auth.signOut"), false);
  assert.equal(harness.calls.some(call => call.startsWith("navigate:")), false);
});

test("hors connexion, la déconnexion refuse de purger un cache avec persistance active", async () => {
  const harness = createFirebaseHarness({ online: false });
  await harness.wat.persistenceReady;

  await assert.rejects(harness.wat.signOutSafely(), /Reconnectez-vous/);
  assert.deepEqual(harness.calls, ["enablePersistence"]);
  assert.equal(harness.calls.includes("auth.signOut"), false);
});


test("l'application Android et les domaines ordinaires utilisent uniquement Firebase production", async () => {
  const android = createFirebaseHarness({ hostname: "localhost" });
  await android.wat.persistenceReady;
  assert.equal(android.wat.projectId, "wat-connect");
  assert.equal(android.wat.environment, "production");

  const website = createFirebaseHarness({ hostname: "wafaalturath.org" });
  await website.wat.persistenceReady;
  assert.equal(website.wat.projectId, "wat-connect");
  assert.equal(website.wat.environment, "production");
});

test("le domaine staging utilise exclusivement le projet Firebase de test", async () => {
  const staging = createFirebaseHarness({
    hostname: "wat-connect-staging.ongwafaalturathinternational.workers.dev"
  });
  await staging.wat.persistenceReady;
  assert.equal(staging.wat.projectId, "wat-connect-staging");
  assert.equal(staging.wat.environment, "staging");
  assert.equal(staging.wat.app.options.projectId, "wat-connect-staging");
});


test("les aperçus Cloudflare de la branche utilisent Firebase staging et non la production", async () => {
  const preview = createFirebaseHarness({
    hostname: "fix-lot8-club-onboarding-and-access-nour-al-hidaya.ongwafaalturathinternational.workers.dev"
  });
  await preview.wat.persistenceReady;
  assert.equal(preview.wat.projectId, "wat-connect-staging");
  assert.equal(preview.wat.environment, "staging");
});
