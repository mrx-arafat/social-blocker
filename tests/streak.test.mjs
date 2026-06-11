import { test } from "node:test";
import assert from "node:assert/strict";
import { dayQualifies, rollStreak, medianSessionMin, prevDate } from "../src/streak.js";

const day = (over = {}) => ({ attempts: 0, continued: 0, dismissed: 0, opens: {}, time: {}, opensByHour: new Array(24).fill(0), ...over });

test("empty/missing day qualifies (zero opens = calm)", () => {
  assert.equal(dayQualifies(day(), { budgetMinutes: 45, sites: [] }), true);
  assert.equal(dayQualifies(undefined, { budgetMinutes: 45, sites: [] }), true);
});

test("day under budget with no wall hit qualifies", () => {
  const d = day({ time: { "x.com": 20 * 60 }, opens: { "x.com": 2 } });
  assert.equal(dayQualifies(d, { budgetMinutes: 45, sites: [{ domain: "x.com", openLimit: 0, timeLimitMin: 0 }] }), true);
});

test("day over budget fails", () => {
  const d = day({ time: { "x.com": 50 * 60 } });
  assert.equal(dayQualifies(d, { budgetMinutes: 45, sites: [] }), false);
});

test("hitting an open limit fails the day", () => {
  const d = day({ opens: { "x.com": 5 } });
  assert.equal(dayQualifies(d, { budgetMinutes: 0, sites: [{ domain: "x.com", openLimit: 5, timeLimitMin: 0 }] }), false);
});

test("hitting a time limit fails the day", () => {
  const d = day({ time: { "x.com": 30 * 60 } });
  assert.equal(dayQualifies(d, { budgetMinutes: 0, sites: [{ domain: "x.com", openLimit: 0, timeLimitMin: 30 }] }), false);
});

test("budget 0 disables budget check", () => {
  const d = day({ time: { "x.com": 500 * 60 } });
  assert.equal(dayQualifies(d, { budgetMinutes: 0, sites: [] }), true);
});

test("prevDate steps one local day back", () => {
  assert.equal(prevDate("2026-06-11"), "2026-06-10");
  assert.equal(prevDate("2026-06-01"), "2026-05-31");
  assert.equal(prevDate("2026-01-01"), "2025-12-31");
});

test("rollStreak counts consecutive calm days, missed days calm", () => {
  const all = {
    "2026-06-08": day({ time: { "x.com": 10 * 60 } }),
    "2026-06-09": day({ time: { "x.com": 50 * 60 } }) // over budget -> reset
  };
  const s = rollStreak(all, { current: 0, best: 0, lastProcessedDate: "2026-06-07" },
    { budgetMinutes: 45, sites: [] }, "2026-06-11");
  // 06-08 calm -> 1, 06-09 fail -> 0, 06-10 missing (zero opens) -> 1
  assert.equal(s.current, 1);
  assert.equal(s.best, 1);
  assert.equal(s.lastProcessedDate, "2026-06-10");
});

test("rollStreak preserves best across resets", () => {
  const all = { "2026-06-10": day({ time: { "x.com": 99 * 60 } }) };
  const s = rollStreak(all, { current: 4, best: 4, lastProcessedDate: "2026-06-09" },
    { budgetMinutes: 45, sites: [] }, "2026-06-11");
  assert.equal(s.current, 0);
  assert.equal(s.best, 4);
});

test("rollStreak idempotent when up to date", () => {
  const s0 = { current: 2, best: 4, lastProcessedDate: "2026-06-10" };
  const s = rollStreak({}, s0, { budgetMinutes: 45, sites: [] }, "2026-06-11");
  assert.deepEqual(s, s0);
});

test("rollStreak first run initializes without judging history", () => {
  const s = rollStreak({}, { current: 0, best: 0, lastProcessedDate: null },
    { budgetMinutes: 45, sites: [] }, "2026-06-11");
  assert.equal(s.current, 0);
  assert.equal(s.lastProcessedDate, "2026-06-10");
});

test("medianSessionMin falls back to 15 with thin history", () => {
  assert.equal(medianSessionMin({}, "x.com"), 15);
  const thin = { a: day({ time: { "x.com": 600 }, opens: { "x.com": 1 } }) };
  assert.equal(medianSessionMin(thin, "x.com"), 15);
});

test("medianSessionMin computes median minutes per open", () => {
  const all = {
    a: day({ time: { "x.com": 30 * 60 }, opens: { "x.com": 3 } }), // 10
    b: day({ time: { "x.com": 40 * 60 }, opens: { "x.com": 2 } }), // 20
    c: day({ time: { "x.com": 12 * 60 }, opens: { "x.com": 1 } }), // 12
    d: day({ time: { "x.com": 28 * 60 }, opens: { "x.com": 2 } }), // 14
    e: day({ time: { "x.com": 16 * 60 }, opens: { "x.com": 1 } })  // 16
  };
  assert.equal(medianSessionMin(all, "x.com"), 14);
});
