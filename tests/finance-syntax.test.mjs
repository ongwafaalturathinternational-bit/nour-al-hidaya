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

test("le registre des caisses est isolé et les opérations peuvent référencer un compte actif", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(html, /id="accountsArea"/);
  assert.match(html, /id="accountForm"/);
  assert.match(html, /id="accountId"/);
  assert.match(html, /function renderAccounts\(\)/);
  assert.match(html, /function closeAccount\(a\)/);
  assert.match(html, /finance\.accounts\.manage/);
  assert.match(rules, /match \/financeAccounts\//);
  assert.match(rules, /request\.resource\.data\.accountId/);
  assert.match(rules, /get\(\/databases\/\$\(database\)\/documents\/financeAccounts/);
  assert.match(rules, /allow delete: if false;/);
});

test("les transferts internes sont distincts des recettes et dépenses et soumis à validation", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(html, /id="transferForm"/);
  assert.match(html, /id="transferRows"/);
  assert.match(html, /function renderTransfers\(\)/);
  assert.match(html, /function reviewTransfer\(t,status\)/);
  assert.match(html, /financeTransfers/);
  assert.match(rules, /match \/financeTransfers\//);
  assert.match(rules, /request\.resource\.data\.sourceAccountId != request\.resource\.data\.destinationAccountId/);
  assert.match(rules, /request\.auth\.uid != resource\.data\.createdBy/);
});

test("les rapports financiers distinguent les apports en nature, les donateurs et les projets", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /function donorSummaryRows\(\)/);
  assert.match(html, /function renderDonorSummary\(\)/);
  assert.match(html, /function projectFinanceRows\(\)/);
  assert.match(html, /function renderProjectFinance\(\)/);
  assert.match(html, /function exportAnnualSummaryCsv\(\)/);
  assert.match(html, /function exportDonorsCsv\(\)/);
  assert.match(html, /function exportProjectFinanceCsv\(\)/);
  assert.match(html, /paymentMethod==="nature"/);
  assert.match(html, /WAT-rapport-annuel-financier\.csv/);
  assert.match(html, /WAT-synthese-contributions\.csv/);
  assert.match(html, /WAT-situation-financiere-projets\.csv/);
});

test("les rapports par donateur et par projet suivent le filtre d'exercice", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /const groups=new Map\(\),selected=\$\("yearFilter"\)\.value/);
  assert.match(html, /renderDonorSummary\(\);renderProjectFinance\(\)/);
  assert.match(html, /\["don","cotisation","subvention","collecte"\]/);
});

test("le registre des transferts internes est exportable séparément", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /id="exportTransfers"/);
  assert.match(html, /function exportTransfersCsv\(\)/);
  assert.match(html, /WAT-transferts-internes\.csv/);
});

test("la clôture annuelle est visible, irréversible et intégrée aux formulaires", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(html, /id="periodArea"/);
  assert.match(html, /id="periodForm"/);
  assert.match(html, /function closePeriod\(year,note\)/);
  assert.match(html, /fiscalYear:date\.slice\(0,4\)/);
  assert.match(rules, /match \/financePeriods\//);
  assert.match(rules, /finance\.periods\.manage/);
  assert.match(rules, /!exists\(\/databases\/\$\(database\)\/documents\/financePeriods/);
  assert.match(rules, /request\.resource\.data\.date\.matches/);
});

test("le rapprochement des comptes conserve un instantané distinct du solde et exige un second valideur", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(html, /id="reconciliationArea"/);
  assert.match(html, /id="reconciliationForm"/);
  assert.match(html, /function accountComputedBalance\(accountId,asOfDate\)/);
  assert.match(html, /function renderReconciliations\(\)/);
  assert.match(html, /financeReconciliations/);
  assert.match(rules, /match \/financeReconciliations\//);
  assert.match(rules, /request\.auth\.uid != resource\.data\.createdBy/);
  assert.match(rules, /allow delete: if false;/);
});

test("la clôture d’un compte exige aussi un droit de lecture du registre financier", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(rules, /allow update: if staffHasScope\("finance\.accounts\.manage"\)\s*&& \(staffHasScope\("finance\.read"\) \|\| staffHasScope\("finance\.manage"\) \|\| staffHasScope\("finance\.validate"\)\)/);
  assert.match(html, /if\(canAccountsManage&&canRead\)/);
});

test("les clôtures annuelles disposent d’un export CSV de leurs instantanés", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /id="exportClosedPeriods"/);
  assert.match(html, /function exportClosedPeriodsCsv\(\)/);
  assert.match(html, /WAT-clotures-annuelles\.csv/);
  assert.match(html, /exportClosedPeriodsCsv\);/);
});

test("la clôture annuelle fige une synthèse comptable consultable", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(html, /function buildPeriodSnapshot\(year\)/);
  assert.match(html, /snapshot,closedAt:firebase\.firestore\.FieldValue\.serverTimestamp\(\)/);
  assert.match(html, /p\.snapshot\|\|\{\}/);
  assert.match(rules, /request\.resource\.data\.snapshot\.netCash == request\.resource\.data\.snapshot\.receiptsCash - request\.resource\.data\.snapshot\.expenses/);
});

test("la clôture d’un compte est bloquée côté interface tant que des écritures, transferts ou rapprochements sont en attente", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /pendingTransactions=transactions\.filter\(t=>t\.accountId===a\.id&&t\.status==="soumise"\)/);
  assert.match(html, /pendingTransfers=transfers\.filter\(t=>\(t\.sourceAccountId===a\.id\|\|t\.destinationAccountId===a\.id\)&&t\.status==="soumise"\)/);
  assert.match(html, /pendingReconciliations=reconciliations\.filter\(r=>r\.accountId===a\.id&&r\.status==="soumise"\)/);
  assert.match(html, /Clôture impossible/);
});

test("les rapprochements utilisent un instantané daté et disposent d'un export CSV", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /accountComputedBalance\(accountId,date\)/);
  assert.match(html, /function exportReconciliationsCsv\(\)/);
  assert.match(html, /id="exportReconciliations"/);
  assert.match(html, /WAT-rapprochements-financiers\.csv/);
  assert.match(html, /aucun solde d’ouverture ni mouvement non associé n’est inclus/i);
});

test("les soldes d'ouverture sont déclarés une fois, immuables et intégrés aux rapprochements", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(html, /id="accountOpeningBalance"/);
  assert.match(html, /id="accountOpeningDate"/);
  assert.match(html, /openingBalances=accounts\.reduce/);
  assert.match(html, /return opening\+income-expense\+incoming-outgoing/);
  assert.match(rules, /request\.resource\.data\.openingBalance is int/);
  assert.match(rules, /request\.resource\.data\.date >= get\(/);
  assert.match(rules, /request\.resource\.data\.openingBalance == resource\.data\.openingBalance/);
});
