// declarativeNetRequest session-rule construction. Pure — background applies
// the result via updateSessionRules. One redirect rule per actively guarded
// site; a live pass or off-mode removes the rule (browser lets traffic flow).

export function domainRegex(domain) {
  const esc = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `^https?://([^/]*\\.)?${esc}(/.*)?$`;
}

// passes: {domain: expiryMs}. extOrigin: chrome.runtime.getURL("").
// The original URL rides as the LAST query param (it contains & and ?);
// pause.js parses it raw rather than via URLSearchParams.
export function buildRules(settings, mode, passes, extOrigin, now = Date.now()) {
  if (!settings.enabled || mode === "off") return [];
  const rules = [];
  let id = 0;
  for (const site of settings.sites || []) {
    id += 1; // ids stay aligned to site order even when entries are skipped
    if (!site.enabled) continue;
    if ((passes[site.domain] || 0) > now) continue;
    rules.push({
      id,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          regexSubstitution: `${extOrigin}pause.html?domain=${encodeURIComponent(site.domain)}&target=\\0`
        }
      },
      condition: {
        regexFilter: domainRegex(site.domain),
        resourceTypes: ["main_frame"]
      }
    });
  }
  return rules;
}
