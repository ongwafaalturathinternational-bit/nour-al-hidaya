/**
 * Outils purs de lettrage comptable — WAT Connect.
 * Les écritures doivent déjà être comptabilisées.
 * La validation définitive et l'enregistrement restent côté serveur.
 */

const positiveAmount = value => Number.isSafeInteger(value) && value > 0;

function getAllocations(letterings = []) {
  return (Array.isArray(letterings) ? letterings : [])
    .flatMap(item => Array.isArray(item?.allocations) ? item.allocations : []);
}

export function getLetteredAmount(lineId, letterings = []) {
  if (typeof lineId !== "string" || !lineId) {
    throw new TypeError("Identifiant de ligne obligatoire.");
  }
  return getAllocations(letterings)
    .filter(allocation => allocation?.lineId === lineId)
    .reduce((total, allocation) => {
      if (!positiveAmount(allocation.amount)) {
        throw new TypeError("Allocation de lettrage invalide.");
      }
      const next = total + allocation.amount;
      if (!Number.isSafeInteger(next)) throw new RangeError("Total lettré hors limites.");
      return next;
    }, 0);
}

export function getLetteringResidual(line, letterings = []) {
  if (!line || typeof line.id !== "string") {
    throw new TypeError("Ligne comptable invalide.");
  }
  const debit = line.debit ?? 0;
  const credit = line.credit ?? 0;
  if (!Number.isSafeInteger(debit) || debit < 0
      || !Number.isSafeInteger(credit) || credit < 0
      || ((debit > 0) === (credit > 0))) {
    throw new TypeError("Une ligne à lettrer doit porter un seul montant positif.");
  }
  const originalAmount = debit || credit;
  const lettered = getLetteredAmount(line.id, letterings);
  if (lettered > originalAmount) {
    throw new RangeError("Le montant déjà lettré dépasse le montant de la ligne.");
  }
  return originalAmount - lettered;
}

export function validateLetteringGroup(group, linesById, existingLetterings = []) {
  const errors = [];
  if (!group || typeof group !== "object") return ["Groupe de lettrage invalide."];
  const debitAllocations = group.debitAllocations;
  const creditAllocations = group.creditAllocations;
  if (!Array.isArray(debitAllocations) || !debitAllocations.length
      || !Array.isArray(creditAllocations) || !creditAllocations.length) {
    return ["Le lettrage doit associer au moins une ligne débitrice et une ligne créditrice."];
  }

  const all = [
    ...debitAllocations.map(item => ({ ...item, side: "debit" })),
    ...creditAllocations.map(item => ({ ...item, side: "credit" }))
  ];
  const seen = new Set();
  const resolved = [];
  let debitTotal = 0;
  let creditTotal = 0;

  for (const allocation of all) {
    const { lineId, amount, side } = allocation;
    if (typeof lineId !== "string" || !lineId || seen.has(lineId)) {
      errors.push("Une ligne est absente ou présente plusieurs fois dans le même lettrage.");
      continue;
    }
    seen.add(lineId);
    const line = linesById?.[lineId];
    if (!line || line.status !== "posted") {
      errors.push(`La ligne ${lineId} est absente ou non comptabilisée.`);
      continue;
    }
    const expected = side === "debit" ? line.debit : line.credit;
    const opposite = side === "debit" ? line.credit : line.debit;
    if (!positiveAmount(expected) || (opposite ?? 0) !== 0) {
      errors.push(`La ligne ${lineId} n'est pas du côté ${side} attendu.`);
      continue;
    }
    if (!positiveAmount(amount)) {
      errors.push(`Montant de lettrage invalide pour la ligne ${lineId}.`);
      continue;
    }
    try {
      if (amount > getLetteringResidual(line, existingLetterings)) {
        errors.push(`Le montant à lettrer dépasse le reliquat de la ligne ${lineId}.`);
      }
    } catch (error) {
      errors.push(error.message);
    }
    if (side === "debit") debitTotal += amount;
    else creditTotal += amount;
    if (!Number.isSafeInteger(debitTotal) || !Number.isSafeInteger(creditTotal)) {
      errors.push("Total du lettrage hors limites numériques.");
      break;
    }
    resolved.push(line);
  }

  if (resolved.length === all.length) {
    const first = resolved[0];
    for (const line of resolved.slice(1)) {
      if (line.accountCode !== first.accountCode) {
        errors.push("Toutes les lignes lettrées doivent appartenir au même compte.");
        break;
      }
      if ((line.currency || "XOF") !== (first.currency || "XOF")) {
        errors.push("Toutes les lignes lettrées doivent utiliser la même devise.");
        break;
      }
      if ((line.thirdPartyId || null) !== (first.thirdPartyId || null)) {
        errors.push("Toutes les lignes lettrées doivent concerner le même tiers.");
        break;
      }
    }
  }
  if (debitTotal <= 0 || debitTotal !== creditTotal) {
    errors.push("Le total des montants lettrés au débit doit égaler le total au crédit.");
  }
  return [...new Set(errors)];
}
