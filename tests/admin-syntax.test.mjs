import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("le module d’administration contient un JavaScript valide", () => {
  const html = readFileSync(new URL("../administration.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), "script administration n°" + (index + 1)));
});

test("les registres Annuaire et Club conservent les clés des documents Firestore", async () => {
  for (const [file, loader, state, collections] of [
    ["administration.html", "loadMembers", "members", ["members"]],
    ["club-khuddam.html", "load", "records, applications", ["volunteers", "volunteerApplications"]],
  ]) {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const source = html.split(/\r?\n/).find(line => line.startsWith("async function " + loader + "(generation="));
    assert.ok(source, file);
    const collectionsRead = [];
    const user = { uid: "staff" };
    const db = { collection(name) {
      collectionsRead.push(name);
      const query = { get: async () => ({
        docs: [{ id: name + "-canonical", data: () => ({ id: "historical-id" }) }],
      }), where: () => query };
      return query;
    } };
    const run = vm.runInNewContext(`
      let ${state};
      const authGeneration = 1, currentUser = user, canRead = true;
      const WATFirebase = { auth: { currentUser }, db };
      const isCurrentStaffSession = () => true;
      function render() {}
      function renderApplications() {}
      ${source}
      async () => { await ${loader}(); return [${state}].map(rows => rows[0].id); }
    `, { user, db });
    assert.deepEqual(Array.from(await run()), collections.map(name => name + "-canonical"));
    assert.deepEqual(collectionsRead, collections);
  }
});

test("l’Annuaire bloque une seconde modification de la même fiche pendant l’écriture", async () => {
  const html = readFileSync(new URL("../administration.html", import.meta.url), "utf8");
  const start = html.indexOf("const pendingMemberStatuses");
  const end = html.indexOf("function clearPrivateView", start);
  assert.ok(start >= 0 && end > start);
  const pending = [];
  const db = { collection: () => ({ doc: id => ({ update: () => new Promise(resolve => pending.push({ id, resolve })) }) }) };
  const change = vm.runInNewContext(html.slice(start, end) + "\nchangeStatus", {
    authGeneration: 1, currentUser: { uid: "staff" }, canManage: true, isCurrentStaffSession: () => true,
    WATFirebase: { db }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 0 } } },
    loadMembers: async () => {}, say() {},
  });
  const first = change("member-a", "inactif");
  await change("member-a", "inactif");
  const other = change("member-b", "actif");
  assert.deepEqual(pending.map(entry => entry.id), ["member-a", "member-b"]);
  pending.forEach(entry => entry.resolve());
  await Promise.all([first, other]);
  const retry = change("member-a", "actif");
  assert.equal(pending.length, 3);
  pending[2].resolve();
  await retry;
});
