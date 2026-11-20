import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "web-dist");
const files = [
  "index.html",
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
  "sw.js",
  "manifest.json",
  "manifest-nour.json",
  "icon-192.png",
  "icon-512.png"
];

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const file of files) {
  const source = path.join(root, file);
  const target = path.join(output, file);
  await fs.access(source);
  await fs.copyFile(source, target);
}

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
