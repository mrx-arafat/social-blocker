import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMode, strictActive } from "../src/schedule.js";

// 2026-06-10 is a Wednesday (day 3). 2026-06-09 is Tuesday (2).

test("schedule disabled -> normal", () => {
  assert.equal(
    resolveMode({ schedule: { enabled: false, defaultMode: "normal", windows: [] }, strictUntil: 0 }, new Date("2026-06-10T10:00")),
    "normal"
  );
});

test("strictUntil future forces strict even when schedule disabled", () => {
  assert.equal(
    resolveMode({ schedule: { enabled: false, defaultMode: "normal", windows: [] }, strictUntil: Date.parse("2026-06-10T11:00") }, new Date("2026-06-10T10:00")),
    "strict"
  );
});

test("strictUntil in past has no effect", () => {
  assert.equal(
    resolveMode({ schedule: { enabled: false, defaultMode: "normal", windows: [] }, strictUntil: Date.parse("2026-06-10T09:00") }, new Date("2026-06-10T10:00")),
    "normal"
  );
});

test("matching window wins, outside window -> defaultMode", () => {
  const s = { schedule: { enabled: true, defaultMode: "normal", windows: [{ days: [3], start: "09:00", end: "17:00", mode: "strict" }] }, strictUntil: 0 };
  assert.equal(resolveMode(s, new Date("2026-06-10T10:00")), "strict");
  assert.equal(resolveMode(s, new Date("2026-06-10T18:00")), "normal");
  assert.equal(resolveMode(s, new Date("2026-06-10T08:59")), "normal");
});

test("end is exclusive, start inclusive", () => {
  const s = { schedule: { enabled: true, defaultMode: "normal", windows: [{ days: [3], start: "09:00", end: "17:00", mode: "strict" }] }, strictUntil: 0 };
  assert.equal(resolveMode(s, new Date("2026-06-10T09:00")), "strict");
  assert.equal(resolveMode(s, new Date("2026-06-10T17:00")), "normal");
});

test("midnight-crossing window spans into next day", () => {
  const s = { schedule: { enabled: true, defaultMode: "normal", windows: [{ days: [2], start: "22:00", end: "06:00", mode: "off" }] }, strictUntil: 0 };
  assert.equal(resolveMode(s, new Date("2026-06-09T23:00")), "off");
  assert.equal(resolveMode(s, new Date("2026-06-10T05:00")), "off");
  assert.equal(resolveMode(s, new Date("2026-06-10T07:00")), "normal");
  assert.equal(resolveMode(s, new Date("2026-06-10T23:00")), "normal"); // Wed not in days
});

test("first matching window wins on overlap", () => {
  const s = { schedule: { enabled: true, defaultMode: "normal", windows: [
    { days: [3], start: "09:00", end: "12:00", mode: "off" },
    { days: [3], start: "09:00", end: "17:00", mode: "strict" }
  ] }, strictUntil: 0 };
  assert.equal(resolveMode(s, new Date("2026-06-10T10:00")), "off");
  assert.equal(resolveMode(s, new Date("2026-06-10T13:00")), "strict");
});

test("malformed windows ignored", () => {
  const s = { schedule: { enabled: true, defaultMode: "normal", windows: [
    { days: [], start: "09:00", end: "17:00", mode: "strict" },
    { days: [3], start: "9", end: "17:00", mode: "strict" },
    { days: [3], start: "09:00", end: "17:00", mode: "bogus" },
    null
  ] }, strictUntil: 0 };
  assert.equal(resolveMode(s, new Date("2026-06-10T10:00")), "normal");
});

test("defaultMode off outside windows", () => {
  const s = { schedule: { enabled: true, defaultMode: "off", windows: [] }, strictUntil: 0 };
  assert.equal(resolveMode(s, new Date("2026-06-10T10:00")), "off");
});

test("strictActive mirrors resolveMode", () => {
  const s = { schedule: { enabled: true, defaultMode: "normal", windows: [{ days: [3], start: "09:00", end: "17:00", mode: "strict" }] }, strictUntil: 0 };
  assert.equal(strictActive(s, new Date("2026-06-10T10:00")), true);
  assert.equal(strictActive(s, new Date("2026-06-10T18:00")), false);
});
