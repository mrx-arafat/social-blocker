import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeDay, buildCalendar } from "../src/calendar.js";

const day = (over = {}) => ({ attempts: 0, continued: 0, dismissed: 0, opens: {}, time: {}, opensByHour: new Array(24).fill(0), ...over });
const S = { budgetMinutes: 45, sites: [{ domain: "x.com", openLimit: 5, timeLimitMin: 30 }] };

test("gradeDay: hitting a wall is empty (level 0)", () => {
  assert.equal(gradeDay(day({ opens: { "x.com": 5 } }), S), 0); // open limit hit
  assert.equal(gradeDay(day({ time: { "x.com": 50 * 60 } }), { budgetMinutes: 45, sites: [] }), 0); // over budget
});

test("gradeDay: calm zero-open day is brightest (level 4)", () => {
  assert.equal(gradeDay(day(), S), 4);
  assert.equal(gradeDay(undefined, S), 4); // missing record = calm by definition
  assert.equal(gradeDay(null, S), 4);
});

test("gradeDay: lighter usage reads brighter", () => {
  assert.equal(gradeDay(day({ opens: { "x.com": 1 } }), S), 3); // 1-2
  assert.equal(gradeDay(day({ opens: { "x.com": 2 } }), S), 3);
  assert.equal(gradeDay(day({ opens: { "x.com": 4 } }), S), 2); // 3-5, still under limit 5
  assert.equal(gradeDay(day({ opens: { "a.com": 9 } }), { budgetMinutes: 0, sites: [] }), 1); // many opens, no limits
});

test("buildCalendar: 12 columns of 7 days by default", () => {
  const cal = buildCalendar({}, S, "2026-06-15");
  assert.equal(cal.weeks.length, 12);
  for (const col of cal.weeks) assert.equal(col.length, 7);
});

test("buildCalendar: rows are Sun..Sat and last column holds today", () => {
  const cal = buildCalendar({}, S, "2026-06-15"); // 2026-06-15 is a Monday
  // dow index 0 = Sunday for every cell in a row
  for (const col of cal.weeks) {
    assert.equal(new Date(col[0].key + "T12:00:00").getDay(), 0);
    assert.equal(new Date(col[6].key + "T12:00:00").getDay(), 6);
  }
  const lastCol = cal.weeks[11];
  assert.ok(lastCol.some((c) => c.key === "2026-06-15"));
});

test("buildCalendar: days after today are future, before first record are pretrack", () => {
  const stats = { "2026-06-10": day({ opens: { "x.com": 1 } }) };
  const cal = buildCalendar(stats, S, "2026-06-15");
  const flat = cal.weeks.flat();
  assert.equal(cal.trackingStart, "2026-06-10");
  assert.equal(flat.find((c) => c.key === "2026-06-16")?.state, "future");
  assert.equal(flat.find((c) => c.key === "2026-06-09")?.state, "pretrack");
  assert.equal(flat.find((c) => c.key === "2026-06-10")?.state, "tracked");
  assert.equal(flat.find((c) => c.key === "2026-06-10")?.level, 3); // 1 open = bright
});

test("buildCalendar: tracked day with no record is calm zero-open (level 4)", () => {
  const stats = { "2026-06-01": day({ opens: { "x.com": 1 } }) };
  const cal = buildCalendar(stats, S, "2026-06-15");
  const cell = cal.weeks.flat().find((c) => c.key === "2026-06-12");
  assert.equal(cell.state, "tracked");
  assert.equal(cell.level, 4);
  assert.equal(cell.opens, 0);
});

test("buildCalendar: cell carries opens + minutes for tooltip", () => {
  const stats = { "2026-06-13": day({ opens: { "x.com": 3 }, time: { "x.com": 12 * 60 } }) };
  const cal = buildCalendar(stats, S, "2026-06-15");
  const cell = cal.weeks.flat().find((c) => c.key === "2026-06-13");
  assert.equal(cell.opens, 3);
  assert.equal(cell.minutes, 12);
});
