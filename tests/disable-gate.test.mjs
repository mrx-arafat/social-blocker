import { test } from "node:test";
import assert from "node:assert/strict";
import {
  phraseMatches,
  reenableAt,
  shouldAutoReenable,
  disableRemainingMs
} from "../src/disable-gate.js";

test("phrase match is trimmed and case-insensitive", () => {
  assert.equal(phraseMatches("  I choose to be distracted ", "I choose to be distracted"), true);
  assert.equal(phraseMatches("i CHOOSE to be DISTRACTED", "I choose to be distracted"), true);
});

test("phrase match rejects partial or wrong input", () => {
  assert.equal(phraseMatches("I choose", "I choose to be distracted"), false);
  assert.equal(phraseMatches("", "I choose to be distracted"), false);
});

test("an empty target phrase can never be satisfied", () => {
  // Guards against an empty setting auto-confirming the gate.
  assert.equal(phraseMatches("", ""), false);
  assert.equal(phraseMatches("   ", "   "), false);
});

test("reenableAt returns a future timestamp, or 0 for indefinite", () => {
  assert.equal(reenableAt(1000, 30), 1000 + 30 * 60000);
  assert.equal(reenableAt(1000, 0), 0);
  assert.equal(reenableAt(1000, -5), 0);
});

test("auto re-enable fires only once the timeout has passed", () => {
  const at = 10 * 60000;
  assert.equal(shouldAutoReenable({ enabled: false, disabledUntil: at }, at - 1), false);
  assert.equal(shouldAutoReenable({ enabled: false, disabledUntil: at }, at), true);
  assert.equal(shouldAutoReenable({ enabled: false, disabledUntil: at }, at + 1), true);
});

test("auto re-enable ignores enabled or indefinitely-disabled state", () => {
  assert.equal(shouldAutoReenable({ enabled: true, disabledUntil: 5 }, 999), false);
  assert.equal(shouldAutoReenable({ enabled: false, disabledUntil: 0 }, 999), false);
});

test("remaining time clamps at zero and is zero when indefinite", () => {
  assert.equal(disableRemainingMs({ disabledUntil: 5000 }, 2000), 3000);
  assert.equal(disableRemainingMs({ disabledUntil: 5000 }, 9000), 0);
  assert.equal(disableRemainingMs({ disabledUntil: 0 }, 2000), 0);
});
