import { test } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./mock-chrome.mjs";
installChromeMock();
const { getTodayStats, emptyDay, mutateDay, getSettings, getLastIntention, setLastIntention, normalizeDomain } = await import("../src/storage.js");

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
  assert.equal(s.theme, "light");
});

test("last intention round-trips per domain", async () => {
  assert.equal(await getLastIntention("x.com"), null);
  await setLastIntention("x.com", "just curious", 1000);
  assert.deepEqual(await getLastIntention("x.com"), { text: "just curious", ts: 1000 });
});

test("setLastIntention trims and ignores empty/blank", async () => {
  await setLastIntention("reddit.com", "  boredom  ", 2000);
  assert.deepEqual(await getLastIntention("reddit.com"), { text: "boredom", ts: 2000 });
  await setLastIntention("reddit.com", "   ", 3000); // blank — no overwrite
  assert.equal((await getLastIntention("reddit.com")).text, "boredom");
});

test("setLastIntention caps the map and evicts the oldest", async () => {
  for (let i = 0; i < 60; i++) await setLastIntention(`d${i}.com`, "x", i + 1);
  const all = (await chrome.storage.local.get("sb_lastintent")).sb_lastintent;
  assert.equal(Object.keys(all).length, 50);
  assert.equal(all["d0.com"], undefined); // oldest evicted
  assert.ok(all["d59.com"]); // newest kept
});

test("normalizeDomain strips scheme/path/port/www and keeps valid hosts", () => {
  assert.equal(normalizeDomain("https://www.Instagram.com/reels/1?x=2"), "instagram.com");
  assert.equal(normalizeDomain("x.com:443"), "x.com");
  assert.equal(normalizeDomain("sub.example.co.uk"), "sub.example.co.uk");
});

test("normalizeDomain rejects junk and single-label hosts", () => {
  for (const bad of ["", "   ", "*", "a b", ".", "com", "<img src=x onerror=alert(1)>", "javascript:alert(1)"]) {
    assert.equal(normalizeDomain(bad), "", `expected "" for ${JSON.stringify(bad)}`);
  }
});
