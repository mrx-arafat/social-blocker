import { test } from "node:test";
import assert from "node:assert/strict";
import { pickMessage } from "../src/messages.js";

const ctx = (over = {}) => ({
  domain: "x.com", visitsToday: 0, minutesToday: 0, minutesWeek: 0,
  streak: 0, reclaimedWeekMin: 0, stepAwaysWeek: 0,
  worstHour: null, nowHour: 10, ...over
});

test("streak risk beats everything", () => {
  const m = pickMessage(ctx({ streak: 5, visitsToday: 4, minutesWeek: 300, worstHour: 10 }));
  assert.match(m, /streak/i);
  assert.match(m, /5/);
});

test("trigger hour when it matches now", () => {
  const m = pickMessage(ctx({ worstHour: 10, nowHour: 10, visitsToday: 4 }));
  assert.match(m, /weakest hour/i);
});

test("trigger hour ignored when it does not match now", () => {
  const m = pickMessage(ctx({ worstHour: 21, nowHour: 10, visitsToday: 4, minutesToday: 38 }));
  assert.doesNotMatch(m, /weakest hour/i);
});

test("third-or-later visit message with minutes", () => {
  const m = pickMessage(ctx({ visitsToday: 3, minutesToday: 38 }));
  assert.match(m, /3rd visit/i);
  assert.match(m, /38m/);
});

test("weekly cost needs > 2h", () => {
  assert.match(pickMessage(ctx({ minutesWeek: 200 })), /this week/i);
  assert.doesNotMatch(pickMessage(ctx({ minutesWeek: 100 })), /this week/i);
});

test("reclaimed line when stepping away is a habit", () => {
  const m = pickMessage(ctx({ stepAwaysWeek: 4, reclaimedWeekMin: 60 }));
  assert.match(m, /stepped away 4 times/i);
});

test("no data -> generic line, never empty, deterministic with rng", () => {
  const m = pickMessage(ctx(), () => 0);
  assert.ok(m.length > 0);
  assert.equal(m, pickMessage(ctx(), () => 0));
});
