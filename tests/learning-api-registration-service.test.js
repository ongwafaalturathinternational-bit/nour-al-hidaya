import { createLearningWorker } from "../workers/learning-api/src/index.js";
import assert from "node:assert/strict";
import test from "node:test";
import { persistVerifiedRegistration, submitAgentRegistration } from "../workers/learning-api/src/registration-service.js";

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

test("agent registration checks both perimeters and uses the server group period", async () => {
  const read = "learning.beneficiaries.read", create = "learning.beneficiaries.create";
  const encode = value => value === null ? {nullValue:null}
    : typeof value === "string" ? {stringValue:value}
    : typeof value === "boolean" ? {booleanValue:value}
    : Array.isArray(value) ? {arrayValue:{values:value.map(encode)}}
    : {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)]))}};
  const doc = value => encode(value).mapValue;
  const scopes=[read,create];
  const assignment={assignmentId:"assignment",active:true,scopeGrants:scopes,validFrom:null,validUntil:null,
    groupIds:["source-group","target"],programIds:["p"],structureIds:["s"]};
  const documents={
    learningGroups:doc({name:"Group",status:"active",programId:"p",structureId:"s",periodId:"trusted-period"}),
    learningStructures:doc({name:"Center",status:"active",type:"center"}),
    programs:doc({status:"active"}),
    learningStaffAssignments:doc({active:true,assignments:[assignment]})
  };
  let writes;
  const options={
    registrationKey:await crypto.subtle.generateKey({name:"HMAC",hash:"SHA-256"},false,["sign"]),
    authorizeStaff:async (_request,_config,scope)=>scopes.includes(scope)?
      {ok:true,principal:{uid:"agent"}}:{ok:false,status:403,error:"scope_denied"},
    resolveBeneficiary:async()=>({beneficiaryId:"b",enrollmentId:"source",groupId:"source-group",programId:"p",structureId:"s"}),
    firestore:{runRegistrationTransaction(callback){return callback(this)},
      async getDocument(collection){if(documents[collection])return documents[collection];throw Error("firestore_document_not_found")},
      async commitDocuments(batch){writes=batch}}
  };
  const request=new Request("https://example.invalid/agent");
  const input={beneficiaryId:"b",sourceEnrollmentId:"source",groupId:"target",
    operationId:"a87160d1-1f0a-4d4c-92b0-63e79f5322bc"};
  assert.equal((await submitAgentRegistration(request,{}, {...input,periodId:"forged"},options)).status,400);
  documents.learningStaffAssignments=doc({active:true,assignments:[{...assignment,groupIds:["source-group"]}]});
  assert.equal((await submitAgentRegistration(request,{},input,options)).status,403);
  assert.equal(writes,undefined);
  documents.learningStaffAssignments=doc({active:true,assignments:[assignment]});
  assert.equal((await submitAgentRegistration(request,{},input,options)).status,"pending");
  assert.equal(writes[0].fields.periodId,"trusted-period");
  assert.equal(writes[0].fields.groupId,"target");
  assert.equal(writes[2].fields.actorUid,"agent");

  const routeRequest = (route, body = JSON.stringify(input)) =>
    new Request(`https://example.invalid/api/learning/registrations/${route}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + "a".repeat(20) },
      body,
    });
  const config = { environment: "staging", firebaseProjectId: "wat-connect-staging" };
  writes = undefined;
  for (const agentRegistration of [
    { config, options },
    { enabled: true, config: { ...config, environment: "production" }, options },
    { enabled: true, config: { ...config, firebaseProjectId: "wat-connect" }, options },
    { enabled: true, config, options: {} },
  ]) {
    const disabled = createLearningWorker({ agentRegistration });
    assert.equal((await disabled.fetch(routeRequest("agent"))).status, 503);
  }
  assert.equal(writes, undefined);
  const worker = createLearningWorker({ agentRegistration: { enabled: true, config, options } });
  assert.equal((await worker.fetch(routeRequest("public"))).status, 503);
  assert.equal((await worker.fetch(routeRequest("agent", "{"))).status, 400);
  assert.equal(writes, undefined);
  const response = await worker.fetch(routeRequest("agent"));
  assert.equal(response.status, 200);
  const { enrollmentId, ...body } = await response.json();
  assert.ok(enrollmentId);
  assert.deepEqual(body, { status: "pending" });
  assert.equal(writes[2].fields.actorUid, "agent");

  const firstTransaction = options.firestore.runRegistrationTransaction;
  options.firestore.runRegistrationTransaction = () => assert.fail("Invalid operation opened a transaction");
  const invalid = await worker.fetch(routeRequest("agent", JSON.stringify({
    ...input, operationId: "invalid",
  })));
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "registration_operation_id_invalid" });
  options.firestore.runRegistrationTransaction = firstTransaction;

  const receipt = writes[1];
  const getDocument = options.firestore.getDocument;
  options.firestore.getDocument = function (collection, id) {
    if (collection === receipt.collection && id === receipt.id) return doc(receipt.fields);
    return getDocument.call(this, collection, id);
  };
  writes = undefined;
  const replay = await worker.fetch(routeRequest("agent"));
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { enrollmentId, status: "pending" });
  assert.equal(writes, undefined);
  options.firestore.getDocument = getDocument;

  let attempts=0, commits=0;
  options.firestore.runRegistrationTransaction=function(callback){attempts++;return callback(this)};
  options.firestore.commitDocuments=async()=>{
    commits++;
    documents.learningStaffAssignments=doc({active:true,assignments:[{...assignment,groupIds:["source-group"]}]});
    throw Error("firestore_document_conflict");
  };
  assert.equal((await submitAgentRegistration(request,{},input,options)).status,403);
  assert.equal(attempts,2);
  assert.equal(commits,1);

  attempts=0;
  documents.learningStaffAssignments=doc({active:true,assignments:[assignment]});
  options.firestore.commitDocuments=async()=>{throw Error("firestore_document_conflict")};
  assert.equal((await submitAgentRegistration(request,{},input,options)).error,"registration_transaction_conflict");
  assert.equal(attempts,2);

  // The real staff policy must re-read the account after a transaction conflict.
  let tokenChecks = 0, accountReads = 0, disabled = false;
  delete options.authorizeStaff;
  options.verifyToken = async () => {
    tokenChecks++;
    return { uid: "agent", emailVerified: true, claims: { auth_time: 100 } };
  };
  options.lookupAuthUser = async () => {
    accountReads++;
    return { uid: "agent", emailVerified: true, disabled, validSince: 0 };
  };
  documents.staffAccess = doc({ active: true, scopes });
  attempts = 0;
  options.firestore.commitDocuments = async () => {
    disabled = true;
    throw Error("firestore_document_conflict");
  };
  const revoked = await worker.fetch(routeRequest("agent"));
  assert.equal(revoked.status, 403);
  assert.deepEqual(await revoked.json(), { error: "firebase_staff_account_inactive" });
  assert.equal(tokenChecks, 1);
  assert.equal(attempts, 2);
  assert.equal(accountReads, 3);
});

test("un jeton Firebase non valide ne déclenche aucune transaction d’inscription agent", async () => {
  const request = new Request("https://example.invalid/agent", {
    headers: { authorization: "Bearer " + "a".repeat(20) },
  });
  let transactions = 0;
  const result = await submitAgentRegistration(request, { firebaseProjectId: "wat-connect-staging" }, {
    beneficiaryId: "beneficiary", sourceEnrollmentId: "source", groupId: "target",
    operationId: "a87160d1-1f0a-4d4c-92b0-63e79f5322bc",
  }, {
    registrationKey: {},
    firestore: { runRegistrationTransaction() { transactions++; } },
  });
  assert.deepEqual(result, { ok: false, status: 401, error: "authentication_invalid" });
  assert.equal(transactions, 0);
});
