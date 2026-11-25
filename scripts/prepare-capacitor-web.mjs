import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const output = path.join(root, "web-dist");
const files = [
  "index.html",
  "site-institutionnel.html",
  "nour-al-hidaya.html",
  "administration.html",
  "programmes.html",
  "activites.html",
  "projets.html",
  "club-khuddam.html",
  "club-khuddam-inscription.html",
  "club-khuddam-espace.html",
  "portail.html",
  "firebase-init.js",
  "wat-brand.css",
  "wat-brand-nour.css",
  "sw.js",
  "manifest.json",
  "manifest-nour.json",
  "icon-192.png",
  "icon-512.png",
  "wat-icon-192.png",
  "wat-icon-512.png",
  "nour-icon-192.png",
  "nour-icon-512.png"
];

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const file of files) {
  const source = path.join(root, file);
  const target = path.join(output, file);
  await fs.access(source);
  await fs.copyFile(source, target);
}

// Le build APK de test peut forcer staging sans modifier les sources de production.
if (process["env"].WAT_FIREBASE_ENV === "staging") {
  const firebaseInit = path.join(output, "firebase-init.js");
  const source = await fs.readFile(firebaseInit, "utf8");
  await fs.writeFile(firebaseInit, 'window.WAT_FIREBASE_ENV = "staging";\n' + source);
}

const assets = path.join(root, "assets");
await fs.mkdir(assets, { recursive: true });
await sharp(path.join(assets, "brand", "wat", "ICONE WC.png")).resize(1024, 1024, { fit: "contain" }).png().toFile(path.join(assets, "icon.png"));

const vendor = path.join(output, "vendor");
await fs.mkdir(vendor, { recursive: true });
const sdkFiles = [
  "firebase-app-compat.js",
  "firebase-auth-compat.js",
  "firebase-firestore-compat.js"
];
for (const file of sdkFiles) {
  const url = `https://www.gstatic.com/firebasejs/11.10.0/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Téléchargement Firebase impossible : ${file} (${response.status})`);
  await fs.writeFile(path.join(vendor, file), Buffer.from(await response.arrayBuffer()));
}

const worker = path.join(output, "sw.js");
const workerSource = await fs.readFile(worker, "utf8");
const appFiles = /const APP_FILES = \[([\s\S]*?)\];/;
const externalAssets = /const EXTERNAL_ASSETS = \[[\s\S]*?\];/;
if (!appFiles.test(workerSource) || !externalAssets.test(workerSource)) {
  throw new Error("Listes de ressources du service worker introuvables.");
}
const vendoredAssets = sdkFiles.map(file => "./vendor/" + file);
await fs.writeFile(worker, workerSource
  .replace(/(const CACHE_NAME = "[^"]+)"/, '$1-embedded"')
  .replace(appFiles, (_, entries) => {
    const files = JSON.parse("[" + entries + "]");
    return "const APP_FILES = " + JSON.stringify([...files, ...vendoredAssets], null, 2) + ";";
  })
  .replace(externalAssets, "const EXTERNAL_ASSETS = [];"));

const htmlFiles = files.filter(file => file.endsWith(".html"));
for (const file of htmlFiles) {
  const target = path.join(output, file);
  let html = await fs.readFile(target, "utf8");
  for (const sdk of sdkFiles) {
    html = html.replaceAll(`https://www.gstatic.com/firebasejs/11.10.0/${sdk}`, `./vendor/${sdk}`);
  }
  await fs.writeFile(target, html);
}
console.log(`Préparation Capacitor terminée : ${files.length} ressources web et ${sdkFiles.length} SDK Firebase locaux copiés dans web-dist.`);
