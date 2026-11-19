import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("finance.html contient un JavaScript valide", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), "Script finance n°" + (index + 1)));
});

test("les accès lecture, saisie, validation et budgets sont indépendants", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /scopes\.includes\("finance\.read"\)/);
  assert.match(html, /scopes\.includes\("finance\.manage"\)/);
  assert.match(html, /scopes\.includes\("finance\.validate"\)/);
  assert.match(html, /scopes\.includes\("finance\.budgets\.manage"\)/);
  assert.match(html, /if\(canValidate\)/);
  assert.match(html, /t\.createdBy!==user\.uid/);
  assert.match(html, /canManage/);
  assert.match(html, /if\(canBudgetManage\)/);
});

test("les indicateurs comptabilisent uniquement les opérations validées", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /transactions\.filter\(t=>t\.status==="validee"\)/);
  assert.match(html, /status:"soumise"/);
  assert.match(html, /Exporter le registre filtré/);
  assert.match(html, /function renderExpenseChart\(\)/);
});

test("les données financières restent séparées et les opérations ne sont pas supprimées", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/financeTransactions\//);
  assert.match(rules, /match \/financeBudgets\//);
  assert.match(rules, /staffHasScope\("finance\.validate"\)/);
  assert.match(rules, /allow delete: if false;/);
});


test("le registre Finance expose les fiches détaillées et les rapports de trésorerie", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /id="transactionDialog"/);
  assert.match(html, /function showTransactionDetails\(t\)/);
  assert.match(html, /function renderMonthlyChart\(\)/);
  assert.match(html, /function renderPaymentSummary\(\)/);
  assert.match(html, /id="paymentRows"/);
  assert.match(html, /id="monthlyChart"/);
});


test("les apports en nature sont exclus du solde de trésorerie et des flux mensuels", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /cashIncome/);
  assert.match(html, /paymentMethod!=="nature"/);
  assert.match(html, /Solde de trésorerie/);
  assert.match(html, /Contribution en nature/);
});

test("les fiches imprimables restent des documents internes et ne se présentent pas comme des reçus fiscaux", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /id="printTransaction"/);
  assert.match(html, /function printTransaction\(\)/);
  assert.match(html, /window\.print\(\)/);
  assert.match(html, /ni un reçu fiscal ni une attestation de don officielle/);
  assert.match(html, /id="printSheet"/);
});

test("les budgets disposent d'un export CSV distinct avec montants rapprochés selon les droits", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /id="exportBudgets"/);
  assert.match(html, /function exportBudgetsCsv\(\)/);
  assert.match(html, /spent===null\?"Non autorisé":spent/);
  assert.match(html, /WAT-budgets-previsionnels\.csv/);
  assert.match(html, /String\.fromCharCode\(0xFEFF\)/);
});
