#!/usr/bin/env node
/**
 * Extraction locale du plan SYCEBNL depuis les pages publiques par classe.
 *
 * Source de transcription secondaire : OpenData Altius Group, dont chaque
 * fiche de compte renvoie au Journal officiel OHADA, numéro spécial du
 * 22 février 2023, pages imprimées 75-105.
 *
 * IMPORTANT : le résultat est un brouillon de référentiel à rapprocher du
 * Journal officiel et du document détenu par WAT avant activation comptable.
 * Ce script n'utilise pas l'API payante ni aucune clé/token.
 *
 * Usage : node scripts/extract-sycebnl-chart.mjs
 * Sortie : data/sycebnl-chart.review.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE = "https://opendata.altius-group.ch/economics/ohada/sycebnl/classe-";
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EXPECTED_TRANSCRIPTION_COUNT = 1142;

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê")
    .replace(/&agrave;/g, "à")
    .replace(/&ocirc;/g, "ô")
    .replace(/&ucirc;/g, "û")
    .replace(/&ccedil;/g, "ç")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&ndash;|&mdash;/g, "–")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchClass(classNumber) {
  const url = BASE + classNumber + "/";
  const response = await fetch(url, {
    headers: { "user-agent": "WAT-Connect-SYCEBNL-Chart-Review/1.0" },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Classe ${classNumber}: HTTP ${response.status}`);
  const html = await response.text();
  const accounts = [];
  const pattern = /<a\b[^>]*href=["'][^"']*\/compte-(\d+)\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const code = match[1];
    const label = stripTags(match[2]);
    if (!label || accounts.some(account => account.code === code)) continue;
    accounts.push({ code, label, classNumber });
  }
  if (accounts.length === 0) {
    throw new Error(`Aucun compte détecté pour la classe ${classNumber}; structure HTML à réexaminer.`);
  }
  return { classNumber, url, accounts };
}

const pages = [];
for (const classNumber of CLASSES) {
  process.stdout.write(`Extraction classe ${classNumber}…\\n`);
  pages.push(await fetchClass(classNumber));
}

const byCode = new Map();
for (const page of pages) {
  for (const account of page.accounts) {
    if (byCode.has(account.code)) throw new Error(`Code dupliqué : ${account.code}`);
    byCode.set(account.code, account);
  }
}

const accounts = [...byCode.values()]
  .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }))
  .map(account => {
    const parent = [...byCode.keys()]
      .filter(code => code !== account.code && account.code.startsWith(code))
      .sort((a, b) => b.length - a.length)[0] ?? null;
    return {
      ...account,
      parentCode: parent,
      level: account.code.length,
      postable: ![...byCode.keys()].some(code => code !== account.code && code.startsWith(account.code)),
      status: "review_required",
      source: "Altius Group public SYCEBNL transcription; cross-check against OHADA Journal officiel required"
    };
  });

for (const account of accounts) {
  if (account.parentCode && !byCode.has(account.parentCode)) {
    throw new Error(`Parent absent pour ${account.code}: ${account.parentCode}`);
  }
}

const countsByClass = Object.fromEntries(CLASSES.map(number => [
  number, accounts.filter(account => account.classNumber === number).length
]));
const output = {
  framework: "SYCEBNL",
  currency: "XOF",
  version: "2024-01-01",
  extractionStatus: "REVIEW_REQUIRED_NOT_FOR_POSTING",
  source: {
    title: "Journal officiel OHADA, numéro spécial du 22 février 2023",
    officialReference: "Partie 2, chapitre 2, section 3, pages imprimées 76 à 105",
    officialLandingPage: "https://www.ohada.org/acte-uniforme-relatif-au-systeme-comptable-des-entites-a-but-non-lucratif/",
    transcriptionPages: pages.map(page => page.url),
    note: "Transcription secondaire structurée. Vérifier chaque code et libellé avec le Journal officiel et la copie de référence WAT avant activation."
  },
  extraction: {
    generatedAt: new Date().toISOString(),
    count: accounts.length,
    comparisonCountReportedBySource: EXPECTED_TRANSCRIPTION_COUNT,
    countsByClass
  },
  accounts
};

const target = resolve("data/sycebnl-chart.review.json");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, JSON.stringify(output, null, 2) + "\\n", "utf8");
console.log(`\\nFichier créé : ${target}`);
console.log(`Comptes extraits : ${accounts.length} (référence de la source : ${EXPECTED_TRANSCRIPTION_COUNT})`);
console.log("Répartition :", countsByClass);
console.log("Statut : brouillon de vérification uniquement; aucun compte activé pour la saisie.");
