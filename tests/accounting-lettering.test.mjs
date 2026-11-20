import test from "node:test";
import assert from "node:assert/strict";
import {
  getLetteredAmount,
  getLetteringResidual,
  validateLetteringGroup
} from "../accounting-lettering.mjs";

const lines = {
  d1: { id: "d1", accountCode: "4111", thirdPartyId: "client-1", currency: "XOF", debit: 10000, credit: 0, status: "posted" },
  c1: { id: "c1", accountCode: "4111", thirdPartyId: "client-1", currency: "XOF", debit: 0, credit: 6000, status: "posted" },
  c2: { id: "c2", accountCode: "4111", thirdPartyId: "client-1", currency: "XOF", debit: 0, credit: 4000, status: "posted" },
  c3: { id: "c3", accountCode: "4011", thirdPartyId: "client-1", currency: "XOF", debit: 0, credit: 4000, status: "posted" },
  c4: { id: "c4", accountCode: "4111", thirdPartyId: "client-2", currency: "XOF", debit: 0, credit: 4000, status: "posted" },
  draft: { id: "draft", accountCode: "4111", thirdPartyId: "client-1", currency: "XOF", debit: 0, credit: 4000, status: "draft" }
};

test("calcule le reliquat d'une ligne après lettrage partiel", () => {
  const existing = [{ allocations: [{ lineId: "d1", amount: 3000 }] }];
  assert.equal(getLetteredAmount("d1", existing), 3000);
  assert.equal(getLetteringResidual(lines.d1, existing), 7000);
});

test("accepte un lettrage partiel équilibré entre plusieurs lignes", () => {
  const group = {
    debitAllocations: [{ lineId: "d1", amount: 10000 }],
    creditAllocations: [
      { lineId: "c1", amount: 6000 },
      { lineId: "c2", amount: 4000 }
    ]
  };
  assert.deepEqual(validateLetteringGroup(group, lines), []);
});

test("refuse un lettrage déséquilibré", () => {
  const group = {
    debitAllocations: [{ lineId: "d1", amount: 10000 }],
    creditAllocations: [{ lineId: "c1", amount: 6000 }]
  };
  assert.ok(validateLetteringGroup(group, lines).some(x => x.includes("doit égaler")));
});

test("refuse les lignes de comptes différents ou de tiers différents", () => {
  const accountMismatch = {
    debitAllocations: [{ lineId: "d1", amount: 4000 }],
    creditAllocations: [{ lineId: "c3", amount: 4000 }]
  };
  assert.ok(validateLetteringGroup(accountMismatch, lines).some(x => x.includes("même compte")));
  const partyMismatch = {
    debitAllocations: [{ lineId: "d1", amount: 4000 }],
    creditAllocations: [{ lineId: "c4", amount: 4000 }]
  };
  assert.ok(validateLetteringGroup(partyMismatch, lines).some(x => x.includes("même tiers")));
});

test("refuse une ligne non comptabilisée", () => {
  const group = {
    debitAllocations: [{ lineId: "d1", amount: 4000 }],
    creditAllocations: [{ lineId: "draft", amount: 4000 }]
  };
  assert.ok(validateLetteringGroup(group, lines).some(x => x.includes("non comptabilisée")));
});

test("empêche de lettrer plus que le reliquat disponible", () => {
  const existing = [{ allocations: [{ lineId: "d1", amount: 7000 }] }];
  const group = {
    debitAllocations: [{ lineId: "d1", amount: 4000 }],
    creditAllocations: [{ lineId: "c1", amount: 4000 }]
  };
  assert.ok(validateLetteringGroup(group, lines, existing).some(x => x.includes("dépasse le reliquat")));
});

test("refuse les allocations dupliquées et les montants nuls", () => {
  const duplicate = {
    debitAllocations: [{ lineId: "d1", amount: 5000 }],
    creditAllocations: [{ lineId: "d1", amount: 5000 }]
  };
  assert.ok(validateLetteringGroup(duplicate, lines).some(x => x.includes("plusieurs fois")));
  const zero = {
    debitAllocations: [{ lineId: "d1", amount: 0 }],
    creditAllocations: [{ lineId: "c1", amount: 0 }]
  };
  assert.ok(validateLetteringGroup(zero, lines).some(x => x.includes("invalide")));
});
