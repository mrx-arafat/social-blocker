// Shared storage layer + defaults for Social Blocker.
// Imported as an ES module by background.js and every extension page.

export const SETTINGS_KEY = "sb_settings";
export const STATS_KEY = "sb_stats";
export const LASTINTENT_KEY = "sb_lastintent"; // domain -> { text, ts }

// A "site" entry: domain + per-site limits. Feed toggles live under `feeds`.
export const DEFAULTS = {
  enabled: true,
  // Turning the blocker off is the one impulsive escape hatch, so it's gated:
  // the user must hand-type disablePhrase (paste blocked), and "off" only lasts
  // disableMinutes before it heals itself. disabledUntil is the epoch-ms target
  // for that auto-re-enable (0 = currently on, or disabled indefinitely).
  disablePhrase: "I choose to be distracted right now",
  disableMinutes: 30, // 0 = stays off until manually re-enabled
  disabledUntil: 0,
  // Base length of the forced breath, in seconds.
  pauseSeconds: 8,
  // Escalating friction: each time you reopen the same site today, the breath
  // grows. This is the main behavioural lever — repeated opens get tedious, so
  // the impulse fades without a hard wall that triggers reactance.
  escalatePause: true,
  escalateStep: 5, // seconds added per prior open today
  escalateMax: 60, // cap so it never becomes absurd
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
  ],

  // Schedules: windows of {days:[0-6], start:"HH:MM", end:"HH:MM", mode}.
  // mode: "normal" (breath+choice) | "strict" (no continue) | "off" (no guard).
  schedule: { enabled: false, defaultMode: "normal", windows: [] },
  // Disabling strict protection while a strict window is active requires
  // typing this phrase exactly (paste blocked).
  strictPhrase: "I choose to give this hour away",
  // Epoch ms until which "strict now" (popup quick button) forces strict mode.
  strictUntil: 0,
  // Calm-day streak: a day qualifies when no limit wall was hit and total
  // guarded time stayed under budgetMinutes.
  streak: { current: 0, best: 0, lastProcessedDate: null },
  budgetMinutes: 45, // 0 = budget check off
  // Minutes credited back every time the user steps away (median session).
  reclaimedMin: 0,
  // Weekly recap: day 0 = Sunday, hour in local time.
  recap: { enabled: true, day: 0, hour: 19 },
  // Koala buddy: shown on extension pages; overlayEnabled also floats it
  // on guarded sites.
  mascot: { name: "Koby", enabled: true, overlayEnabled: true },
  // UI theme for all extension pages: "light" | "dark".
  theme: "light"
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
  merged.schedule = { ...DEFAULTS.schedule, ...(stored.schedule || {}) };
  if (!Array.isArray(merged.schedule.windows)) merged.schedule.windows = [];
  merged.streak = { ...DEFAULTS.streak, ...(stored.streak || {}) };
  merged.recap = { ...DEFAULTS.recap, ...(stored.recap || {}) };
  merged.mascot = { ...DEFAULTS.mascot, ...(stored.mascot || {}) };
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
  return upgradeDay(all[key] || emptyDay());
}

// Single source of truth for "today" — popup, options, pause and recap all
// read through here so the numbers can never disagree.
export async function getTodayStats() {
  return getDayStats(todayKey());
}

export function emptyDay() {
  return {
    attempts: 0, // times a guarded site was intercepted
    continued: 0, // times the user chose to continue
    dismissed: 0, // times the user chose to leave
    opens: {}, // domain -> open count (passes granted)
    time: {}, // domain -> seconds spent
    opensByHour: new Array(24).fill(0) // hour -> continues (trigger insight)
  };
}

// Older day records predate opensByHour — backfill so readers never branch.
function upgradeDay(day) {
  if (!Array.isArray(day.opensByHour) || day.opensByHour.length !== 24) {
    day.opensByHour = new Array(24).fill(0);
  }
  return day;
}

// Atomically mutate today's stats via a reducer.
export async function mutateDay(fn) {
  const all = await getAllStats();
  const key = todayKey();
  const day = upgradeDay(all[key] || emptyDay());
  fn(day);
  all[key] = day;
  // Keep ~60 days of history.
  const keys = Object.keys(all).sort();
  while (keys.length > 60) delete all[keys.shift()];
  await chrome.storage.local.set({ [STATS_KEY]: all });
  return day;
}

// Reason Replay: remember the intention the user last typed for each domain so
// the pause screen can mirror it back next time. Kept out of the day stats
// (which prune at 60 days and reset daily) so the latest reason always survives.
export async function getLastIntentions() {
  const got = await chrome.storage.local.get(LASTINTENT_KEY);
  return got[LASTINTENT_KEY] || {};
}

export async function getLastIntention(domain) {
  const all = await getLastIntentions();
  return all[domain] || null;
}

export async function setLastIntention(domain, text, ts = Date.now()) {
  const t = (text || "").trim();
  if (!domain || !t) return;
  const all = await getLastIntentions();
  all[domain] = { text: t, ts };
  await chrome.storage.local.set({ [LASTINTENT_KEY]: all });
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
