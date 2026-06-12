import { test } from "node:test";
import assert from "node:assert/strict";
import { pickMood, mascotLine, MASCOT_ICONS } from "../src/mascot.js";

const ctx = (over = {}) => ({
  event: null, onSocialSite: false, streak: 0,
  minutesToday: 0, domain: "", ...over
});

test("win events always heart-eyes, even on a social site", () => {
  assert.equal(pickMood(ctx({ event: "stepAway", onSocialSite: true })), "heartEyes");
  assert.equal(pickMood(ctx({ event: "milestone" })), "heartEyes");
});

test("on a social site -> angry", () => {
  assert.equal(pickMood(ctx({ onSocialSite: true })), "angry");
  assert.equal(pickMood(ctx({ onSocialSite: true, streak: 9 })), "angry");
});

test("streak of 3+ -> heart-eyes off-site", () => {
  assert.equal(pickMood(ctx({ streak: 3 })), "heartEyes");
  assert.equal(pickMood(ctx({ streak: 2 })), "cool");
});

test("default mood is cool", () => {
  assert.equal(pickMood(ctx()), "cool");
});

test("every mood maps to an icon path", () => {
  for (const mood of ["angry", "cool", "heartEyes"]) {
    assert.match(MASCOT_ICONS[mood], /^icons\/mascot\/.+\.svg$/);
  }
});

test("step-away line celebrates", () => {
  const m = mascotLine("heartEyes", ctx({ event: "stepAway" }), () => 0);
  assert.ok(m.length > 0);
  assert.match(m, /proud|reclaim|buddy|that's it|nice/i);
});

test("milestone line mentions the streak count", () => {
  const m = mascotLine("heartEyes", ctx({ event: "milestone", streak: 5 }), () => 0);
  assert.match(m, /5/);
});

test("angry lines escalate with minutes on site", () => {
  const mild = mascotLine("angry", ctx({ onSocialSite: true, minutesToday: 5, domain: "x.com" }), () => 0);
  const firm = mascotLine("angry", ctx({ onSocialSite: true, minutesToday: 45, domain: "x.com" }), () => 0);
  assert.ok(mild.length > 0);
  assert.match(firm, /45m/);
  assert.notEqual(mild, firm);
});

test("lines never empty, deterministic with seeded rng", () => {
  for (const mood of ["angry", "cool", "heartEyes"]) {
    const c = ctx({ onSocialSite: mood === "angry" });
    const a = mascotLine(mood, c, () => 0.5);
    assert.ok(a.length > 0, mood);
    assert.equal(a, mascotLine(mood, c, () => 0.5));
  }
});
