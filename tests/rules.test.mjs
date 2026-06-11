import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRules, domainRegex } from "../src/rules.js";

test("domainRegex matches host + subdomains, escapes dots", () => {
  const re = new RegExp(domainRegex("x.com"));
  assert.ok(re.test("https://x.com/home"));
  assert.ok(re.test("http://www.x.com"));
  assert.ok(re.test("https://x.com"));
  assert.ok(!re.test("https://xxcom.evil.com/"));
  assert.ok(!re.test("https://x-com.evil.com/"));
});

test("buildRules: one redirect rule per active site, skips passes and disabled", () => {
  const settings = { enabled: true, sites: [
    { domain: "x.com", enabled: true },
    { domain: "reddit.com", enabled: false },
    { domain: "instagram.com", enabled: true }
  ]};
  const now = 1000;
  const rules = buildRules(settings, "normal", { "instagram.com": now + 9999 }, "chrome-extension://abc/", now);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].id, 1);
  assert.equal(rules[0].action.type, "redirect");
  assert.ok(rules[0].action.redirect.regexSubstitution.endsWith("&target=\\0"));
  assert.ok(rules[0].action.redirect.regexSubstitution.startsWith("chrome-extension://abc/pause.html?domain=x.com"));
  assert.deepEqual(rules[0].condition.resourceTypes, ["main_frame"]);
});

test("rule ids stay aligned to site order when entries are skipped", () => {
  const settings = { enabled: true, sites: [
    { domain: "a.com", enabled: false },
    { domain: "b.com", enabled: true }
  ]};
  const rules = buildRules(settings, "normal", {}, "ext://", 0);
  assert.equal(rules.length, 1);
  assert.equal(rules[0].id, 2);
});

test("expired pass does not suppress the rule", () => {
  const settings = { enabled: true, sites: [{ domain: "x.com", enabled: true }] };
  const rules = buildRules(settings, "normal", { "x.com": 500 }, "ext://", 1000);
  assert.equal(rules.length, 1);
});

test("mode off or master disabled -> no rules", () => {
  const s = { enabled: true, sites: [{ domain: "x.com", enabled: true }] };
  assert.equal(buildRules(s, "off", {}, "ext://", 0).length, 0);
  assert.equal(buildRules({ ...s, enabled: false }, "normal", {}, "ext://", 0).length, 0);
});

test("strict mode still blocks (rules present)", () => {
  const s = { enabled: true, sites: [{ domain: "x.com", enabled: true }] };
  assert.equal(buildRules(s, "strict", {}, "ext://", 0).length, 1);
});
