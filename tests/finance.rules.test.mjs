import test, { after } from "node:test";
import fs from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-wat-connect",
  firestore: { rules: fs.readFileSync("firestore.rules", "utf8") }
});
after(async () => env.cleanup());

async function seed(uid, scopes, active = true) {
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "staffAccess", uid), {
    displayName: uid, email: uid + "@example.org", role: "responsable_financier",
    active, scopes, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
}
function transaction(uid, extra = {}) {
  return {
    type: "recette", category: "don", amount: 25000, date: "2026-11-19", fiscalYear: "2026",
    counterparty: "Donateur test", paymentMethod: "mobile_money", reference: "REC-001",
    description: "Contribution au programme éducatif WAT", status: "soumise",
    createdAt: serverTimestamp(), createdBy: uid, updatedAt: serverTimestamp(), updatedBy: uid,
    ...extra
  };
}
function budget(uid, extra = {}) {
  return {
    name: "Budget éducation 2027", year: 2027, amount: 1500000,
    category: "education", status: "actif", note: "Décision de test",
    createdAt: serverTimestamp(), createdBy: uid, updatedAt: serverTimestamp(), updatedBy: uid,
    ...extra
  };
}

test("finance.manage peut soumettre une recette, sans pouvoir la valider lui-même", async () => {
  await seed("finance-operator", ["finance.read", "finance.manage"]);
  const db = env.authenticatedContext("finance-operator").firestore();
  const ref = doc(db, "financeTransactions", "receipt-001");
  await assertSucceeds(setDoc(ref, transaction("finance-operator")));
  await assertSucceeds(getDoc(ref));
  await assertFails(updateDoc(ref, {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "finance-operator",
    updatedAt: serverTimestamp(), updatedBy: "finance-operator"
  }));
});

test("finance.validate peut approuver une opération soumise sans en modifier les montants", async () => {
  await seed("finance-validator", ["finance.read", "finance.validate"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeTransactions", "to-approve"), transaction("operator")));
  const db = env.authenticatedContext("finance-validator").firestore();
  const ref = doc(db, "financeTransactions", "to-approve");
  await assertSucceeds(updateDoc(ref, {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "finance-validator",
    updatedAt: serverTimestamp(), updatedBy: "finance-validator"
  }));
  await assertFails(updateDoc(ref, { amount: 1, updatedAt: serverTimestamp(), updatedBy: "finance-validator" }));
  await assertFails(deleteDoc(ref));
});

test("un rejet financier exige un motif et les opérations ne sont jamais supprimables", async () => {
  await seed("finance-reviewer", ["finance.validate"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeTransactions", "to-reject"), transaction("operator")));
  const ref = doc(env.authenticatedContext("finance-reviewer").firestore(), "financeTransactions", "to-reject");
  await assertFails(updateDoc(ref, {
    status: "rejetee", rejectedAt: serverTimestamp(), rejectedBy: "finance-reviewer",
    rejectionReason: "non", updatedAt: serverTimestamp(), updatedBy: "finance-reviewer"
  }));
  await assertSucceeds(updateDoc(ref, {
    status: "rejetee", rejectedAt: serverTimestamp(), rejectedBy: "finance-reviewer",
    rejectionReason: "Justificatif non conforme", updatedAt: serverTimestamp(), updatedBy: "finance-reviewer"
  }));
  await assertFails(deleteDoc(ref));
});

test("les comptes sans périmètre financier ne peuvent pas consulter ni écrire le registre", async () => {
  await seed("finance-outsider", ["projects.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeTransactions", "private"), transaction("system")));
  const db = env.authenticatedContext("finance-outsider").firestore();
  await assertFails(getDoc(doc(db, "financeTransactions", "private")));
  await assertFails(setDoc(doc(db, "financeTransactions", "new"), transaction("finance-outsider")));
});

test("finance.budgets.manage gère les budgets sans ouvrir l'accès aux opérations", async () => {
  await seed("budget-manager", ["finance.budgets.manage"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeTransactions", "secret"), transaction("system")));
  const db = env.authenticatedContext("budget-manager").firestore();
  const ref = doc(db, "financeBudgets", "education-2027");
  await assertSucceeds(setDoc(ref, budget("budget-manager")));
  await assertSucceeds(getDoc(ref));
  await assertFails(updateDoc(ref, { amount: 1, updatedAt: serverTimestamp(), updatedBy: "budget-manager" }));
  await assertSucceeds(updateDoc(ref, { status: "clos", updatedAt: serverTimestamp(), updatedBy: "budget-manager" }));
  await assertFails(updateDoc(ref, { status: "actif", updatedAt: serverTimestamp(), updatedBy: "budget-manager" }));
  await assertFails(getDoc(doc(db, "financeTransactions", "secret")));
  await assertFails(deleteDoc(ref));
});

test("les montants invalides, catégories incohérentes et budgets sans autorisation sont refusés", async () => {
  await seed("finance-manager", ["finance.manage"]);
  await seed("finance-reader", ["finance.read"]);
  const manager = env.authenticatedContext("finance-manager").firestore();
  const reader = env.authenticatedContext("finance-reader").firestore();
  await assertFails(setDoc(doc(manager, "financeTransactions", "bad-amount"), transaction("finance-manager", { amount: -50 })));
  await assertFails(setDoc(doc(manager, "financeTransactions", "bad-category"), transaction("finance-manager", { type: "depense", category: "don" })));
  await assertFails(setDoc(doc(reader, "financeBudgets", "no-right"), budget("finance-reader")));
});


test("un auteur ne peut pas valider sa propre opération même s’il possède les deux périmètres", async () => {
  await seed("finance-dual", ["finance.read", "finance.manage", "finance.validate"]);
  const db = env.authenticatedContext("finance-dual").firestore();
  const ref = doc(db, "financeTransactions", "self-review");
  await assertSucceeds(setDoc(ref, transaction("finance-dual")));
  await assertFails(updateDoc(ref, {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "finance-dual",
    updatedAt: serverTimestamp(), updatedBy: "finance-dual"
  }));
});


test("les contributions en nature sont admises en recette mais jamais comme sortie de trésorerie", async () => {
  await seed("in-kind-manager", ["finance.manage"]);
  const db = env.authenticatedContext("in-kind-manager").firestore();
  await assertSucceeds(setDoc(doc(db, "financeTransactions", "in-kind-income"), transaction("in-kind-manager", {
    paymentMethod: "nature", category: "don"
  })));
  await assertFails(setDoc(doc(db, "financeTransactions", "in-kind-expense"), transaction("in-kind-manager", {
    type: "depense", category: "logistique", paymentMethod: "nature"
  })));
});

function financeAccount(uid, extra = {}) {
  return {
    name: "Caisse principale", type: "caisse", currency: "XOF", status: "actif",
    institution: "Siège WAT", reference: "4321", openingBalance: 0, openingDate: "2026-01-01", openingFiscalYear: "2026", openingReference: "Solde initial test",
    createdAt: serverTimestamp(), createdBy: uid, updatedAt: serverTimestamp(), updatedBy: uid,
    ...extra
  };
}

test("finance.accounts.manage crée et clôture les comptes sans pouvoir les supprimer ni les réactiver", async () => {
  await seed("account-manager", ["finance.accounts.manage", "finance.read"]);
  const db = env.authenticatedContext("account-manager").firestore();
  const ref = doc(db, "financeAccounts", "cash-main");
  await assertSucceeds(setDoc(ref, financeAccount("account-manager")));
  await assertSucceeds(getDoc(ref));
  await assertFails(updateDoc(ref, { name: "Compte modifié", updatedAt: serverTimestamp(), updatedBy: "account-manager" }));
  await assertFails(updateDoc(ref, { openingBalance: 900000, updatedAt: serverTimestamp(), updatedBy: "account-manager" }));
  await assertFails(setDoc(doc(db, "financeAccounts", "negative-opening"), financeAccount("account-manager", { openingBalance: -1 })));
  await assertFails(setDoc(doc(db, "financeAccounts", "wrong-opening-year"), financeAccount("account-manager", { openingDate: "2027-01-01", openingFiscalYear: "2026" })));
  await assertSucceeds(updateDoc(ref, { status: "clos", updatedAt: serverTimestamp(), updatedBy: "account-manager" }));
  await assertFails(updateDoc(ref, { status: "actif", updatedAt: serverTimestamp(), updatedBy: "account-manager" }));
  await assertFails(deleteDoc(ref));
  await assertFails(setDoc(doc(db, "financeAccounts", "full-account-number"), financeAccount("account-manager", { reference: "1234567890123456" })));
});

test("l'accès aux comptes reste distinct du registre des transactions", async () => {
  await seed("account-only", ["finance.accounts.manage"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "financeTransactions", "private-ledger"), transaction("operator"));
  });
  const db = env.authenticatedContext("account-only").firestore();
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeAccounts", "cash-main"), financeAccount("system")));
  await assertSucceeds(getDoc(doc(db, "financeAccounts", "cash-main")));
  await assertFails(updateDoc(doc(db, "financeAccounts", "cash-main"), { status: "clos", updatedAt: serverTimestamp(), updatedBy: "account-only" }));
  await assertFails(getDoc(doc(db, "financeTransactions", "private-ledger")));
});

test("une opération liée à un compte doit utiliser un compte actif du bon type et son nom exact", async () => {
  await seed("account-linked-operator", ["finance.manage"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "financeAccounts", "cash-active"), financeAccount("system"));
    await setDoc(doc(c.firestore(), "financeAccounts", "bank-active"), financeAccount("system", { name: "Banque WAT", type: "banque" }));
    await setDoc(doc(c.firestore(), "financeAccounts", "cash-closed"), financeAccount("system", { status: "clos" }));
  });
  const db = env.authenticatedContext("account-linked-operator").firestore();
  await assertSucceeds(setDoc(doc(db, "financeTransactions", "cash-linked"), transaction("account-linked-operator", {
    paymentMethod: "especes", accountId: "cash-active", accountName: "Caisse principale"
  })));
  await assertFails(setDoc(doc(db, "financeTransactions", "before-opening-date"), transaction("account-linked-operator", {
    date: "2025-12-31", fiscalYear: "2025", paymentMethod: "especes", accountId: "cash-active", accountName: "Caisse principale"
  })));
  await assertFails(setDoc(doc(db, "financeTransactions", "wrong-account-type"), transaction("account-linked-operator", {
    paymentMethod: "especes", accountId: "bank-active", accountName: "Banque WAT"
  })));
  await assertFails(setDoc(doc(db, "financeTransactions", "closed-account"), transaction("account-linked-operator", {
    paymentMethod: "especes", accountId: "cash-closed", accountName: "Caisse principale"
  })));
  await assertFails(setDoc(doc(db, "financeTransactions", "wrong-account-name"), transaction("account-linked-operator", {
    paymentMethod: "especes", accountId: "cash-active", accountName: "Autre caisse"
  })));
  await assertFails(setDoc(doc(db, "financeTransactions", "nature-with-account"), transaction("account-linked-operator", {
    paymentMethod: "nature", accountId: "cash-active", accountName: "Caisse principale"
  })));
});

function financeTransfer(uid, extra = {}) {
  return {
    sourceAccountId: "cash-source", sourceName: "Caisse principale",
    destinationAccountId: "bank-destination", destinationName: "Banque WAT",
    amount: 50000, date: "2026-11-19", fiscalYear: "2026", reference: "TRF-001",
    description: "Transfert vers le compte bancaire", status: "soumise",
    createdAt: serverTimestamp(), createdBy: uid, updatedAt: serverTimestamp(), updatedBy: uid,
    ...extra
  };
}

test("un transfert interne exige deux comptes actifs distincts et des références exactes", async () => {
  await seed("transfer-operator", ["finance.manage"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "financeAccounts", "cash-source"), financeAccount("system"));
    await setDoc(doc(c.firestore(), "financeAccounts", "bank-destination"), financeAccount("system", { name: "Banque WAT", type: "banque" }));
    await setDoc(doc(c.firestore(), "financeAccounts", "closed-destination"), financeAccount("system", { name: "Ancien compte", type: "banque", status: "clos" }));
  });
  const db = env.authenticatedContext("transfer-operator").firestore();
  await assertSucceeds(setDoc(doc(db, "financeTransfers", "valid-transfer"), financeTransfer("transfer-operator")));
  await assertFails(setDoc(doc(db, "financeTransfers", "before-opening-date"), financeTransfer("transfer-operator", {
    date: "2025-12-31", fiscalYear: "2025"
  })));
  await assertFails(setDoc(doc(db, "financeTransfers", "same-account"), financeTransfer("transfer-operator", {
    destinationAccountId: "cash-source", destinationName: "Caisse principale"
  })));
  await assertFails(setDoc(doc(db, "financeTransfers", "closed-destination"), financeTransfer("transfer-operator", {
    destinationAccountId: "closed-destination", destinationName: "Ancien compte"
  })));
  await assertFails(setDoc(doc(db, "financeTransfers", "wrong-name"), financeTransfer("transfer-operator", {
    sourceName: "Fausse caisse"
  })));
  await assertFails(setDoc(doc(db, "financeTransfers", "negative-amount"), financeTransfer("transfer-operator", {
    amount: -1
  })));
});

test("un transfert est validé par une autre personne, reste immuable et n'est jamais supprimé", async () => {
  await seed("transfer-author", ["finance.read", "finance.manage", "finance.validate"]);
  await seed("transfer-reviewer", ["finance.validate"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "financeAccounts", "cash-source"), financeAccount("system"));
    await setDoc(doc(c.firestore(), "financeAccounts", "bank-destination"), financeAccount("system", { name: "Banque WAT", type: "banque" }));
  });
  const authorDb = env.authenticatedContext("transfer-author").firestore();
  const ref = doc(authorDb, "financeTransfers", "transfer-review");
  await assertSucceeds(setDoc(ref, financeTransfer("transfer-author")));
  await assertFails(updateDoc(ref, {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "transfer-author",
    updatedAt: serverTimestamp(), updatedBy: "transfer-author"
  }));
  const reviewerDb = env.authenticatedContext("transfer-reviewer").firestore();
  const reviewRef = doc(reviewerDb, "financeTransfers", "transfer-review");
  await assertSucceeds(updateDoc(reviewRef, {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "transfer-reviewer",
    updatedAt: serverTimestamp(), updatedBy: "transfer-reviewer"
  }));
  await assertFails(updateDoc(reviewRef, { amount: 1, updatedAt: serverTimestamp(), updatedBy: "transfer-reviewer" }));
  await assertFails(deleteDoc(reviewRef));
});

test("les transferts ne sont pas accessibles sans un périmètre du registre financier", async () => {
  await seed("transfer-outsider", ["projects.read"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeTransfers", "private-transfer"), financeTransfer("system")));
  const db = env.authenticatedContext("transfer-outsider").firestore();
  await assertFails(getDoc(doc(db, "financeTransfers", "private-transfer")));
});

test("une opération liée à un compte clôturé après sa soumission ne peut plus être validée", async () => {
  await seed("account-tx-author", ["finance.manage"]);
  await seed("account-tx-reviewer", ["finance.validate"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeAccounts", "cash-to-close"), financeAccount("system")));
  const authorDb = env.authenticatedContext("account-tx-author").firestore();
  await assertSucceeds(setDoc(doc(authorDb, "financeTransactions", "pending-on-closing-account"), transaction("account-tx-author", {
    paymentMethod: "especes", accountId: "cash-to-close", accountName: "Caisse principale"
  })));
  await env.withSecurityRulesDisabled(async c => {
    await updateDoc(doc(c.firestore(), "financeAccounts", "cash-to-close"), { status: "clos" });
  });
  const reviewerDb = env.authenticatedContext("account-tx-reviewer").firestore();
  await assertFails(updateDoc(doc(reviewerDb, "financeTransactions", "pending-on-closing-account"), {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "account-tx-reviewer",
    updatedAt: serverTimestamp(), updatedBy: "account-tx-reviewer"
  }));
  await assertSucceeds(updateDoc(doc(reviewerDb, "financeTransactions", "pending-on-closing-account"), {
    status: "rejetee", rejectedAt: serverTimestamp(), rejectedBy: "account-tx-reviewer",
    rejectionReason: "Compte clôturé avant validation", updatedAt: serverTimestamp(), updatedBy: "account-tx-reviewer"
  }));
});

test("un transfert ne peut être approuvé si l'un de ses comptes est clôturé après sa soumission", async () => {
  await seed("transfer-close-author", ["finance.manage"]);
  await seed("transfer-close-reviewer", ["finance.validate"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "financeAccounts", "cash-source-close"), financeAccount("system", { name: "Caisse source" }));
    await setDoc(doc(c.firestore(), "financeAccounts", "bank-destination-close"), financeAccount("system", { name: "Banque destination", type: "banque" }));
  });
  const authorDb = env.authenticatedContext("transfer-close-author").firestore();
  await assertSucceeds(setDoc(doc(authorDb, "financeTransfers", "pending-on-closing-account"), financeTransfer("transfer-close-author", {
    sourceAccountId: "cash-source-close", sourceName: "Caisse source",
    destinationAccountId: "bank-destination-close", destinationName: "Banque destination"
  })));
  await env.withSecurityRulesDisabled(async c => {
    await updateDoc(doc(c.firestore(), "financeAccounts", "bank-destination-close"), { status: "clos" });
  });
  const reviewerDb = env.authenticatedContext("transfer-close-reviewer").firestore();
  await assertFails(updateDoc(doc(reviewerDb, "financeTransfers", "pending-on-closing-account"), {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "transfer-close-reviewer",
    updatedAt: serverTimestamp(), updatedBy: "transfer-close-reviewer"
  }));
  await assertSucceeds(updateDoc(doc(reviewerDb, "financeTransfers", "pending-on-closing-account"), {
    status: "rejetee", rejectedAt: serverTimestamp(), rejectedBy: "transfer-close-reviewer",
    rejectionReason: "Compte clôturé avant validation", updatedAt: serverTimestamp(), updatedBy: "transfer-close-reviewer"
  }));
});

test("la clôture annuelle bloque les nouvelles opérations et transferts de l'exercice", async () => {
  await seed("period-manager", ["finance.periods.manage", "finance.read"]);
  await seed("period-finance-operator", ["finance.manage"]);
  const managerDb = env.authenticatedContext("period-manager").firestore();
  const periodRef = doc(managerDb, "financePeriods", "2026");
  await assertSucceeds(setDoc(periodRef, {
    year: "2026", status: "clos", note: "Clôture annuelle de test",
    closedAt: serverTimestamp(), closedBy: "period-manager",
    createdAt: serverTimestamp(), createdBy: "period-manager"
  }));
  await assertFails(updateDoc(periodRef, { status: "ouvert" }));
  await assertFails(deleteDoc(periodRef));
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "financeAccounts", "period-cash"), financeAccount("system"));
    await setDoc(doc(c.firestore(), "financeAccounts", "period-bank"), financeAccount("system", { name: "Banque période", type: "banque" }));
  });
  const db = env.authenticatedContext("period-finance-operator").firestore();
  await assertFails(setDoc(doc(db, "financeTransactions", "blocked-2026"), transaction("period-finance-operator")));
  await assertFails(setDoc(doc(db, "financeTransactions", "mismatched-year"), transaction("period-finance-operator", { date: "2027-01-02", fiscalYear: "2026" })));
  await assertFails(setDoc(doc(db, "financeTransfers", "blocked-transfer-2026"), financeTransfer("period-finance-operator", {
    sourceAccountId: "period-cash", sourceName: "Caisse principale",
    destinationAccountId: "period-bank", destinationName: "Banque période"
  })));
  await assertFails(setDoc(doc(db, "financeTransfers", "mismatched-transfer-year"), financeTransfer("period-finance-operator", {
    date: "2027-01-02", fiscalYear: "2026", sourceAccountId: "period-cash", sourceName: "Caisse principale",
    destinationAccountId: "period-bank", destinationName: "Banque période"
  })));
  await assertSucceeds(setDoc(doc(db, "financeTransactions", "open-2027"), transaction("period-finance-operator", {
    date: "2027-01-02", fiscalYear: "2027"
  })));
});

test("la clôture d'un exercice exige le périmètre finance.periods.manage", async () => {
  await seed("period-outsider", ["finance.read"]);
  const db = env.authenticatedContext("period-outsider").firestore();
  await assertFails(setDoc(doc(db, "financePeriods", "2026"), {
    year: "2026", status: "clos", closedAt: serverTimestamp(), closedBy: "period-outsider",
    createdAt: serverTimestamp(), createdBy: "period-outsider"
  }));
});

test("les rapprochements sont soumis par finance.manage et validés par un autre responsable", async () => {
  await seed("reconcile-author", ["finance.manage"]);
  await seed("reconcile-reviewer", ["finance.validate"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeAccounts", "reconcile-cash"), financeAccount("system")));
  const author = env.authenticatedContext("reconcile-author").firestore();
  const data = {
    accountId: "reconcile-cash", accountName: "Caisse principale",
    date: "2028-11-19", fiscalYear: "2028", statementBalance: 125000,
    systemBalanceSnapshot: 120000, difference: 5000, reference: "RELEVE-11",
    note: "Comptage de caisse du 19 novembre", status: "soumise",
    createdAt: serverTimestamp(), createdBy: "reconcile-author",
    updatedAt: serverTimestamp(), updatedBy: "reconcile-author"
  };
  const ref = doc(author, "financeReconciliations", "reconcile-001");
  await assertSucceeds(setDoc(ref, data));
  await assertFails(updateDoc(ref, { status: "validee", validatedAt: serverTimestamp(), validatedBy: "reconcile-author", updatedAt: serverTimestamp(), updatedBy: "reconcile-author" }));
  const reviewer = env.authenticatedContext("reconcile-reviewer").firestore();
  await assertSucceeds(updateDoc(doc(reviewer, "financeReconciliations", "reconcile-001"), {
    status: "validee", validatedAt: serverTimestamp(), validatedBy: "reconcile-reviewer",
    updatedAt: serverTimestamp(), updatedBy: "reconcile-reviewer"
  }));
  await assertFails(deleteDoc(doc(reviewer, "financeReconciliations", "reconcile-001")));
});
test("les rapprochements refusent un compte clôturé, un exercice clos et des montants invalides", async () => {
  await seed("reconcile-manager", ["finance.manage"]);
  await env.withSecurityRulesDisabled(async c => {
    await setDoc(doc(c.firestore(), "financeAccounts", "reconcile-closed"), financeAccount("system", { status: "clos" }));
    await setDoc(doc(c.firestore(), "financeAccounts", "reconcile-active"), financeAccount("system"));
    await setDoc(doc(c.firestore(), "financePeriods", "2026"), {
      year: "2026", status: "clos", closedAt: serverTimestamp(), closedBy: "system",
      createdAt: serverTimestamp(), createdBy: "system"
    });
  });
  const db = env.authenticatedContext("reconcile-manager").firestore();
  const base = {
    accountId: "reconcile-active", accountName: "Caisse principale",
    date: "2027-01-01", fiscalYear: "2027", statementBalance: 0,
    systemBalanceSnapshot: 0, difference: 0, reference: "",
    note: "Comptage de caisse effectué", status: "soumise",
    createdAt: serverTimestamp(), createdBy: "reconcile-manager",
    updatedAt: serverTimestamp(), updatedBy: "reconcile-manager"
  };
  await assertSucceeds(setDoc(doc(db, "financeReconciliations", "valid-reconcile"), base));
  await assertFails(setDoc(doc(db, "financeReconciliations", "closed-account"), { ...base, accountId: "reconcile-closed" }));
  await assertFails(setDoc(doc(db, "financeReconciliations", "closed-year"), { ...base, date: "2026-11-19", fiscalYear: "2026" }));
  await assertFails(setDoc(doc(db, "financeReconciliations", "bad-amount"), { ...base, statementBalance: -1 }));
});

test("l'écart du rapprochement doit correspondre exactement aux deux soldes déclarés", async () => {
  await seed("reconcile-math-manager", ["finance.manage"]);
  await env.withSecurityRulesDisabled(async c => setDoc(doc(c.firestore(), "financeAccounts", "reconcile-math"), financeAccount("system")));
  const db = env.authenticatedContext("reconcile-math-manager").firestore();
  const base = {
    accountId: "reconcile-math", accountName: "Caisse principale",
    date: "2027-02-01", fiscalYear: "2027", statementBalance: 15000,
    systemBalanceSnapshot: 10000, difference: 5000, reference: "",
    note: "Contrôle du rapprochement comptable", status: "soumise",
    createdAt: serverTimestamp(), createdBy: "reconcile-math-manager",
    updatedAt: serverTimestamp(), updatedBy: "reconcile-math-manager"
  };
  await assertSucceeds(setDoc(doc(db, "financeReconciliations", "math-valid"), base));
  await assertFails(setDoc(doc(db, "financeReconciliations", "math-invalid"), { ...base, difference: 100 }));
});
