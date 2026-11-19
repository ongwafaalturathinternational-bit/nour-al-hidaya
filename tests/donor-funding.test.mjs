import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDonorRegisterEntry,
  validateFunderProfile,
  validateGrantAgreement,
  getGrantAvailableBalance,
  getGrantReportingStatus
} from "../donor-funding.mjs";

const validDonor = {
  receivedAt: "2026-11-19", donorName: "Fondation Exemple",
  donorAddress: "Adresse déclarée", donorContact: "contact déclaré",
  organizationRegistration: "Référence officielle WAT",
  organizationAddress: "Siège WAT", organizationContact: "Contact WAT",
  amountValue: 250000, method: "bank_transfer", receiptNumber: "DON-0001",
  legalRepresentative: "Représentant légal", signed: true
};

const validGrant = {
  funderId: "funder-1", projectId: "project-1", agreementNumber: "CONV-2026-01",
  title: "Appui au programme éducatif", currency: "XOF", awardedAmount: 1000000,
  startDate: "2026-01-01", endDate: "2026-12-31", status: "active",
  eligibleExpenseCategories: ["fournitures", "formation"],
  reportingRequirements: ["rapport technique", "rapport financier"],
  tranches: [
    { amount: 400000, expectedDate: "2026-01-15" },
    { amount: 600000, expectedDate: "2026-06-15" }
  ]
};

test("valide une inscription complète au registre des donateurs", () => {
  assert.deepEqual(validateDonorRegisterEntry(validDonor), []);
});

test("impose les mentions du registre et la signature du représentant légal", () => {
  const errors = validateDonorRegisterEntry({
    ...validDonor, donorAddress: "", method: "in_kind",
    inKindDescription: "", signed: false, amountValue: 0
  });
  assert.ok(errors.some(x => x.includes("adresse du donateur")));
  assert.ok(errors.some(x => x.includes("don en nature")));
  assert.ok(errors.some(x => x.includes("montant")));
  assert.ok(errors.some(x => x.includes("signée")));
});

test("valide la fiche d'un bailleur et contrôle le courriel lorsqu'il est fourni", () => {
  assert.deepEqual(validateFunderProfile({
    name: "Fondation Exemple", category: "fondation",
    country: "Bénin", primaryContact: "Responsable programme",
    email: "contact@example.org"
  }), []);
  assert.ok(validateFunderProfile({
    name: "Bailleur", category: "institution", country: "France",
    primaryContact: "Contact", email: "adresse-invalide"
  }).some(x => x.includes("électronique")));
});

test("valide une convention de financement avec tranches et dépenses éligibles", () => {
  assert.deepEqual(validateGrantAgreement(validGrant), []);
});

test("refuse une convention dont les tranches dépassent le financement accordé", () => {
  const errors = validateGrantAgreement({
    ...validGrant,
    tranches: [{ amount: 1100000, expectedDate: "2026-01-15" }]
  });
  assert.ok(errors.some(x => x.includes("dépasse le montant accordé")));
});

test("refuse une convention sans projet, catégories éligibles ou dates cohérentes", () => {
  const errors = validateGrantAgreement({
    ...validGrant, projectId: "", eligibleExpenseCategories: [],
    startDate: "2026-12-31", endDate: "2026-01-01"
  });
  assert.ok(errors.some(x => x.includes("projet financé")));
  assert.ok(errors.some(x => x.includes("éligibles")));
  assert.ok(errors.some(x => x.includes("fin ne peut pas précéder")));
});

test("calcule le solde disponible sans accepter de dépenses invalides", () => {
  assert.equal(getGrantAvailableBalance(1000000, [{ amount: 250000 }, { amount: 125000 }]), 625000);
  assert.equal(getGrantAvailableBalance(1000000, [{ amount: -1 }]), null);
  assert.equal(getGrantAvailableBalance(1000000, [{ amount: 1200000 }]), -200000);
});

test("signale les rapports bailleurs en attente ou en retard sans effacer l'historique", () => {
  const result = getGrantReportingStatus([
    { id: "r1", label: "Rapport trimestriel", dueDate: "2026-10-31" },
    { id: "r2", label: "Rapport final", dueDate: "2026-12-31" },
    { id: "r3", label: "Rapport déjà transmis", dueDate: "2026-10-01", submittedAt: "2026-10-02" }
  ], "2026-11-19");
  assert.deepEqual(result.map(x => x.status), ["overdue", "pending", "submitted"]);
});
