import assert from "node:assert/strict";
import test from "node:test";
import { registrationOperation } from "../workers/learning-api/src/registration-idempotency.js";

const key = await crypto.subtle.generateKey({name:"HMAC",hash:"SHA-256"},false,["sign"]);
const input = {key,namespace:"agent:fictional",operationId:"a87160d1-1f0a-4d4c-92b0-63e79f5322bc",
  payload:{first:"A",nested:{second:2,first:1}}};

test("identifies the same send despite JSON field order, while detecting a different payload", async () => {
  const first=await registrationOperation(input);
  const replay=await registrationOperation({...input,payload:{nested:{first:1,second:2},first:"A"}});
  const changed=await registrationOperation({...input,payload:{first:"B"}});
  assert.deepEqual(replay,first);
  assert.equal(changed.receiptId,first.receiptId);
  assert.notEqual(changed.fingerprint,first.fingerprint);
  assert.match(first.receiptId,/^[a-f0-9]{64}$/);
  assert.match(first.fingerprint,/^[a-f0-9]{64}$/);
});

test("isolates receipts across actors and rejects malformed operation IDs", async () => {
  const first=await registrationOperation(input);
  const other=await registrationOperation({...input,namespace:"agent:other"});
  assert.notEqual(first.receiptId,other.receiptId);
  assert.notEqual(first.fingerprint,other.fingerprint);
  assert.deepEqual(await registrationOperation({...input,operationId:"short"}),{
    ok:false,error:"registration_operation_id_invalid"
  });
});
