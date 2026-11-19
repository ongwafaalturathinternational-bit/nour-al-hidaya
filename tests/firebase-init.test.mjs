import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("firebase-init.js", "utf8");

function boot(search = "", existingProjectId = null) {
  const initialized = [];
  const app = existingProjectId
    ? { options: { projectId: existingProjectId } }
    : null;
  const firebase = {
    apps: app ? [app] : [],
    initializeApp(config) {
      const created = { options: config };
      initialized.push(config);
      this.apps.push(created);
      return created;
    },
    app() { return this.apps[0]; },
    auth() { return { kind: "auth" }; },
    firestore() { return { kind: "firestore" }; }
  };
  const window = {
    firebase,
    location: { search },
    addEventListener() {}
  };
  const document = {
    body: null,
    readyState: "complete",
    getElementById() { return null; }
  };
  const context = {
    window,
    document,
    navigator: { onLine: true },
    URLSearchParams,
    console
  };
  vm.runInNewContext(source, context, { filename: "firebase-init.js" });
  return { result: window.WATFirebase, initialized };
}

test("production est sélectionné par défaut", () => {
  const { result, initialized } = boot("");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "production");
  assert.equal(result.projectId, "wat-connect");
  assert.equal(initialized.length, 1);
  assert.equal(initialized[0].projectId, "wat-connect");
});

test("staging n'est sélectionné qu'avec le paramètre explicite", () => {
  const { result, initialized } = boot("?wat-env=staging");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "staging");
  assert.equal(result.projectId, "wat-connect-staging");
  assert.equal(initialized[0].projectId, "wat-connect-staging");
});

test("une valeur inconnue conserve la production", () => {
  const { result, initialized } = boot("?wat-env=preview");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "production");
  assert.equal(result.projectId, "wat-connect");
  assert.equal(initialized[0].projectId, "wat-connect");
});

test("une application Firebase déjà initialisée sur un autre projet est bloquée", () => {
  const { result, initialized } = boot("?wat-env=staging", "wat-connect");
  assert.equal(result.ready, false);
  assert.equal(result.reason, "initialization-error");
  assert.equal(initialized.length, 0);
});

test("une application déjà initialisée sur le bon projet est réutilisée", () => {
  const { result, initialized } = boot("", "wat-connect");
  assert.equal(result.ready, true);
  assert.equal(result.projectId, "wat-connect");
  assert.equal(initialized.length, 0);
});
