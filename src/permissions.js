// Optional host-permission handling for user-added guarded sites.
// Default sites ship as required host_permissions in the manifest; anything
// the user adds later needs a runtime grant (optional_host_permissions).
// A denied grant is not fatal: the webNavigation fallback in background.js
// still guards the site — only the flash-free DNR redirect and the mascot
// overlay need host access.

import { DEFAULTS } from "./storage.js";

// Match-pattern host wildcard covers the apex domain and all subdomains.
export function originPatternFor(domain) {
  return `*://*.${domain}/*`;
}

export function isDefaultDomain(domain) {
  return DEFAULTS.sites.some((s) => s.domain === domain);
}

// Must be called from a user gesture (e.g. a submit handler, before any await).
export async function requestSiteAccess(domain) {
  if (isDefaultDomain(domain)) return true;
  try {
    return await chrome.permissions.request({
      origins: [originPatternFor(domain)]
    });
  } catch {
    return false;
  }
}

// Manifest-required origins can't be removed; skip defaults outright.
export async function releaseSiteAccess(domain) {
  if (isDefaultDomain(domain)) return;
  try {
    await chrome.permissions.remove({ origins: [originPatternFor(domain)] });
  } catch {
    /* origin was never granted — nothing to release */
  }
}
