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
console.log(`Préparation Capacitor terminée : ${files.length} ressources copiées dans web-dist.`);
