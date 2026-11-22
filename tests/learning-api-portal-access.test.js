import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const portal = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("Nour Al-Hidaya staff shortcut requires an explicit learning scope", () => {
  assert.match(
    portal,
    /if\(scopes\.some\(scope=>scope\.startsWith\("learning\."\)\)\)addModule\("⌂","Nour Al-Hidaya"/,
  );
});

test("the portal still requires an active staff record before rendering staff modules", () => {
  assert.match(portal, /staff&&staff\.active===true&&typeof staff\.role==="string"/);
});

test("the portal still rejects unverified staff email sessions", () => {
  assert.match(portal, /if\(!user\.emailVerified\)/);
});
