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
  "1011": { code: "1011", label: "Compte A", status: "active", postable: true },
  "1015": { code: "1015", label: "Compte B", status: "active", postable: true },
  "10": { code: "10", label: "Rubrique", status: "active", postable: false },
  "1021": { code: "1021", label: "Inactif", status: "inactive", postable: true }
};
const openPeriod = { status: "open", startDate: "2026-01-01", endDate: "2026-12-31" };
const balanced = {
  date: "2026-04-10",
  journalCode: "JOURNAL-TEST",
  entryNumber: "0001",
  status: "posted",
  description: "Exemple de test",
  lines: [
    { accountCode: "1011", debit: 12500, credit: 0, description: "Débit" },
    { accountCode: "1015", debit: 0, credit: 12500, description: "Crédit" }
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
  entry.lines[0].accountCode = "10";
  assert.ok(validateAccountingEntry(entry, accounts, openPeriod).some(x => x.includes("non imputable")));
  entry.lines[0].accountCode = "1021";
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
      { accountCode: "1015", debit: 3000, credit: 0 },
      { accountCode: "1011", debit: 0, credit: 3000 }
    ]
  };
  const rows = buildGeneralLedger([balanced, second, { ...balanced, status: "draft" }], "1011", { debit: 1000, credit: 0 });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(x => [x.balanceDebit, x.balanceCredit]), [[13500, 0], [10500, 0]]);
});

test("la balance présente ouverture, mouvements et soldes de clôture équilibrés", () => {
  const rows = buildTrialBalance(
    [accounts["1011"], accounts["1015"]],
    [balanced],
    { "1011": { debit: 500, credit: 0 }, "1015": { debit: 0, credit: 500 } }
  );
  const totals = trialBalanceTotals(rows);
  assert.equal(totals.openingDebit, totals.openingCredit);
  assert.equal(totals.movementDebit, totals.movementCredit);
  assert.equal(totals.closingDebit, totals.closingCredit);
  assert.deepEqual(rows.map(x => x.accountCode), ["1011", "1015"]);
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
  assert.throws(() => buildGeneralLedger([corrupted], "1011"), /équilibrée/);
});

test("refuse un compte absent du référentiel lors du calcul de la balance", () => {
  const corrupted = structuredClone(balanced);
  corrupted.lines[0].accountCode = "9999";
  assert.throws(() => buildTrialBalance(
    [accounts["1011"], accounts["1015"]], [corrupted]
  ), /n'existe pas dans la balance/);
});

test("refuse les soldes d'ouverture négatifs, fractionnaires ou simultanément débiteurs et créditeurs", () => {
  assert.throws(() => buildGeneralLedger([balanced], "1011", { debit: -1, credit: 0 }), /invalide/);
  assert.throws(() => buildGeneralLedger([balanced], "1011", { debit: 1.5, credit: 0 }), /invalide/);
  assert.throws(() => buildGeneralLedger([balanced], "1011", { debit: 10, credit: 10 }), /invalide/);
});

test("refuse les codes de comptes dupliqués dans le référentiel de balance", () => {
  assert.throws(() => buildTrialBalance(
    [accounts["1011"], { ...accounts["1011"] }], [balanced]
  ), /code en double/);
});


test("un compte désactivé reste visible dans la balance des exercices historiques", () => {
  const historical = structuredClone(balanced);
  historical.lines[0].accountCode = "1021";
  const rows = buildTrialBalance(
    [accounts["1021"], accounts["1015"]], [historical]
  );
  assert.deepEqual(rows.map(x => x.accountCode), ["1015", "1021"]);
  assert.equal(rows.find(x => x.accountCode === "1021").movementDebit, 12500);
});


test("accepte les années bissextiles et rejette les dates calendaires impossibles", () => {
  const leap = structuredClone(balanced);
  leap.date = "2024-02-29";
  assert.deepEqual(validateAccountingEntry(leap, accounts, {
    status: "open", startDate: "2024-01-01", endDate: "2024-12-31"
  }), []);
  for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10"]) {
    const invalid = structuredClone(balanced);
    invalid.date = date;
    assert.ok(validateAccountingEntry(invalid, accounts, openPeriod).some(x => x.includes("Date comptable invalide")));
  }
});


test("le moteur accepte les comptes SYCEBNL à 2 à 5 chiffres et rejette les codes non conformes", () => {
  for (const accountCode of ["1", "ABC", "123456"]) {
    const invalid = structuredClone(balanced);
    invalid.lines[0].accountCode = accountCode;
    assert.ok(validateAccountingEntry(invalid, accounts, openPeriod).some(x => x.includes("compte absent")));
  }
});
