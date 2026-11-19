import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAccountingEntry,
  getPostedEntries,
  buildGeneralLedger,
  buildTrialBalance,
  trialBalanceTotals
} from "../accounting-engine.mjs";

const accounts = {
  "ACCOUNT-A": { code: "ACCOUNT-A", label: "Compte A", status: "active", postable: true },
  "ACCOUNT-B": { code: "ACCOUNT-B", label: "Compte B", status: "active", postable: true },
  "HEADER": { code: "HEADER", label: "Rubrique", status: "active", postable: false },
  "DISABLED": { code: "DISABLED", label: "Inactif", status: "inactive", postable: true }
};
const openPeriod = { status: "open", startDate: "2026-01-01", endDate: "2026-12-31" };
const balanced = {
  date: "2026-04-10",
  journalCode: "JOURNAL-TEST",
  entryNumber: "0001",
  status: "posted",
  description: "Exemple de test",
  lines: [
    { accountCode: "ACCOUNT-A", debit: 12500, credit: 0, description: "Débit" },
    { accountCode: "ACCOUNT-B", debit: 0, credit: 12500, description: "Crédit" }
  ]
};

test("valide une pièce équilibrée en partie double", () => {
  assert.deepEqual(validateAccountingEntry(balanced, accounts, openPeriod), []);
});

test("refuse une pièce déséquilibrée", () => {
  const entry = structuredClone(balanced);
  entry.lines[1].credit = 12499;
  assert.ok(validateAccountingEntry(entry, accounts, openPeriod).some(x => x.includes("pas équilibrée")));
});

test("refuse les comptes non imputables et inactifs", () => {
  const entry = structuredClone(balanced);
  entry.lines[0].accountCode = "HEADER";
  assert.ok(validateAccountingEntry(entry, accounts, openPeriod).some(x => x.includes("non imputable")));
  entry.lines[0].accountCode = "DISABLED";
  assert.ok(validateAccountingEntry(entry, accounts, openPeriod).some(x => x.includes("inactif")));
});

test("refuse une ligne avec débit et crédit simultanés ou aucun montant", () => {
  const entry = structuredClone(balanced);
  entry.lines[0].credit = 10;
  assert.ok(validateAccountingEntry(entry, accounts, openPeriod).some(x => x.includes("soit le débit")));
});

test("refuse une pièce datée hors période ou dans un exercice fermé", () => {
  const entry = structuredClone(balanced);
  entry.date = "2027-01-01";
  assert.ok(validateAccountingEntry(entry, accounts, openPeriod).some(x => x.includes("dépasse la clôture")));
  assert.ok(validateAccountingEntry(balanced, accounts, { ...openPeriod, status: "closed" }).some(x => x.includes("pas ouvert")));
});

test("les états ne retiennent que les pièces comptabilisées", () => {
  const draft = { ...structuredClone(balanced), status: "draft", entryNumber: "0000" };
  assert.deepEqual(getPostedEntries([draft, balanced]).map(x => x.entryNumber), ["0001"]);
});

test("le grand livre calcule un solde progressif et ignore les brouillons", () => {
  const second = {
    ...structuredClone(balanced),
    date: "2026-04-11",
    entryNumber: "0002",
    lines: [
      { accountCode: "ACCOUNT-B", debit: 3000, credit: 0 },
      { accountCode: "ACCOUNT-A", debit: 0, credit: 3000 }
    ]
  };
  const rows = buildGeneralLedger([balanced, second, { ...balanced, status: "draft" }], "ACCOUNT-A", { debit: 1000, credit: 0 });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(x => [x.balanceDebit, x.balanceCredit]), [[13500, 0], [10500, 0]]);
});

test("la balance présente ouverture, mouvements et soldes de clôture équilibrés", () => {
  const rows = buildTrialBalance(
    [accounts["ACCOUNT-A"], accounts["ACCOUNT-B"]],
    [balanced],
    { "ACCOUNT-A": { debit: 500, credit: 0 }, "ACCOUNT-B": { debit: 0, credit: 500 } }
  );
  const totals = trialBalanceTotals(rows);
  assert.equal(totals.openingDebit, totals.openingCredit);
  assert.equal(totals.movementDebit, totals.movementCredit);
  assert.equal(totals.closingDebit, totals.closingCredit);
  assert.deepEqual(rows.map(x => x.accountCode), ["ACCOUNT-A", "ACCOUNT-B"]);
});

test("la balance rejette les montants négatifs ou non entiers", () => {
  assert.throws(() => trialBalanceTotals([{ openingDebit: -1 }]), /invalide/);
  assert.throws(() => trialBalanceTotals([{ openingDebit: 1.5 }]), /invalide/);
});


test("refuse les dates calendaires impossibles même au format AAAA-MM-JJ", () => {
  const entry = structuredClone(balanced);
  entry.date = "2026-02-30";
  assert.ok(validateAccountingEntry(entry, accounts, openPeriod).some(x => x.includes("Date comptable invalide")));
});

test("refuse une pièce comptabilisée corrompue avant le calcul du grand livre", () => {
  const corrupted = structuredClone(balanced);
  corrupted.lines[1].credit = 12499;
  assert.throws(() => buildGeneralLedger([corrupted], "ACCOUNT-A"), /équilibrée/);
});

test("refuse un compte absent du référentiel lors du calcul de la balance", () => {
  const corrupted = structuredClone(balanced);
  corrupted.lines[0].accountCode = "UNKNOWN";
  assert.throws(() => buildTrialBalance(
    [accounts["ACCOUNT-A"], accounts["ACCOUNT-B"]], [corrupted]
  ), /n'existe pas dans la balance/);
});

test("refuse les soldes d'ouverture négatifs, fractionnaires ou simultanément débiteurs et créditeurs", () => {
  assert.throws(() => buildGeneralLedger([balanced], "ACCOUNT-A", { debit: -1, credit: 0 }), /invalide/);
  assert.throws(() => buildGeneralLedger([balanced], "ACCOUNT-A", { debit: 1.5, credit: 0 }), /invalide/);
  assert.throws(() => buildGeneralLedger([balanced], "ACCOUNT-A", { debit: 10, credit: 10 }), /invalide/);
});

test("refuse les codes de comptes dupliqués dans le référentiel de balance", () => {
  assert.throws(() => buildTrialBalance(
    [accounts["ACCOUNT-A"], { ...accounts["ACCOUNT-A"] }], [balanced]
  ), /code en double/);
});
