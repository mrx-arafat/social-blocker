// Shared storage layer + defaults for Social Blocker.
// Imported as an ES module by background.js and every extension page.

export const SETTINGS_KEY = "sb_settings";
export const STATS_KEY = "sb_stats";

// A "site" entry: domain + per-site limits. Feed toggles live under `feeds`.
export const DEFAULTS = {
  enabled: true,
  // Length of the forced breath, in seconds.
  pauseSeconds: 8,
  // After a granted pass, how long before the same domain prompts again (minutes).
  passDurationMin: 5,
  // Ask for an intention before continuing.
  requireIntention: true,
  // Offer an alternative activity instead of opening.
  showAlternatives: true,
  // Reminders.
  remindersEnabled: false,
  reminderEveryMin: 120,
  reminderText: "How conscious has your phone use been today?",

  // Sites to guard. enabled=false keeps the entry but stops guarding it.
  // openLimit / timeLimitMin: 0 means unlimited.
  sites: [
    { domain: "instagram.com", enabled: true, openLimit: 0, timeLimitMin: 0 },
    { domain: "facebook.com", enabled: true, openLimit: 0, timeLimitMin: 0 },
    { domain: "tiktok.com", enabled: true, openLimit: 0, timeLimitMin: 0 },
    { domain: "twitter.com", enabled: true, openLimit: 0, timeLimitMin: 0 },
    { domain: "x.com", enabled: true, openLimit: 0, timeLimitMin: 0 },
    { domain: "youtube.com", enabled: true, openLimit: 0, timeLimitMin: 0 },
    { domain: "reddit.com", enabled: true, openLimit: 0, timeLimitMin: 0 },
    { domain: "snapchat.com", enabled: false, openLimit: 0, timeLimitMin: 0 },
    { domain: "linkedin.com", enabled: false, openLimit: 0, timeLimitMin: 0 }
  ],

  // Feed / infinite-scroll blocking, applied by the content script.
  feeds: {
    instagramReels: true,
    youtubeShorts: true,
    facebookReels: true,
    xForYou: false
  },

  intentions: [
    "Checking a message",
    "Posting something",
    "Looking for something specific",
    "Just curious",
    "Boredom"
  ],
  alternatives: [
    "Take a short walk",
    "Drink a glass of water",
    "Read a few pages",
    "Do 10 push-ups",
    "Message a friend who matters",
    "Just breathe for a minute"
  ]
};

export function todayKey(d = new Date()) {
  // Local-date bucket: YYYY-MM-DD.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getSettings() {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = got[SETTINGS_KEY] || {};
  // Shallow-merge so new default keys appear after upgrades.
  const merged = { ...DEFAULTS, ...stored };
  merged.feeds = { ...DEFAULTS.feeds, ...(stored.feeds || {}) };
  if (!Array.isArray(merged.sites)) merged.sites = DEFAULTS.sites;
  if (!Array.isArray(merged.intentions)) merged.intentions = DEFAULTS.intentions;
  if (!Array.isArray(merged.alternatives)) merged.alternatives = DEFAULTS.alternatives;
  return merged;
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getAllStats() {
  const got = await chrome.storage.local.get(STATS_KEY);
  return got[STATS_KEY] || {};
}

export async function getDayStats(key = todayKey()) {
  const all = await getAllStats();
  return all[key] || emptyDay();
}

export function emptyDay() {
  return {
    attempts: 0, // times a guarded site was intercepted
    continued: 0, // times the user chose to continue
    dismissed: 0, // times the user chose to leave
    opens: {}, // domain -> open count (passes granted)
    time: {} // domain -> seconds spent
  };
}

// Atomically mutate today's stats via a reducer.
export async function mutateDay(fn) {
  const all = await getAllStats();
  const key = todayKey();
  const day = all[key] || emptyDay();
  fn(day);
  all[key] = day;
  // Keep ~60 days of history.
  const keys = Object.keys(all).sort();
  while (keys.length > 60) delete all[keys.shift()];
  await chrome.storage.local.set({ [STATS_KEY]: all });
  return day;
}

// host matches "instagram.com" if host === domain or ends with ".domain".
export function hostMatchesDomain(host, domain) {
  host = host.toLowerCase().replace(/^www\./, "");
  domain = domain.toLowerCase().replace(/^www\./, "");
  return host === domain || host.endsWith("." + domain);
}

// Find the guarded site config matching a host, or null.
export function findSite(settings, host) {
  if (!host) return null;
  return (
    settings.sites.find(
      (s) => s.enabled && hostMatchesDomain(host, s.domain)
    ) || null
  );
}

export function normalizeDomain(input) {
  let s = (input || "").trim().toLowerCase();
  if (!s) return "";
  // Strip scheme, path, www.
  s = s.replace(/^[a-z]+:\/\//, "");
  s = s.split("/")[0];
  s = s.replace(/^www\./, "");
  return s;
}
