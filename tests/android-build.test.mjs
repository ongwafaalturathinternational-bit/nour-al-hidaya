import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const config = JSON.parse(fs.readFileSync("capacitor.config.json", "utf8"));
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/android-apk.yml", "utf8");
const script = fs.readFileSync("scripts/prepare-capacitor-web.mjs", "utf8");

test("Capacitor cible WAT Connect avec un dossier web isolé", () => {
  assert.equal(config.appName, "WAT Connect");
  assert.equal(config.appId, "org.wafaalturath.watconnect");
  assert.equal(config.webDir, "web-dist");
  assert.ok(packageJson.dependencies["@capacitor/core"].startsWith("^8."));
  assert.ok(packageJson.dependencies["@capacitor/android"].startsWith("^8."));
  assert.ok(packageJson.devDependencies["@capacitor/cli"].startsWith("^8."));
});

test("la préparation APK ne copie que les pages et ressources web nécessaires", () => {
  for (const file of ["index.html", "activites.html", "projets.html", "club-khuddam.html", "firebase-init.js", "sw.js", "manifest.json"]) {
    assert.ok(script.includes(JSON.stringify(file)), file);
  }
  assert.doesNotMatch(script, /firestore\.rules|\.env|service-account|\.jks|\.keystore/);
  assert.match(script, /firebase-app-compat\.js/);
  assert.match(script, /replaceAll\(/);
  assert.match(script, /https:\/\/www\.gstatic\.com\/firebasejs\/11\.10\.0/);
});

test("le build APK est un artefact de test sans clé de signature de production", () => {
  assert.match(workflow, /node-version: 22/);
  assert.match(workflow, /cmdline-tools/);
  assert.doesNotMatch(workflow, /android-actions\/setup-android/);
  assert.match(workflow, /java-version: "21"/);
  assert.match(workflow, /npx cap add android/);
  assert.match(workflow, /assembleDebug/);
  assert.match(workflow, /upload-artifact@v4/);
  assert.doesNotMatch(workflow, /signingConfigs\.release|PLAY_STORE|keystore-password/i);
});
