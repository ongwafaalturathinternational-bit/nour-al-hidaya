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
  for (const file of ["index.html", "site-institutionnel.html", "activites.html", "projets.html", "club-khuddam.html", "firebase-init.js", "wat-brand.css", "sw.js", "manifest.json"]) {
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

test("la préparation Android embarque la charte graphique facettée de WAT", () => {
  assert.ok(script.includes('"wat-brand.css"'));
  const css = fs.readFileSync("wat-brand.css", "utf8");
  for (const token of ["--wat-turquoise", "--wat-blue", "--wat-gold", "linear-gradient(145deg", ".wat-crystal-surface"]) {
    assert.ok(css.includes(token), "élément de charte absent : " + token);
  }
});

test("le build conserve un artefact web après vérification de Firebase staging", () => {
  const verification = workflow.indexOf("grep -Fq");
  const artifact = workflow.indexOf("name: wat-connect-web-staging");
  const sync = workflow.indexOf("npx cap sync android");
  assert.ok(verification >= 0 && artifact > verification && sync > artifact);
  assert.match(workflow, /name: wat-connect-web-staging\s+path: web-dist\/\s+if-no-files-found: error/);
});

test("le workflow APK restaure le cache Gradle après génération du projet", () => {
  const generation = workflow.indexOf("npx cap add android");
  const cache = workflow.indexOf("gradle/actions/setup-gradle@");
  const build = workflow.indexOf("assembleDebug");
  assert.ok(generation >= 0 && cache > generation && build > cache);
  assert.match(workflow, /gradle\/actions\/setup-gradle@[a-f0-9]{40}[^\n]*\s+with:\s+cache-read-only: false/);
});

test("toute ressource du paquet Capacitor déclenche le build APK", () => {
  const files = script.match(/const files = \[([\s\S]*?)\];/);
  assert.ok(files);
  const bundledFiles = JSON.parse("[" + files[1] + "]");
  const watchedPaths = new Set(
    [...workflow.matchAll(/^      - "([^"]+)"\s*$/gm)].map(match => match[1])
  );
  for (const file of [...bundledFiles, "assets/brand/wat/ICONE WC.png"]) {
    assert.ok(watchedPaths.has(file), "ressource Android non surveillée : " + file);
  }
});
