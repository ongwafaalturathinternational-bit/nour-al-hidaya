import assert from "node:assert/strict";
import test from "node:test";
import { readRegistrationRequest } from "../workers/learning-api/src/registration-request.js";

const body = (value, headers = {}) => new Request("https://example.invalid/registration", {
  method: "POST", body: value, headers: {"content-type":"application/json; charset=utf-8",...headers},
  ...(value instanceof ReadableStream ? {duplex:"half"} : {})
});

test("decodes a JSON object without requiring a Firebase account", async () => {
  const draft = { reference: "é" };
  assert.deepEqual(await readRegistrationRequest(body(JSON.stringify(draft))),{ok:true,data:draft});
  assert.equal((await readRegistrationRequest(body("null"))).error,"registration_object_required");
  assert.equal((await readRegistrationRequest(body("[]"))).error,"registration_object_required");
  assert.equal((await readRegistrationRequest(body("{"))).error,"registration_json_invalid");
  assert.equal((await readRegistrationRequest(body(new Uint8Array([255])))).error,"registration_json_invalid");
  assert.equal((await readRegistrationRequest(body("{}", {"content-type":"text/plain"}))).status,415);
});

test("counts UTF-8 bytes from the stream and cancels oversized bodies", async () => {
  let cancelled=false;
  const stream=new ReadableStream({
    start(controller){controller.enqueue(new TextEncoder().encode('{"x":"é"}'));},
    cancel(){cancelled=true;}
  });
  assert.deepEqual(await readRegistrationRequest(body(stream,{"content-length":"1"}),9),
    {ok:false,status:413,error:"registration_body_too_large"});
  assert.equal(cancelled,true);
  assert.equal((await readRegistrationRequest(body("{}",{"content-length":"11"}),10)).status,413);
});
