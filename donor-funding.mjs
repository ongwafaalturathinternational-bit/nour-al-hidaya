/**
 * Registre des donateurs et suivi des financements/bailleurs — WAT Connect.
 * Fonctions de validation pures : aucune écriture persistante ni autorisation
 * serveur n'est accordée par ce module.
 */

const isText = value => typeof value === "string" && value.trim().length > 0;
const isDate = value => {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
};
const isPositiveAmount = value => Number.isSafeInteger(value) && value > 0;

/**
 * Contrôle les mentions du registre des donateurs prévu par le SYCEBNL.
 * Pour un don en nature, amountValue doit représenter la valeur documentée.
 */
export function validateDonorRegisterEntry(entry = {}) {
  const errors = [];
  if (!isDate(entry.receivedAt)) errors.push("La date de réception du don est obligatoire et doit être valide.");
  if (!isText(entry.donorName)) errors.push("L'identité ou la dénomination du donateur est obligatoire.");
  if (!isText(entry.donorAddress)) errors.push("L'adresse du donateur est obligatoire.");
  if (!isText(entry.donorContact)) errors.push("Un moyen de contact du donateur est obligatoire.");
  if (!isText(entry.organizationRegistration)) errors.push("La référence d'enregistrement de l'ONG doit être renseignée.");
  if (!isText(entry.organizationAddress)) errors.push("L'adresse du siège de l'ONG doit être renseignée.");
  if (!isText(entry.organizationContact)) errors.push("Les coordonnées de l'ONG doivent être renseignées.");
  if (!isPositiveAmount(entry.amountValue)) errors.push("La valeur du don doit être un montant entier positif documenté.");
  if (!["cash", "bank_transfer", "mobile_money", "in_kind", "other"].includes(entry.method)) {
    errors.push("Le mode ou la nature du don doit être précisé.");
  }
  if (entry.method === "in_kind" && !isText(entry.inKindDescription)) {
    errors.push("La description du don en nature est obligatoire.");
  }
  if (!isText(entry.receiptNumber)) errors.push("Le numéro continu du registre ou du reçu doit être renseigné.");
  if (!isText(entry.legalRepresentative)) errors.push("Le représentant légal ayant signé l'inscription doit être identifié.");
  if (entry.signed !== true) errors.push("L'inscription doit être signée par le représentant légal.");
  return errors;
}

/** Vérifie une fiche bailleur/partenaire financier. */
export function validateFunderProfile(funder = {}) {
  const errors = [];
  if (!isText(funder.name)) errors.push("Le nom du bailleur ou partenaire financier est obligatoire.");
  if (!isText(funder.category)) errors.push("La catégorie du partenaire doit être précisée.");
  if (!isText(funder.country)) errors.push("Le pays du partenaire doit être renseigné.");
  if (!isText(funder.primaryContact)) errors.push("Le contact principal du partenaire est obligatoire.");
  if (funder.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(funder.email)) {
    errors.push("L'adresse électronique du partenaire n'est pas valide.");
  }
  return errors;
}

/**
 * Valide une convention/subvention. Les montants sont stockés en unités
 * monétaires entières (XOF sans décimales) et les dépenses éligibles sont
 * décrites explicitement afin de ne pas assimiler une subvention affectée à
 * une recette libre d'emploi.
 */
export function validateGrantAgreement(grant = {}) {
  const errors = [];
  if (!isText(grant.funderId)) errors.push("Le bailleur lié à la convention est obligatoire.");
  if (!isText(grant.projectId)) errors.push("Le projet financé doit être identifié.");
  if (!isText(grant.agreementNumber)) errors.push("La référence de convention est obligatoire.");
  if (!isText(grant.title)) errors.push("L'intitulé du financement est obligatoire.");
  if (!isText(grant.currency)) errors.push("La devise du financement doit être précisée.");
  if (!isPositiveAmount(grant.awardedAmount)) errors.push("Le montant accordé doit être un entier positif.");
  if (!isDate(grant.startDate) || !isDate(grant.endDate)) {
    errors.push("Les dates de début et de fin de convention doivent être valides.");
  } else if (grant.endDate < grant.startDate) {
    errors.push("La date de fin ne peut pas précéder la date de début.");
  }
  if (!["draft", "submitted", "approved", "active", "suspended", "closed", "cancelled"].includes(grant.status)) {
    errors.push("Le statut de la convention est invalide.");
  }
  if (!Array.isArray(grant.eligibleExpenseCategories) || grant.eligibleExpenseCategories.length === 0 ||
      grant.eligibleExpenseCategories.some(item => !isText(item))) {
    errors.push("Les catégories de dépenses éligibles doivent être définies.");
  }
  if (!Array.isArray(grant.reportingRequirements) ||
      grant.reportingRequirements.some(item => !isText(item))) {
    errors.push("Les exigences de rapportage doivent être une liste de consignes valides.");
  }
  if (!Array.isArray(grant.tranches)) errors.push("Le calendrier des tranches doit être une liste.");
  else {
    const trancheTotal = grant.tranches.reduce((sum, tranche) =>
      sum + (Number.isSafeInteger(tranche.amount) && tranche.amount > 0 ? tranche.amount : 0), 0);
    if (grant.tranches.some(tranche => !isPositiveAmount(tranche.amount) ||
        !isDate(tranche.expectedDate))) {
      errors.push("Chaque tranche doit avoir un montant positif et une date prévisionnelle valide.");
    }
    if (isPositiveAmount(grant.awardedAmount) && trancheTotal > grant.awardedAmount) {
      errors.push("Le total des tranches dépasse le montant accordé.");
    }
  }
  return errors;
}

/** Calcule le disponible d'une subvention à partir des dépenses validées. */
export function getGrantAvailableBalance(awardedAmount, approvedExpenses = []) {
  if (!isPositiveAmount(awardedAmount) || !Array.isArray(approvedExpenses)) return null;
  let spent = 0;
  for (const expense of approvedExpenses) {
    if (!Number.isSafeInteger(expense.amount) || expense.amount < 0) return null;
    spent += expense.amount;
    if (!Number.isSafeInteger(spent)) return null;
  }
  return awardedAmount - spent;
}

/** Vérifie les jalons de rapportage et signale les échéances en retard. */
export function getGrantReportingStatus(requirements = [], asOfDate) {
  if (!Array.isArray(requirements) || !isDate(asOfDate)) return [];
  return requirements.map(item => {
    const valid = isDate(item.dueDate);
    return {
      id: item.id ?? null,
      label: item.label ?? "",
      dueDate: item.dueDate ?? null,
      submittedAt: item.submittedAt ?? null,
      status: item.submittedAt ? "submitted" : !valid ? "invalid_date" :
        item.dueDate < asOfDate ? "overdue" : "pending"
    };
  });
}
