import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("firebase-init.js", "utf8");

function boot(search = "", existingProjectId = null, siteKey = "", hostname = "wat-connect.example.org", buildEnvironment = null) {
  const initialized = [];
  const calls = [];
  const appCheckActivations = [];
  const app = existingProjectId
    ? { options: { projectId: existingProjectId } }
    : null;
  const appCheck = () => ({
    activate(provider, autoRefresh) {
      calls.push("appCheck");
      appCheckActivations.push({ provider, autoRefresh });
    }
  });
  appCheck.ReCaptchaEnterpriseProvider = class {
    constructor(key) { this.siteKey = key; }
  };
  const firebase = {
    apps: app ? [app] : [],
    initializeApp(config) {
      const created = { options: config };
      initialized.push(config);
      this.apps.push(created);
      return created;
    },
    app() { return this.apps[0]; },
    appCheck,
    auth() { calls.push("auth"); return { kind: "auth" }; },
    firestore() { calls.push("firestore"); return { kind: "firestore" }; }
  };
  const window = {
    firebase,
    location: { search, hostname },
    WAT_FIREBASE_ENV: buildEnvironment,
    addEventListener() {}
  };
  const document = {
    body: null,
    readyState: "complete",
    getElementById() { return null; },
    querySelector(selector) {
      return selector === 'meta[name="wat-recaptcha-site-key"]' && siteKey
        ? { content: siteKey }
        : null;
    }
  };
  const context = {
    window,
    document,
    navigator: { onLine: true },
    URLSearchParams,
    console
  };
  vm.runInNewContext(source, context, { filename: "firebase-init.js" });
  return { result: window.WATFirebase, initialized, calls, appCheckActivations };
}

test("production est sélectionné par défaut", () => {
  const { result, initialized } = boot("");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "production");
  assert.equal(result.projectId, "wat-connect");
  assert.equal(initialized.length, 1);
  assert.equal(initialized[0].projectId, "wat-connect");
});

test("un paramètre URL ne peut jamais basculer un domaine normal vers staging", () => {
  const { result, initialized } = boot("?wat-env=staging");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "production");
  assert.equal(result.projectId, "wat-connect");
  assert.equal(initialized[0].projectId, "wat-connect");
});

test("le Worker staging sélectionne Firebase staging même sans paramètre URL", () => {
  const { result, initialized } = boot("", null, "", "wat-connect-staging.ongwafaalturathinternational.workers.dev");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "staging");
  assert.equal(result.projectId, "wat-connect-staging");
  assert.equal(initialized[0].projectId, "wat-connect-staging");
});

test("un aperçu de branche reconnu sélectionne staging sans paramètre URL", () => {
  const { result, initialized } = boot("", null, "", "fix-lot8-club-onboarding-and-access-nour-al-hidaya.ongwafaalturathinternational.workers.dev");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "staging");
  assert.equal(result.projectId, "wat-connect-staging");
  assert.equal(initialized[0].projectId, "wat-connect-staging");
});

test("un autre sous-domaine workers.dev reste en production par défaut", () => {
  const { result, initialized } = boot("", null, "", "nour-al-hidaya.ongwafaalturathinternational.workers.dev");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "production");
  assert.equal(result.projectId, "wat-connect");
  assert.equal(initialized[0].projectId, "wat-connect");
});

test("une valeur inconnue conserve la production", () => {
  const { result, initialized } = boot("?wat-env=preview");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "production");
  assert.equal(result.projectId, "wat-connect");
  assert.equal(initialized[0].projectId, "wat-connect");
});

test("une application Firebase déjà initialisée sur un autre projet est bloquée", () => {
  const { result, initialized } = boot("", "wat-connect", "", "wat-connect-staging.ongwafaalturathinternational.workers.dev");
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

test("App Check Enterprise est activé avant Auth uniquement sur le projet staging", () => {
  const { result, calls, appCheckActivations } = boot("", null, "public-site-key", "wat-connect.example.org", "staging");
  assert.equal(result.ready, true);
  assert.equal(result.appCheckReady, true);
  assert.deepEqual(calls, ["appCheck", "auth", "firestore"]);
  assert.equal(appCheckActivations.length, 1);
  assert.equal(appCheckActivations[0].provider.siteKey, "public-site-key");
  assert.equal(appCheckActivations[0].autoRefresh, true);
});

test("une clé App Check n'est jamais activée sur le projet de production", () => {
  const { result, calls, appCheckActivations } = boot("", null, "public-site-key");
  assert.equal(result.ready, false);
  assert.equal(result.reason, "initialization-error");
  assert.deepEqual(calls, []);
  assert.equal(appCheckActivations.length, 0);
});


test("un APK Android de test peut sélectionner staging via sa configuration de build", () => {
  const { result, initialized } = boot("", null, "", "localhost", "staging");
  assert.equal(result.ready, true);
  assert.equal(result.environment, "staging");
  assert.equal(result.projectId, "wat-connect-staging");
  assert.equal(initialized[0].projectId, "wat-connect-staging");
});
