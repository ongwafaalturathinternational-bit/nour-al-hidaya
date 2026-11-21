import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("firebase-init.js", "utf8");

function createFirebaseHarness({ online = true, clearPersistence = async () => {}, page = "administration.html" } = {}) {
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
    initializeApp: () => ({}),
    app: () => ({}),
    auth: () => auth,
    firestore: () => db
  };
  const window = {
    firebase,
    location: {
      pathname: "/" + page,
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
