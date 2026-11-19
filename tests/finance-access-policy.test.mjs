import test from "node:test";
import assert from "node:assert/strict";
import {
  canFinanceAction,
  getFinancePermissions,
  isFinancialControllerReadOnly
} from "../finance-access-policy.mjs";

test("le contrôleur financier consulte les états, livres, justificatifs et traces", () => {
  for (const action of [
    "finance.dashboard.read", "finance.operations.history.read",
    "accounting.journals.read", "accounting.ledger.read",
    "accounting.trial_balance.read", "accounting.reports.read",
    "bank.reconciliation.history.read", "documents.read", "audit.logs.read"
  ]) assert.equal(canFinanceAction("financial_controller", action), true, action);
});

test("le contrôleur financier peut consigner des observations séparées", () => {
  assert.equal(canFinanceAction("financial_controller", "control.observations.create"), true);
  assert.equal(canFinanceAction("financial_controller", "control.reports.create"), true);
  assert.equal(canFinanceAction("financial_controller", "control.reports.export"), true);
});

test("le contrôleur financier ne saisit, ne valide, ne paie et ne comptabilise rien", () => {
  for (const action of [
    "finance.operations.create", "finance.operations.update", "finance.operations.validate",
    "finance.operations.pay", "finance.transfers.create", "accounting.entries.create",
    "accounting.entries.validate", "accounting.entries.post", "accounting.entries.reverse",
    "accounting.lettering.create", "accounting.lettering.remove",
    "bank.reconciliation.create", "bank.reconciliation.validate",
    "accounting.periods.close", "documents.delete", "audit.logs.delete"
  ]) assert.equal(canFinanceAction("financial_controller", action), false, action);
});

test("les droits du contrôleur ne sont pas ceux du gestionnaire ou du validateur", () => {
  assert.equal(canFinanceAction("financial_controller", "accounting.entries.create"), false);
  assert.equal(canFinanceAction("financial_manager", "accounting.entries.create"), true);
  assert.equal(canFinanceAction("financial_validator", "accounting.entries.post"), true);
  assert.equal(canFinanceAction("financial_controller", "accounting.entries.post"), false);
  assert.equal(isFinancialControllerReadOnly("financial_controller"), true);
  assert.equal(isFinancialControllerReadOnly("financial_manager"), false);
});

test("un rôle inconnu ne reçoit aucun droit par défaut", () => {
  assert.deepEqual(getFinancePermissions("unknown_role"), []);
  assert.equal(canFinanceAction("unknown_role", "finance.dashboard.read"), false);
});
