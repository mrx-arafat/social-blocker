import { test } from "node:test";
import assert from "node:assert/strict";
import { pickMood, mascotLine, MASCOT_ICONS } from "../src/mascot.js";

const ctx = (over = {}) => ({
  event: null, offDuty: false, onSocialSite: false, streak: 0,
  minutesToday: 0, domain: "", ...over
});

const ALL_MOODS = ["angry", "cool", "heartEyes", "party", "confused", "working", "playing", "mad"];

// ---- pickMood: event priority ------------------------------------------------

test("milestones throw a party", () => {
  assert.equal(pickMood(ctx({ event: "milestone", streak: 5 })), "party");
});

test("step-away wins are heart-eyes, even on a social site", () => {
  assert.equal(pickMood(ctx({ event: "stepAway", onSocialSite: true })), "heartEyes");
});

test("deciding moments are confused, even on a social site", () => {
  assert.equal(pickMood(ctx({ event: "deciding", onSocialSite: true })), "confused");
});

// ---- pickMood: context -------------------------------------------------------

test("off duty (protection disabled) -> playing, even on a social site", () => {
  assert.equal(pickMood(ctx({ offDuty: true })), "playing");
  assert.equal(pickMood(ctx({ offDuty: true, onSocialSite: true })), "playing");
});

test("a long social session turns the koala mad", () => {
  assert.equal(pickMood(ctx({ onSocialSite: true, minutesToday: 20 })), "mad");
  assert.equal(pickMood(ctx({ onSocialSite: true, minutesToday: 90 })), "mad");
});

test("a short social visit is only angry", () => {
  assert.equal(pickMood(ctx({ onSocialSite: true, minutesToday: 5 })), "angry");
  assert.equal(pickMood(ctx({ onSocialSite: true })), "angry");
});

test("off-site streak tiers: cool < working < heart-eyes", () => {
  assert.equal(pickMood(ctx({ streak: 0 })), "cool");
  assert.equal(pickMood(ctx({ streak: 2 })), "cool");
  assert.equal(pickMood(ctx({ streak: 3 })), "working");
  assert.equal(pickMood(ctx({ streak: 6 })), "working");
  assert.equal(pickMood(ctx({ streak: 7 })), "heartEyes");
});

test("default mood is cool", () => {
  assert.equal(pickMood(ctx()), "cool");
});

// ---- icons -------------------------------------------------------------------

test("every mood maps to an icon path", () => {
  for (const mood of ALL_MOODS) {
    assert.match(MASCOT_ICONS[mood], /^icons\/mascot\/.+\.svg$/);
  }
});

// ---- mascotLine --------------------------------------------------------------

test("step-away line celebrates", () => {
  const m = mascotLine("heartEyes", ctx({ event: "stepAway" }), () => 0);
  assert.match(m, /proud|reclaim|buddy|that's it|nice/i);
});

test("milestone line mentions the streak count", () => {
  const m = mascotLine("party", ctx({ event: "milestone", streak: 5 }), () => 0);
  assert.match(m, /5/);
});

test("mad line names the time spent on the site", () => {
  const m = mascotLine("mad", ctx({ onSocialSite: true, minutesToday: 45, domain: "x.com" }), () => 0);
  assert.match(m, /45m/);
  assert.match(m, /x\.com/);
});

test("working and playing lines are non-empty and deterministic", () => {
  for (const mood of ["working", "playing"]) {
    const c = ctx({ offDuty: mood === "playing" });
    assert.ok(mascotLine(mood, c, () => 0.3).length > 0, mood);
    assert.equal(mascotLine(mood, c, () => 0.3), mascotLine(mood, c, () => 0.3));
  }
});

test("confused lines exist and are deterministic", () => {
  const c = ctx({ event: "deciding", onSocialSite: true, domain: "x.com" });
  const m = mascotLine("confused", c, () => 0);
  assert.ok(m.length > 0);
  assert.equal(m, mascotLine("confused", c, () => 0));
});

test("every mood yields a non-empty, deterministic line", () => {
  for (const mood of ALL_MOODS) {
    const c = ctx({ onSocialSite: mood === "angry" || mood === "mad", minutesToday: mood === "mad" ? 30 : 0, domain: "x.com" });
    const a = mascotLine(mood, c, () => 0.5);
    assert.ok(a.length > 0, mood);
    assert.equal(a, mascotLine(mood, c, () => 0.5), mood);
  }
});
