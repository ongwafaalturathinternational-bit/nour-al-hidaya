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

test("l'export du registre conserve la traçabilité de création, validation et rejet", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /"Créée par \(UID\)","Validée par \(UID\)","Validée le","Motif du rejet"/);
  assert.match(html, /t\.createdBy,t\.validatedBy,dateLabel\(t\.validatedAt\),t\.rejectionReason/);
  assert.match(html, /\["Créée par \(UID\)",t\.createdBy\|\|"—"\]/);
  assert.match(html, /\["Validée par \(UID\)",t\.validatedBy\|\|"—"\]/);
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

test("le calcul budgétaire exclut les autres années, statuts, projets et catégories", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.match(/function budgetExpenseTotal\(b\)\{[\s\S]*?\}/)?.[0];
  assert.ok(source, "budgetExpenseTotal doit être défini");
  const calculate = vm.runInNewContext(source + "; budgetExpenseTotal", {
    canRead: true,
    transactions: [
      { type: "depense", status: "validee", projectId: "p1", date: "2027-02-01", category: "education", amount: 100 },
      { type: "depense", status: "validee", projectId: "p1", date: "2027-03-01", category: "logistique", amount: 50 },
      { type: "depense", status: "validee", date: "2027-03-02", category: "transport", amount: 25 },
      { type: "depense", status: "validee", projectId: "p1", date: "2026-02-01", category: "education", amount: 20 },
      { type: "depense", status: "soumise", projectId: "p1", date: "2027-02-03", category: "education", amount: 30 },
      { type: "recette", status: "validee", projectId: "p1", date: "2027-02-04", category: "education", amount: 1000 }
    ]
  });
  assert.equal(calculate({ year: 2027, category: "education", projectId: "p1" }), 100);
  assert.equal(calculate({ year: 2027, category: "fonctionnement", projectId: "p1" }), 50);
  assert.equal(calculate({ year: 2027, category: "projet", projectId: "p1" }), 150);
  assert.equal(calculate({ year: 2027, category: "education" }), 0);
  assert.equal(calculate({ year: 2027, category: "fonctionnement" }), 25);
});

test("le suivi budgétaire rapproche les dépenses par exercice, projet et affectation", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /function budgetExpenseTotal\(b\)/);
  assert.match(html, /b\.category==="projet"\|\|\(b\.category==="fonctionnement"\?operating\.includes\(t\.category\):t\.category===b\.category\)/);
  assert.match(html, /const spent=budgetExpenseTotal\(b\)/);
  assert.match(html, /const spent=budgetExpenseTotal\(b\);return \[b\.year/);
  assert.match(html, /même exercice, projet et affectation/);
});

test("les exports de transferts et rapprochements conservent la piste d'audit", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /function exportReconciliationsCsv\(\)[\s\S]*Créé par \(UID\)[\s\S]*Validé par \(UID\)[\s\S]*Motif du rejet/);
  assert.match(html, /function exportTransfersCsv\(\)[\s\S]*Créé par \(UID\)[\s\S]*Validé par \(UID\)[\s\S]*Motif du rejet/);
  assert.match(html, /dateLabel\(r\.validatedAt\)/);
  assert.match(html, /dateLabel\(t\.validatedAt\)/);
});

test("la synthèse des donateurs regroupe les variantes de casse, accents et espaces", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /name\.normalize\("NFD"\)/);
  assert.match(html, /toLocaleLowerCase\("fr"\)/);
  assert.ok(html.includes(String.raw`replace(/[\\u0300-\\u036f]/g,"")`) === false);
  assert.ok(html.includes(String.raw`replace(/[\u0300-\u036f]/g,"")`));
  assert.ok(html.includes(String.raw`replace(/\s+/g," ")`));
  assert.match(html, /const row=groups\.get\(key\)\|\|\{name,count:0,cash:0,inKind:0,total:0\}/);
});

test("les explications des comptes et rapprochements décrivent correctement le solde d'ouverture", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /Le solde d’ouverture est une déclaration initiale enregistrée à la création du compte/);
  assert.match(html, /Le calcul reprend le solde d’ouverture du compte s’il est applicable à la date du relevé/);
  assert.match(html, /function accountComputedBalance\(accountId,asOfDate\)/);
  assert.match(html, /account&&\(!asOfDate\|\|\(account\.openingDate\|\|""\)<=asOfDate\)/);
});

test("le registre et son export acceptent une plage de dates inclusive", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /\.filter-date\{display:flex;align-items:center;gap:6px/);
  assert.match(html, /id="dateFrom" type="date"/);
  assert.match(html, /id="dateTo" type="date"/);
  assert.match(html, /\(!from\|\|\(t\.date\|\|""\)>=from\)&&\(!to\|\|\(t\.date\|\|""\)<=to\)/);
  assert.match(html, /"accountFilter","dateFrom","dateTo"/);
  assert.match(html, /filteredTransactions\(\)\.map\(t=>\[t\.date/);
});

test("le registre peut être filtré par compte et les exports suivent ce filtre", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /id="accountFilter"/);
  assert.match(html, /function fillTransactionAccountFilter\(\)/);
  assert.match(html, /account==="__none__"\?!t\.accountId:t\.accountId===account/);
  assert.match(html, /fillAccountSelect\(\);fillTransactionAccountFilter\(\);fillTransferSelects\(\)/);
  assert.match(html, /"yearFilter","accountFilter"/);
  assert.match(html, /filteredTransactions\(\)\.map\(t=>\[t\.date/);
});

test("tous les rapports financiers de répartition suivent le même filtre d'exercice", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /function renderExpenseChart\(\).*?selected=\$\("yearFilter"\)\.value/s);
  assert.match(html, /function renderPaymentSummary\(\).*?selected=\$\("yearFilter"\)\.value/s);
  assert.match(html, /if\(id==="yearFilter"\)\{renderExpenseChart\(\);renderMonthlyChart\(\);renderPaymentSummary\(\);renderDonorSummary\(\);renderProjectFinance\(\)\}/);
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
  assert.match(html, /Le calcul reprend le solde d’ouverture du compte s’il est applicable à la date du relevé/i);
  assert.match(html, /Les opérations sans compte associé sont exclues/i);
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


test("les soldes de trésorerie et des comptes excluent les mouvements datés dans le futur", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /asOf=todayLocal\(\),cashValid=valid\.filter\(t=>\(t\.date\|\|""\)<=asOf\)/);
  assert.match(html, /const asOf=todayLocal\(\),valid=transactions\.filter\(t=>t\.accountId===a\.id&&t\.status==="validee"&&\(t\.date\|\|""\)<=asOf\)/);
  assert.match(html, /t\.destinationAccountId===a\.id&&\(t\.date\|\|""\)<=asOf/);
  assert.match(html, /t\.sourceAccountId===a\.id&&\(t\.date\|\|""\)<=asOf/);
});


test("la date proposée après une nouvelle opération utilise le calendrier local", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /\$\("operationDate"\)\.value=todayLocal\(\)/);
  assert.doesNotMatch(html, /toISOString\(\)\.slice\(0,10\)/);
  assert.match(html, /function todayLocal\(\)/);
});


test("les transferts et rapprochements respectent la date d'ouverture de chaque compte", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.match(/function accountEligibleForDate\(account,date\)\{[\s\S]*?\}\nfunction accountComputedBalance/)?.[0]?.replace(/\nfunction accountComputedBalance[\s\S]*$/, "");
  assert.ok(source, "accountEligibleForDate doit être défini");
  const eligible = vm.runInNewContext(source + "; accountEligibleForDate", {});
  const account = { status: "actif", openingDate: "2026-04-15" };
  assert.equal(eligible(account, "2026-04-14"), false);
  assert.equal(eligible(account, "2026-04-15"), true);
  assert.equal(eligible(account, "2026-04-16"), true);
  assert.equal(eligible({ ...account, status: "clos" }, "2026-04-16"), false);
  assert.equal(eligible(account, ""), false);
  assert.match(html, /!accountEligibleForDate\(source,date\)\|\|!accountEligibleForDate\(destination,date\)/);
  assert.match(html, /if\(!accountEligibleForDate\(account,date\)\|\|!Number\.isSafeInteger\(statementBalance\)/);
});


test("la clôture d'un compte exige un solde nul et aucun mouvement futur", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const close = html.match(/async function closeAccount\(a\)\{[\s\S]*?\}\nasync function review/)?.[0] || "";
  assert.ok(close, "closeAccount doit être défini");
  assert.match(close, /balance=accountComputedBalance\(a\.id,todayLocal\(\)\)/);
  assert.match(close, /if\(balance!==0\)/);
  assert.match(close, /futureTransactions=transactions\.filter/);
  assert.match(close, /futureTransfers=transfers\.filter/);
  assert.match(close, /futureTransactions\|\|futureTransfers/);
  assert.match(close, /Transférez ou régularisez intégralement ce solde/);
});


test("la clôture annuelle ne peut viser que des exercices terminés", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /year>=todayLocal\(\)\.slice\(0,4\)/);
  assert.match(html, /un exercice ne peut être clôturé qu’après la fin de l’année concernée/);
  assert.match(html, /y<currentYear&&!periods\.some/);
});

test("l'instantané annuel ne compte que les comptes ouverts avant la fin de l'exercice", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.match(/function buildPeriodSnapshot\(year\)\{[^\n]*/)?.[0];
  assert.ok(source, "buildPeriodSnapshot doit être défini");
  const build = vm.runInNewContext(source + "; buildPeriodSnapshot", {
    transactions: [
      { date: "2025-03-01", status: "validee", type: "recette", paymentMethod: "especes", amount: 100 },
      { date: "2025-04-01", status: "validee", type: "recette", paymentMethod: "nature", amount: 50 },
      { date: "2025-05-01", status: "validee", type: "depense", amount: 30 },
      { date: "2025-06-01", status: "soumise", type: "depense", amount: 500 }
    ],
    transfers: [{ date: "2025-07-01", status: "validee" }],
    reconciliations: [{ date: "2025-08-01", status: "validee" }],
    accounts: [
      { openingDate: "2024-12-15" },
      { openingDate: "2025-12-31" },
      { openingDate: "2026-01-01" }
    ],
    budgets: [{ year: 2025 }, { year: 2026 }]
  });
  const snapshot = build("2025");
  assert.equal(snapshot.receiptsCash, 100);
  assert.equal(snapshot.receiptsInKind, 50);
  assert.equal(snapshot.expenses, 30);
  assert.equal(snapshot.netCash, 70);
  assert.equal(snapshot.validatedTransactionCount, 3);
  assert.equal(snapshot.transferCount, 1);
  assert.equal(snapshot.reconciliationCount, 1);
  assert.equal(snapshot.accountCount, 2);
  assert.equal(snapshot.budgetCount, 1);
});


test("les exports CSV neutralisent les formules même après des espaces ou caractères invisibles", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.match(/function csvCell\(value\)\{[\s\S]*?\}/)?.[0];
  assert.ok(source, "csvCell doit être défini");
  const csvCell = vm.runInNewContext(source + "; csvCell");
  assert.equal(csvCell("=1+1"), "\"'=1+1\"");
  assert.equal(csvCell("   =1+1"), "\"'   =1+1\"");
  assert.equal(csvCell("\t@SUM(A1)"), "\"'\t@SUM(A1)\"");
  assert.equal(csvCell("Nom \"WAT\""), "\"Nom \"\"WAT\"\"\"");
  assert.equal(csvCell("Don WAT"), "\"Don WAT\"");
});


test("une opération sans compte est explicitement signalée comme exclue des soldes par compte", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  assert.match(html, /Sans compte associé — suivi global uniquement/);
  assert.match(html, /reste dans le registre global, mais ne sera pas intégrée au solde/);
  assert.match(html, /if\(method!==\"nature\"&&matchingAccounts\.length>0&&!accountId\)/);
});


test("les KPI recettes et dépenses validées couvrent le même périmètre temporel", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.match(/function renderKpis\(\)\{[^\n]*/)?.[0] || "";
  assert.ok(source.includes('income=valid.filter(t=>t.type==="recette")'));
  assert.ok(source.includes('expense=valid.filter(t=>t.type==="depense")'));
  assert.ok(source.includes('cashValid=valid.filter(t=>(t.date||"")<=asOf)'));
  assert.ok(source.includes('cashExpense=cashValid.filter(t=>t.type==="depense")'));
  assert.ok(source.includes("cashBalance=cashIncome-cashExpense+openingBalances"));
});


test("la synthèse des donateurs sépare espèces et nature et ignore les opérations non éligibles", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.split("\\n").find(line => line.startsWith("function donorSummaryRows()"));
  assert.ok(source, "donorSummaryRows doit être défini sur une ligne");
  const summarize = vm.runInNewContext(source + "; donorSummaryRows", {
    $: id => ({ value: id === "yearFilter" ? "2027" : "" }),
    transactions: [
      { status: "validee", type: "recette", category: "don", date: "2027-01-02", counterparty: "École WAT", paymentMethod: "especes", amount: 100 },
      { status: "validee", type: "recette", category: "subvention", date: "2027-02-02", counterparty: "ecole   wat", paymentMethod: "nature", amount: 40 },
      { status: "soumise", type: "recette", category: "don", date: "2027-03-02", counterparty: "École WAT", paymentMethod: "especes", amount: 900 },
      { status: "validee", type: "recette", category: "vente", date: "2027-03-03", counterparty: "École WAT", paymentMethod: "especes", amount: 500 },
      { status: "validee", type: "recette", category: "don", date: "2026-12-31", counterparty: "École WAT", paymentMethod: "especes", amount: 700 }
    ]
  });
  const rows = summarize();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[0].cash, 100);
  assert.equal(rows[0].inKind, 40);
  assert.equal(rows[0].total, 140);
});

test("la situation financière par projet exclut les opérations en attente et calcule le net hors nature", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.split("\\n").find(line => line.startsWith("function projectFinanceRows()"));
  assert.ok(source, "projectFinanceRows doit être défini sur une ligne");
  const summarize = vm.runInNewContext(source + "; projectFinanceRows", {
    $: id => ({ value: id === "yearFilter" ? "2027" : "" }),
    transactions: [
      { status: "validee", type: "recette", date: "2027-01-02", projectId: "p1", projectName: "Nour", paymentMethod: "especes", amount: 100 },
      { status: "validee", type: "recette", date: "2027-01-03", projectId: "p1", projectName: "Nour", paymentMethod: "nature", amount: 30 },
      { status: "validee", type: "depense", date: "2027-01-04", projectId: "p1", projectName: "Nour", amount: 40 },
      { status: "soumise", type: "depense", date: "2027-01-05", projectId: "p1", projectName: "Nour", amount: 900 },
      { status: "validee", type: "recette", date: "2027-01-06", projectId: "p2", projectName: "Autre", paymentMethod: "especes", amount: 500 },
      { status: "validee", type: "depense", date: "2026-12-31", projectId: "p1", projectName: "Nour", amount: 700 }
    ]
  });
  const rows = summarize();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].income, 130);
  assert.equal(rows[0].inKind, 30);
  assert.equal(rows[0].expense, 40);
  assert.equal(rows[0].income - rows[0].inKind - rows[0].expense, 60);
});


test("la liste des clôtures inclut les années de rapprochement et d'ouverture des comptes", () => {
  const html = readFileSync(new URL("../finance.html", import.meta.url), "utf8");
  const source = html.split("\\n").find(line => line.startsWith("function fillPeriodSelect()"));
  assert.ok(source, "fillPeriodSelect doit être défini sur une ligne");
  const select = {
    value: "2024",
    options: [],
    replaceChildren() { this.options = []; },
    add(option) { this.options.push(option); }
  };
  const fill = vm.runInNewContext(source + "; fillPeriodSelect", {
    $: () => select,
    todayLocal: () => "2026-11-19",
    transactions: [],
    transfers: [],
    reconciliations: [{ date: "2023-08-01" }],
    accounts: [{ openingDate: "2024-05-01" }, { openingDate: "2026-01-01" }],
    budgets: [],
    periods: [],
    Option: function (label, value) { return { label, value }; }
  });
  fill();
  assert.deepEqual(select.options.map(option => option.value), ["2024", "2023"]);
  assert.equal(select.value, "2024");
});
