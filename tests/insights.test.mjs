import { test } from "node:test";
import assert from "node:assert/strict";
import { replayLine, peakHour, windowForHour, hasWindow } from "../src/insights.js";

test("replayLine: null when nothing to replay", () => {
  assert.equal(replayLine(null, 18), null);
  assert.equal(replayLine(undefined, 18), null);
  assert.equal(replayLine({ text: "" }, 18), null);
  assert.equal(replayLine({ text: "   " }, 18), null);
});

test("replayLine: mirrors intention with cost", () => {
  assert.equal(replayLine({ text: "just curious" }, 18), "Last time here: “just curious” — usually about 18m");
  assert.equal(replayLine({ text: "boredom" }, 23.4), "Last time here: “boredom” — usually about 23m");
});

test("replayLine: drops cost when median unknown", () => {
  assert.equal(replayLine({ text: "checking a message" }, 0), "Last time here: “checking a message”");
  assert.equal(replayLine({ text: "x" }, undefined), "Last time here: “x”");
});

test("peakHour: null until enough signal", () => {
  const hours = new Array(24).fill(0);
  hours[22] = 4; // total 4 < 5
  assert.equal(peakHour(hours), null);
});

test("peakHour: argmax once threshold met", () => {
  const hours = new Array(24).fill(0);
  hours[22] = 6; hours[9] = 2;
  assert.equal(peakHour(hours), 22);
});

test("peakHour: guards bad input", () => {
  assert.equal(peakHour(null), null);
  assert.equal(peakHour([1, 2, 3]), null);
  assert.equal(peakHour(new Array(24).fill(0)), null);
});

test("windowForHour: one-hour strict window every day", () => {
  assert.deepEqual(windowForHour(22), { days: [0, 1, 2, 3, 4, 5, 6], start: "22:00", end: "23:00", mode: "strict" });
});

test("windowForHour: 23:00 wraps end to 00:00", () => {
  assert.equal(windowForHour(23).end, "00:00");
  assert.equal(windowForHour(0).start, "00:00");
});

test("hasWindow: detects an equivalent existing window", () => {
  const win = windowForHour(22);
  assert.equal(hasWindow([], win), false);
  assert.equal(hasWindow([{ start: "22:00", end: "23:00", mode: "strict", days: [1] }], win), true);
  assert.equal(hasWindow([{ start: "21:00", end: "22:00", mode: "strict", days: [0] }], win), false);
});
