/**
 * Politique d'accès Finance WAT Connect.
 * Politique de référence pure pour tests ; les mêmes interdictions doivent
 * être imposées côté serveur/Firestore avant toute mise en production.
 */
const permissions = Object.freeze({
  financial_reader: new Set([
    "finance.dashboard.read", "finance.operations.read", "accounting.journals.read",
    "accounting.ledger.read", "accounting.trial_balance.read", "accounting.reports.read",
    "accounting.accounts.read", "bank.reconciliation.read", "documents.read"
  ]),
  financial_manager: new Set([
    "finance.dashboard.read", "finance.operations.read", "finance.operations.create",
    "accounting.entries.create", "accounting.entries.submit", "accounting.journals.read",
    "accounting.ledger.read", "accounting.trial_balance.read", "accounting.reports.read",
    "accounting.accounts.read", "bank.reconciliation.read", "documents.read"
  ]),
  financial_validator: new Set([
    "finance.dashboard.read", "finance.operations.read", "finance.operations.validate",
    "accounting.entries.read", "accounting.entries.validate", "accounting.entries.post",
    "accounting.journals.read", "accounting.ledger.read", "accounting.trial_balance.read",
    "accounting.reports.read", "accounting.accounts.read", "bank.reconciliation.read",
    "bank.reconciliation.validate", "documents.read"
  ]),
  budget_manager: new Set([
    "finance.dashboard.read", "finance.operations.read", "budgets.read",
    "budgets.create", "budgets.submit", "budgets.variance.read", "accounting.reports.read"
  ]),
  financial_controller: new Set([
    "finance.dashboard.read", "finance.operations.read", "finance.operations.history.read",
    "accounting.entries.read", "accounting.journals.read", "accounting.ledger.read",
    "accounting.trial_balance.read", "accounting.reports.read", "accounting.accounts.read",
    "bank.reconciliation.read", "bank.reconciliation.history.read", "budgets.read",
    "budgets.variance.read", "documents.read", "audit.logs.read",
    "control.observations.read", "control.observations.create",
    "control.observations.respond", "control.reports.create", "control.reports.export"
  ]),
  accounting_admin: new Set([
    "finance.dashboard.read", "finance.operations.read", "accounting.accounts.read",
    "accounting.accounts.admin", "accounting.journals.read", "accounting.journals.admin",
    "accounting.periods.admin", "accounting.roles.admin", "audit.logs.read"
  ])
});

const forbiddenControllerActions = new Set([
  "finance.operations.create", "finance.operations.update", "finance.operations.delete",
  "finance.operations.validate", "finance.operations.pay", "finance.transfers.create",
  "finance.transfers.validate", "budgets.create", "budgets.update", "budgets.approve",
  "accounting.entries.create", "accounting.entries.update", "accounting.entries.validate",
  "accounting.entries.post", "accounting.entries.reverse", "accounting.entries.delete",
  "accounting.lettering.create", "accounting.lettering.remove",
  "bank.reconciliation.create", "bank.reconciliation.update",
  "bank.reconciliation.validate", "accounting.periods.close",
  "accounting.accounts.admin", "accounting.journals.admin",
  "documents.delete", "audit.logs.delete"
]);

export function canFinanceAction(role, action) {
  if (role === "financial_controller" && forbiddenControllerActions.has(action)) return false;
  return permissions[role]?.has(action) === true;
}

export function getFinancePermissions(role) {
  return [...(permissions[role] || [])].sort();
}

export function isFinancialControllerReadOnly(role) {
  return role === "financial_controller";
}
