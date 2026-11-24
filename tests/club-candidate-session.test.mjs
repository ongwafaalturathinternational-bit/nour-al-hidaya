import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../club-khuddam-espace.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
  .map(([, , source]) => source)
  .filter(source => source.trim());

test("l'espace candidat contient un script JavaScript syntaxiquement valide", () => {
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0]));
});

test("un changement de session invalide les chargements asynchrones du dossier candidat", () => {
  assert.match(html, /let currentUser = null, authGeneration = 0/);
  assert.match(html, /function isCurrentSession\(user,generation\)/);
  assert.match(html, /authGeneration \+= 1/);
  assert.match(html, /WATFirebase\.auth\.currentUser\?\.uid !== user\.uid/);
  const loader = html.slice(html.indexOf("async function loadAccount"), html.indexOf('$("loginForm")'));
  assert.ok(loader.indexOf("if(WATFirebase.auth.currentUser?.uid !== user.uid)return;") < loader.indexOf("const generation = ++authGeneration;"));
  assert.ok((html.match(/if\(!isCurrentSession\(user,generation\)\)return;/g) || []).length >= 2);
  assert.match(html, /\$\("details"\)\.textContent = ""/);
});

test("le dossier candidat n'est lu qu'après renouvellement du jeton et revalidation de session", () => {
  const tokenRefresh = html.indexOf("await user.getIdToken(true)");
  const documentRead = html.indexOf('WATFirebase.db.collection("volunteerApplications").doc(user.uid)');
  assert.ok(tokenRefresh >= 0 && documentRead > tokenRefresh);
  assert.ok(html.indexOf("if(!isCurrentSession(user,generation))return;", tokenRefresh) < documentRead);
  assert.ok(html.indexOf("if(!isCurrentSession(user,generation))return;", documentRead) > documentRead);
});

test("le formulaire public efface les mots de passe lors de chaque transition de session", () => {
  const page = fs.readFileSync(new URL("../club-khuddam-inscription.html", import.meta.url), "utf8");
  const update = page.slice(page.indexOf("async function updateAccount"), page.indexOf("async function checkExisting"));
  assert.match(update, /\$\("registerPassword"\)\.value=""/);
  assert.match(update, /\$\("loginPassword"\)\.value=""/);
  assert.ok(update.indexOf('authGeneration') < update.indexOf('registerPassword'));
});

test("la validation du courriel de réinitialisation accepte les adresses normales", () => {
  const reset = html.slice(html.indexOf('$("forgot")'), html.indexOf('$("resend")'));
  assert.ok(reset.includes('if(!/^\\S+@\\S+\\.\\S+$/.test(email))'));
  assert.ok(!reset.includes('\\\\S'));
});

test("l'espace candidat efface le mot de passe et protège les actions asynchrones", () => {
  const portal = fs.readFileSync(new URL("../club-khuddam-espace.html", import.meta.url), "utf8");
  assert.match(portal, /\$\("password"\)\.value = ""/);
  const login = portal.slice(portal.indexOf('$("loginForm")'), portal.indexOf('$("forgot")'));
  assert.match(login, /generation=authGeneration/);
  assert.match(login, /finally\{\$\("password"\)\.value="";/);
  const resend = portal.slice(portal.indexOf('$("resend")'), portal.indexOf('$("refresh")'));
  assert.match(resend, /isCurrentSession\(user,generation\)/);
  const reset = portal.slice(portal.indexOf('$("forgot")'), portal.indexOf('$("resend")'));
  assert.match(reset, /generation===authGeneration/);
});


test("les formulaires publics effacent les mots de passe et ignorent les erreurs de session obsolètes", () => {
  const page = fs.readFileSync(new URL("../club-khuddam-inscription.html", import.meta.url), "utf8");
  const registerStart = page.indexOf('$("registerForm").addEventListener("submit"');
  const loginStart = page.indexOf('$("loginForm").addEventListener("submit"');
  const resendStart = page.indexOf('$("resend").addEventListener("click"');
  const register = page.slice(registerStart, loginStart);
  const login = page.slice(loginStart, resendStart);
  assert.ok(registerStart >= 0 && loginStart > registerStart && resendStart > loginStart);
  assert.match(register, /generation=authGeneration/);
  assert.match(register, /generation!==authGeneration\|\|WATFirebase\.auth\.currentUser/);
  assert.match(register, /finally\{\$\("registerPassword"\)\.value=""\}/);
  assert.match(login, /generation=authGeneration/);
  assert.match(login, /generation!==authGeneration\|\|WATFirebase\.auth\.currentUser/);
  assert.match(login, /finally\{\$\("loginPassword"\)\.value=""\}/);
});

test("le formulaire Club rend la transition invitée et attend le jeton avant de lire le dossier", async () => {
  const page = fs.readFileSync(new URL("../club-khuddam-inscription.html", import.meta.url), "utf8");
  const start = page.indexOf("async function updateAccount");
  const source = page.slice(start, page.indexOf("async function checkExisting", start));
  const nodes = new Map();
  const order = [];
  const auth = { currentUser: null };
  const context = vm.createContext({
    authGeneration: 0,
    currentUser: null,
    WATFirebase: { auth, persistenceReady: Promise.resolve() },
    clearPrivateView() {},
    $(id) {
      if (!nodes.has(id)) nodes.set(id, { hidden: true });
      return nodes.get(id);
    },
    checkExisting() { order.push("lecture"); },
    say: assert.fail,
  });
  const guard = page.slice(page.indexOf("function isCurrentSession"), page.indexOf("function clearPrivateView"));
  const update = vm.runInContext(guard + source + "\nupdateAccount", context);
  await update(null);
  assert.match(nodes.get("accountState").textContent, /connectez-vous/);
  assert.deepEqual(order, []);
  const user = {
    uid: "candidate",
    emailVerified: true,
    async getIdToken(force) {
      assert.equal(force, true);
      order.push("jeton");
    },
  };
  auth.currentUser = user;
  await update(user);
  assert.deepEqual(order, ["jeton", "lecture"]);
  assert.equal(nodes.get("applicationPanel").hidden, false);
});

test("le renvoi de vérification Club ignore les demandes simultanées d’un même compte", async () => {
  const html = fs.readFileSync(new URL("../club-khuddam-inscription.html", import.meta.url), "utf8");
  const start = html.indexOf('$("resend").addEventListener');
  const end = html.indexOf('$("refresh").addEventListener', start);
  assert.ok(start >= 0 && end > start);
  let click, resolve, sends = 0;
  const button = { disabled: false, addEventListener: (_, callback) => { click = callback; } };
  const user = { emailVerified: false, sendEmailVerification() {
    sends++;
    return new Promise(done => { resolve = done; });
  } };
  const messages = [];
  vm.runInNewContext(html.slice(start, end), {
    currentUser: user, authGeneration: 1, isCurrentSession: () => true,
    $: () => button, say: message => messages.push(message),
  });
  const first = click();
  assert.equal(button.disabled, true);
  await click();
  assert.equal(sends, 1);
  resolve();
  await first;
  assert.equal(button.disabled, false);
  assert.equal(messages.length, 1);
});
