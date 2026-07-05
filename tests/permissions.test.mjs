import test from "node:test";
import assert from "node:assert/strict";

import { originPatternFor, isDefaultDomain } from "../src/permissions.js";

test("originPatternFor covers apex and subdomains", () => {
  assert.equal(originPatternFor("instagram.com"), "*://*.instagram.com/*");
  assert.equal(originPatternFor("news.ycombinator.com"), "*://*.news.ycombinator.com/*");
});

test("isDefaultDomain true for manifest-declared defaults", () => {
  assert.equal(isDefaultDomain("instagram.com"), true);
  assert.equal(isDefaultDomain("linkedin.com"), true);
});

test("isDefaultDomain false for user-added domains", () => {
  assert.equal(isDefaultDomain("news.ycombinator.com"), false);
  assert.equal(isDefaultDomain(""), false);
});
