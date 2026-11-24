import assert from "node:assert/strict";
import test from "node:test";
import { persistVerifiedRegistration } from "../workers/learning-api/src/registration-service.js";

test("reuses an atomic receipt after a lost response and rejects changed content", async () => {
  const key = await crypto.subtle.generateKey({name:"HMAC",hash:"SHA-256"},false,["sign"]);
  let batch, commits=0;
  const firestore = {
    async getDocument(collection,id) {
      const row = batch?.find(write=>write.collection===collection && write.id===id);
      if (!row) throw Error("firestore_document_not_found");
      return {fields:Object.fromEntries(Object.entries(row.fields).map(([name,value])=>[name,{stringValue:value}]))};
    },
    async commitDocuments(writes) {
      commits++;
      batch=writes;
      throw Error("response lost");
    }
  };
  const input={firestore,key,namespace:"test:agent",operationId:"a87160d1-1f0a-4d4c-92b0-63e79f5322bc",
    enrollment:{beneficiaryId:"b",programId:"p",structureId:"s",periodId:"t",status:"active"}};
  const result=await persistVerifiedRegistration(input);
  assert.equal(result.ok,true);
  assert.equal(result.status,"pending");
  assert.deepEqual(batch.map(row=>row.collection),["learningEnrollments","learningRegistrationReceipts","learningAuditLogs"]);
  assert.ok(batch.every(row=>row.operation==="create" && row.precondition.exists===false));
  assert.equal(batch[0].fields.status,"pending");
  assert.deepEqual(await persistVerifiedRegistration(input),result);
  assert.equal((await persistVerifiedRegistration({...input,enrollment:{...input.enrollment,programId:"other"}})).status,409);
  assert.equal(commits,1);
});
