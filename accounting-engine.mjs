/**
 * Moteur comptable pur — WAT Connect.
 * Aucune dépendance Firebase ou DOM.
 * Le plan et les libellés proviennent du référentiel SYCEBNL vérifié.
 */

const isIsoDate = value => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const validAmount = value => Number.isSafeInteger(value) && value >= 0;

function assertPostedEntry(entry) {
  if (!entry || typeof entry !== "object" || !isIsoDate(entry.date)
      || typeof entry.journalCode !== "string" || !entry.journalCode.trim()
      || typeof entry.entryNumber !== "string" || !entry.entryNumber.trim()
      || !Array.isArray(entry.lines) || entry.lines.length < 2) {
    throw new TypeError("Pièce comptabilisée incomplète ou invalide.");
  }
  let debit = 0;
  let credit = 0;
  for (const line of entry.lines) {
    const d = line?.debit ?? 0;
    const c = line?.credit ?? 0;
    if (typeof line?.accountCode !== "string" || !/^\\d{2,5}$/.test(line.accountCode)
        || !validAmount(d) || !validAmount(c) || ((d > 0) === (c > 0))) {
      throw new TypeError("Ligne comptable invalide dans une pièce comptabilisée.");
    }
    debit += d;
    credit += c;
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)) {
      throw new RangeError("Total de pièce hors limites numériques.");
    }
  }
  if (debit <= 0 || debit !== credit) {
    throw new TypeError("Une pièce comptabilisée doit être équilibrée.");
  }
}

function assertOpeningBalance(opening) {
  const debit = opening?.debit ?? 0;
  const credit = opening?.credit ?? 0;
  if (!validAmount(debit) || !validAmount(credit) || (debit > 0 && credit > 0)) {
    throw new TypeError("Solde d'ouverture invalide.");
  }
  return { debit, credit };
}

export function validateAccountingEntry(entry, accountsByCode, period) {
  const errors = [];
  if (!entry || typeof entry !== "object") return ["Pièce comptable invalide."];
  if (!isIsoDate(entry.date)) errors.push("Date comptable invalide.");
  if (typeof entry.journalCode !== "string" || !entry.journalCode.trim()) {
    errors.push("Journal obligatoire.");
  }
  if (typeof entry.entryNumber !== "string" || !entry.entryNumber.trim()) {
    errors.push("Numéro de pièce obligatoire.");
  }
  if (!Array.isArray(entry.lines) || entry.lines.length < 2) {
    errors.push("Une pièce doit comporter au moins deux lignes.");
    return errors;
  }
  if (!period || period.status !== "open") errors.push("L'exercice ou la période n'est pas ouvert.");
  if (period?.startDate && (!isIsoDate(period.startDate) || entry.date < period.startDate)) {
    errors.push("La date précède l'ouverture de la période ou la période est invalide.");
  }
  if (period?.endDate && (!isIsoDate(period.endDate) || entry.date > period.endDate)) {
    errors.push("La date dépasse la clôture de la période ou la période est invalide.");
  }

  let debitTotal = 0;
  let creditTotal = 0;
  for (const [index, line] of entry.lines.entries()) {
    const label = `Ligne ${index + 1}`;
    const account = accountsByCode?.[line?.accountCode];
    if (typeof line?.accountCode !== "string" || !/^\\d{2,5}$/.test(line.accountCode)
        || !account || account.status !== "active" || account.postable !== true) {
      errors.push(`${label} : compte absent, inactif ou non imputable.`);
    }
    const debit = line?.debit ?? 0;
    const credit = line?.credit ?? 0;
    if (!validAmount(debit) || !validAmount(credit)) {
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
  const posted = (Array.isArray(entries) ? entries : [])
    .filter(entry => entry?.status === "posted")
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date))
      || String(a.journalCode).localeCompare(String(b.journalCode))
      || String(a.entryNumber).localeCompare(String(b.entryNumber)));
  for (const entry of posted) assertPostedEntry(entry);
  return posted;
}

export function buildGeneralLedger(entries, accountCode, opening = { debit: 0, credit: 0 }) {
  if (typeof accountCode !== "string" || !accountCode.trim()) {
    throw new TypeError("Code de compte obligatoire pour le grand livre.");
  }
  const openingBalance = assertOpeningBalance(opening);
  let net = openingBalance.debit - openingBalance.credit;
  const rows = [];
  for (const entry of getPostedEntries(entries)) {
    for (const line of entry.lines) {
      if (line.accountCode !== accountCode) continue;
      const debit = line.debit ?? 0;
      const credit = line.credit ?? 0;
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
  // Les comptes inactifs restent visibles dans les états historiques :
  // leur désactivation interdit les nouvelles imputations, pas la traçabilité passée.
  const activeAccounts = (Array.isArray(accounts) ? accounts : [])
    .filter(account => account?.status === "active" || account?.status === "inactive")
    .slice()
    .sort((a, b) => String(a.code).localeCompare(String(b.code)));
  const accountCodes = new Set();
  for (const account of activeAccounts) {
    if (typeof account.code !== "string" || !/^\\d{2,5}$/.test(account.code) || accountCodes.has(account.code)) {
      throw new TypeError("Référentiel de comptes invalide ou code en double.");
    }
    accountCodes.add(account.code);
  }
  for (const entry of posted) {
    for (const line of entry.lines) {
      if (!accountCodes.has(line.accountCode)) {
        throw new TypeError(`Le compte ${line.accountCode} d'une écriture n'existe pas dans la balance.`);
      }
    }
  }
  return activeAccounts.map(account => {
    const opening = assertOpeningBalance(openingBalances?.[account.code]);
    let movementDebit = 0;
    let movementCredit = 0;
    for (const entry of posted) {
      for (const line of entry.lines) {
        if (line.accountCode !== account.code) continue;
        movementDebit += line.debit ?? 0;
        movementCredit += line.credit ?? 0;
        if (!Number.isSafeInteger(movementDebit) || !Number.isSafeInteger(movementCredit)) {
          throw new RangeError("Mouvements de balance hors limites numériques.");
        }
      }
    }
    const net = opening.debit - opening.credit + movementDebit - movementCredit;
    if (!Number.isSafeInteger(net)) throw new RangeError("Solde de balance hors limites numériques.");
    return {
      accountCode: account.code,
      accountLabel: account.label,
      openingDebit: opening.debit,
      openingCredit: opening.credit,
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
      if (!validAmount(value)) throw new TypeError("Montant de balance invalide.");
      totals[key] += value;
      if (!Number.isSafeInteger(totals[key])) throw new RangeError("Total de balance hors limites numériques.");
    }
    return totals;
  }, { openingDebit: 0, openingCredit: 0, movementDebit: 0, movementCredit: 0, closingDebit: 0, closingCredit: 0 });
}
