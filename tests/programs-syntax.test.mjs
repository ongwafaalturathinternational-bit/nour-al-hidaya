import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

test("le module des programmes contient un JavaScript valide", () => {
  const html = readFileSync(new URL("../programmes.html", import.meta.url), "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .map(([, , source]) => source)
    .filter(source => source.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((source, index) => assert.doesNotThrow(() => new vm.Script(source), "script programmes n°" + (index + 1)));
});

test("les fiches programmes relient projets et activités avec des droits indépendants", () => {
  const html = readFileSync(new URL("../programmes.html", import.meta.url), "utf8");
  assert.match(html, /let user=null,canManage=false,canProjectsRead=false,canActivitiesRead=false/);
  assert.match(html, /canActivitiesRead=canProjectsRead&&\(scopes\.includes\("activities\.read"\)\|\|scopes\.includes\("activities\.manage"\)\)/);
  assert.match(html, /if\(canProjectsRead\)tasks\.push\(WATFirebase\.db\.collection\("projects"\)\.get\(\)\)/);
  assert.match(html, /if\(canActivitiesRead\)tasks\.push\(WATFirebase\.db\.collection\("activities"\)\.get\(\)\)/);
  assert.match(html, /function linkedProjects\(p\)/);
  assert.match(html, /function linkedActivities\(p\)/);
  assert.match(html, /function showProgramDetails\(p\)/);
  assert.match(html, /programDialog/);
  assert.match(html, /Projets rattachés/);
  assert.match(html, /Activités des projets/);
});

test("le registre utilise les identifiants Firestore pour relier programmes, projets et activités", async () => {
  const html = readFileSync(new URL("../programmes.html", import.meta.url), "utf8");
  const load = html.match(/^async function load\(generation=authGeneration\).*$/m)?.[0];
  const links = html.match(/^function linkedProjects\(p\).*$/m)?.[0];
  assert.ok(load && links);
  const records = {
    programs: ["programme", { id: "ancien-programme" }],
    projects: ["projet", { id: "ancien-projet", programId: "programme" }],
    activities: ["activité", { id: "ancienne-activité", projectId: "projet" }],
  };
  const results = [];
  const user = { uid: "staff" };
  const WATFirebase = {
    auth: { currentUser: user },
    db: { collection: name => ({
      get: async () => {
        const [id, data] = records[name];
        return { docs: [{ id, data: () => data }] };
      },
    }) },
  };
  const read = vm.runInNewContext(`
    let authGeneration = 1, canProjectsRead = true, canActivitiesRead = true;
    let programs, projects, activities;
    ${links}
    ${load}
    function render() {
      const program = programs[0];
      results.push(program.id, linkedProjects(program)[0]?.id, linkedActivities(program)[0]?.id);
    }
    load
  `, { user, WATFirebase, results });
  await read();
  assert.deepEqual(results, ["programme", "projet", "activité"]);
});
