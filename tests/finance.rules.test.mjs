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
    type: "recette", category: "don", amount: 25000, date: "2026-11-19",
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
    institution: "Siège WAT", reference: "4321",
    createdAt: serverTimestamp(), createdBy: uid, updatedAt: serverTimestamp(), updatedBy: uid,
    ...extra
  };
}

test("finance.accounts.manage crée et clôture les comptes sans pouvoir les supprimer ni les réactiver", async () => {
  await seed("account-manager", ["finance.accounts.manage"]);
  const db = env.authenticatedContext("account-manager").firestore();
  const ref = doc(db, "financeAccounts", "cash-main");
  await assertSucceeds(setDoc(ref, financeAccount("account-manager")));
  await assertSucceeds(getDoc(ref));
  await assertFails(updateDoc(ref, { name: "Compte modifié", updatedAt: serverTimestamp(), updatedBy: "account-manager" }));
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
