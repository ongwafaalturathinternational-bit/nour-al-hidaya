/**
 * Moteur comptable pur — WAT Connect.
 * Aucune dépendance Firebase ou DOM. Les codes et libellés des comptes
 * proviendront exclusivement du référentiel SYCEBNL vérifié.
 */
export function validateAccountingEntry(entry, accountsByCode, period) {
  const errors = [];
  if (!entry || typeof entry !== "object") return ["Pièce comptable invalide."];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date || "")) errors.push("Date comptable invalide.");
  if (!entry.journalCode) errors.push("Journal obligatoire.");
  if (!Array.isArray(entry.lines) || entry.lines.length < 2) {
    errors.push("Une pièce doit comporter au moins deux lignes.");
    return errors;
  }
  if (!period || period.status !== "open") errors.push("L'exercice ou la période n'est pas ouvert.");
  if (period?.startDate && entry.date < period.startDate) errors.push("La date précède l'ouverture de la période.");
  if (period?.endDate && entry.date > period.endDate) errors.push("La date dépasse la clôture de la période.");

  let debitTotal = 0;
  let creditTotal = 0;
  for (const [index, line] of entry.lines.entries()) {
    const label = `Ligne ${index + 1}`;
    const account = accountsByCode?.[line?.accountCode];
    if (!account || account.status !== "active" || account.postable !== true) {
      errors.push(`${label} : compte absent, inactif ou non imputable.`);
    }
    const debit = line?.debit ?? 0;
    const credit = line?.credit ?? 0;
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit) || debit < 0 || credit < 0) {
      errors.push(`${label} : montants invalides.`);
      continue;
    }
    if ((debit > 0) === (credit > 0)) errors.push(`${label} : renseigner soit le débit, soit le crédit.`);
    debitTotal += debit;
    creditTotal += credit;
    if (!Number.isSafeInteger(debitTotal) || !Number.isSafeInteger(creditTotal)) {
      errors.push("Total de la pièce hors limites numériques.");
      break;
    }
  }
  if (debitTotal <= 0 || creditTotal <= 0 || debitTotal !== creditTotal) {
    errors.push("La pièce n'est pas équilibrée : total débit différent du total crédit.");
  }
  return errors;
}

export function getPostedEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .filter(entry => entry?.status === "posted")
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date))
      || String(a.journalCode).localeCompare(String(b.journalCode))
      || String(a.entryNumber).localeCompare(String(b.entryNumber)));
}

export function buildGeneralLedger(entries, accountCode, opening = { debit: 0, credit: 0 }) {
  const openingDebit = opening?.debit ?? 0;
  const openingCredit = opening?.credit ?? 0;
  if (![openingDebit, openingCredit].every(Number.isSafeInteger)
      || openingDebit < 0 || openingCredit < 0
      || ((openingDebit > 0) && (openingCredit > 0))) {
    throw new TypeError("Solde d'ouverture invalide.");
  }
  let net = openingDebit - openingCredit;
  const rows = [];
  for (const entry of getPostedEntries(entries)) {
    for (const line of entry.lines || []) {
      if (line.accountCode !== accountCode) continue;
      const debit = line.debit ?? 0;
      const credit = line.credit ?? 0;
      if (![debit, credit].every(Number.isSafeInteger) || debit < 0 || credit < 0
          || ((debit > 0) === (credit > 0))) {
        throw new TypeError("Ligne comptable invalide dans le grand livre.");
      }
      net += debit - credit;
      if (!Number.isSafeInteger(net)) throw new RangeError("Solde hors limites numériques.");
      rows.push({
        date: entry.date,
        journalCode: entry.journalCode,
        entryNumber: entry.entryNumber,
        description: line.description || entry.description || "",
        debit,
        credit,
        balanceDebit: Math.max(net, 0),
        balanceCredit: Math.max(-net, 0)
      });
    }
  }
  return rows;
}

export function buildTrialBalance(accounts, entries, openingBalances = {}) {
  const posted = getPostedEntries(entries);
  return (Array.isArray(accounts) ? accounts : [])
    .filter(account => account?.status === "active")
    .slice()
    .sort((a, b) => String(a.code).localeCompare(String(b.code)))
    .map(account => {
      const opening = openingBalances[account.code] || { debit: 0, credit: 0 };
      const openingDebit = opening.debit ?? 0;
      const openingCredit = opening.credit ?? 0;
      let movementDebit = 0;
      let movementCredit = 0;
      for (const entry of posted) {
        for (const line of entry.lines || []) {
          if (line.accountCode !== account.code) continue;
          movementDebit += line.debit ?? 0;
          movementCredit += line.credit ?? 0;
        }
      }
      const net = openingDebit - openingCredit + movementDebit - movementCredit;
      return {
        accountCode: account.code,
        accountLabel: account.label,
        openingDebit,
        openingCredit,
        movementDebit,
        movementCredit,
        closingDebit: Math.max(net, 0),
        closingCredit: Math.max(-net, 0)
      };
    });
}

export function trialBalanceTotals(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((totals, row) => {
    for (const key of ["openingDebit", "openingCredit", "movementDebit", "movementCredit", "closingDebit", "closingCredit"]) {
      const value = row[key] ?? 0;
      if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("Montant de balance invalide.");
      totals[key] += value;
      if (!Number.isSafeInteger(totals[key])) throw new RangeError("Total de balance hors limites numériques.");
    }
    return totals;
  }, { openingDebit: 0, openingCredit: 0, movementDebit: 0, movementCredit: 0, closingDebit: 0, closingCredit: 0 });
}
