import { test } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./mock-chrome.mjs";
installChromeMock();
const { getTodayStats, emptyDay, mutateDay, getSettings } = await import("../src/storage.js");

test("emptyDay has opensByHour buckets", () => {
  const d = emptyDay();
  assert.equal(d.opensByHour.length, 24);
});

test("getTodayStats returns today's mutated stats", async () => {
  await mutateDay((d) => { d.attempts = 3; d.opensByHour[9] = 2; });
  const t = await getTodayStats();
  assert.equal(t.attempts, 3);
  assert.equal(t.opensByHour[9], 2);
});

test("day records without opensByHour get backfilled on read", async () => {
  const t = await getTodayStats();
  assert.ok(Array.isArray(t.opensByHour));
  assert.equal(t.opensByHour.length, 24);
});

test("getSettings merges v2 defaults", async () => {
  const s = await getSettings();
  assert.equal(s.schedule.enabled, false);
  assert.equal(s.schedule.defaultMode, "normal");
  assert.deepEqual(s.schedule.windows, []);
  assert.equal(typeof s.strictPhrase, "string");
  assert.equal(s.strictUntil, 0);
  assert.equal(s.streak.current, 0);
  assert.equal(s.budgetMinutes, 45);
  assert.equal(s.reclaimedMin, 0);
  assert.equal(s.recap.enabled, true);
});
