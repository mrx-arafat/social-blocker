// Social Blocker — background service worker (MV3, module).
// Responsibilities: intercept navigations to guarded sites, manage temporary
// passes, enforce open/time limits, track stats, fire reminders.

import {
  getSettings,
  saveSettings,
  findSite,
  mutateDay,
  getDayStats,
  getAllStats,
  todayKey
} from "./src/storage.js";
import { resolveMode } from "./src/schedule.js";
import { buildRules } from "./src/rules.js";
import { rollStreak, medianSessionMin, prevDate } from "./src/streak.js";

// Decide why a guarded visit should be stopped, given today's stats.
// Returns a reason ("openLimit" | "timeLimit") + limit, or null for a normal pause.
function limitReason(site, day) {
  if (!site) return null;
  if (site.openLimit > 0 && (day.opens[site.domain] || 0) >= site.openLimit) {
    return { reason: "openLimit", limit: site.openLimit };
  }
  if (
    site.timeLimitMin > 0 &&
    (day.time[site.domain] || 0) / 60 >= site.timeLimitMin
  ) {
    return { reason: "timeLimit", limit: site.timeLimitMin };
  }
  return null;
}

const PAUSE_PATH = "pause.html";
const REMINDER_ALARM = "sb_reminder";
const TICK_ALARM = "sb_tick"; // 1-min sampler for time-on-site
const RECAP_ALARM = "sb_recap"; // weekly recap notification
const RECAP_NOTE_ID = "sb_recap_note";

// ---- temporary passes -------------------------------------------------------
// Stored in session storage so they vanish on browser restart.
// Shape: { "instagram.com": expiryEpochMs }

async function getPasses() {
  const got = await chrome.storage.session.get("passes");
  return got.passes || {};
}
async function setPass(domain, expiry) {
  const passes = await getPasses();
  passes[domain] = expiry;
  await chrome.storage.session.set({ passes });
}
async function clearPass(domain) {
  const passes = await getPasses();
  delete passes[domain];
  await chrome.storage.session.set({ passes });
}
async function hasValidPass(domain) {
  const passes = await getPasses();
  const exp = passes[domain];
  if (!exp) return false;
  if (Date.now() > exp) {
    await clearPass(domain);
    return false;
  }
  return true;
}

// ---- helpers ----------------------------------------------------------------

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function pauseUrl({ target, domain, reason, limit }) {
  const u = new URL(chrome.runtime.getURL(PAUSE_PATH));
  u.searchParams.set("target", target);
  u.searchParams.set("domain", domain);
  if (reason) u.searchParams.set("reason", reason);
  if (limit != null) u.searchParams.set("limit", String(limit));
  return u.toString();
}

const EXT_ORIGIN = chrome.runtime.getURL("").slice(0, -1); // no trailing /

// ---- declarativeNetRequest rule sync ----------------------------------------
// The browser enforces the redirect itself — no service-worker race, the site
// never flashes. We rebuild the whole session-rule set from current state;
// webNavigation below stays as a fallback if rule install ever fails.

async function syncRules() {
  try {
    const settings = await getSettings();
    const mode = resolveMode(settings);
    const passes = await getPasses();
    const desired = buildRules(settings, mode, passes, chrome.runtime.getURL(""));
    const existing = await chrome.declarativeNetRequest.getSessionRules();
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: existing.map((r) => r.id),
      addRules: desired
    });
  } catch (e) {
    console.warn("DNR sync failed; webNavigation fallback active", e);
  }
}

// ---- navigation interception (fallback path) ---------------------------------

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // top frame only
  const url = details.url;
  if (!/^https?:\/\//i.test(url)) return; // ignore chrome://, extension pages
  if (url.startsWith(EXT_ORIGIN)) return; // never intercept our own pages

  const settings = await getSettings();
  if (!settings.enabled) return;
  if (resolveMode(settings) === "off") return;

  const host = hostOf(url);
  const site = findSite(settings, host);
  if (!site) return;

  // Already holding a pass for this domain? Let it through.
  if (await hasValidPass(site.domain)) return;

  // Redirect to the pause screen. Attempt counting and limit resolution live
  // in pause.js (single counting point for both the DNR and this fallback
  // path), but we still pass the limit reason when we know it so the wall
  // renders without a flash of the breathing phase.
  const day = await getDayStats();
  const limit = limitReason(site, day);
  chrome.tabs.update(details.tabId, {
    url: pauseUrl({
      target: url,
      domain: site.domain,
      reason: limit ? limit.reason : undefined,
      limit: limit ? limit.limit : undefined
    })
  });
});

// ---- message API (from pause page, popup, options, content) -----------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case "GRANT_PASS":
          sendResponse(await grantPass(msg.domain));
          break;
        case "DISMISS":
          sendResponse(await recordDismiss(msg.domain));
          break;
        case "RECORD_ATTEMPT":
          await mutateDay((d) => {
            d.attempts += 1;
          });
          sendResponse({ ok: true });
          break;
        case "GET_MODE":
          sendResponse({ mode: resolveMode(await getSettings()) });
          break;
        case "STRICT_NOW": {
          const settings = await getSettings();
          settings.strictUntil = Date.now() + 60 * 60 * 1000;
          await saveSettings(settings);
          await syncRules();
          sendResponse({ ok: true, until: settings.strictUntil });
          break;
        }
        case "RESET_REMINDERS":
          await scheduleReminder();
          sendResponse({ ok: true });
          break;
        default:
          sendResponse({ ok: false, error: "unknown message" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();
  return true; // async response
});

async function grantPass(domain) {
  const settings = await getSettings();
  const site = settings.sites.find((s) => s.domain === domain);
  const day = await getDayStats();

  // Strict hours: the UI hides Continue, but enforce server-side too.
  if (resolveMode(settings) === "strict") {
    return { ok: false, blocked: "strict" };
  }

  // Safety net: re-check limits at grant time (covers the time-limit being hit
  // while the breathing screen was open).
  const limit = limitReason(site, day);
  if (limit) {
    return { ok: false, blocked: limit.reason, limit: limit.limit };
  }

  const expiry = Date.now() + settings.passDurationMin * 60 * 1000;
  await setPass(domain, expiry);
  await mutateDay((d) => {
    d.continued += 1;
    d.opens[domain] = (d.opens[domain] || 0) + 1;
    d.opensByHour[new Date().getHours()] += 1;
  });
  await syncRules(); // drop this domain's rule while the pass is live
  return { ok: true };
}

// Step-away: count it and credit back the median session length for the
// domain — the visible "time reclaimed" reward.
async function recordDismiss(domain) {
  await mutateDay((d) => {
    d.dismissed += 1;
  });
  let credited = 0;
  if (domain) {
    const all = await getAllStats();
    credited = medianSessionMin(all, domain);
    const settings = await getSettings();
    settings.reclaimedMin = (settings.reclaimedMin || 0) + credited;
    await saveSettings(settings);
  }
  return { ok: true, credited };
}

// Evaluate yesterday (and any skipped days) for the calm-day streak.
// Cheap + idempotent; runs at most once per day's first tick.
async function rollStreakIfNeeded() {
  const settings = await getSettings();
  const today = todayKey();
  if (settings.streak.lastProcessedDate === prevDate(today)) return;
  const all = await getAllStats();
  const rolled = rollStreak(all, settings.streak, settings, today);
  if (
    rolled.lastProcessedDate !== settings.streak.lastProcessedDate ||
    rolled.current !== settings.streak.current ||
    rolled.best !== settings.streak.best
  ) {
    settings.streak = rolled;
    await saveSettings(settings);
  }
}

// Every minute, sample the active foreground tab. If it sits on a guarded
// site (and the user isn't idle), add a minute of "time on site" and enforce
// the daily time limit by bouncing the tab to the pause screen.
async function onTick() {
  await rollStreakIfNeeded();
  await syncRules(); // covers pass expiry + schedule boundaries within ≤1 min

  const settings = await getSettings();
  if (!settings.enabled) return;

  // Skip counting while the user is away from the keyboard.
  try {
    const state = await chrome.idle.queryState(60);
    if (state !== "active") return;
  } catch {
    /* idle API unavailable — keep counting */
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });
  if (!tab || !tab.url || !/^https?:\/\//i.test(tab.url)) return;
  if (tab.url.startsWith(EXT_ORIGIN)) return;

  const site = findSite(settings, hostOf(tab.url));
  if (!site) return;

  const day = await mutateDay((d) => {
    d.time[site.domain] = (d.time[site.domain] || 0) + 60;
  });

  if (site.timeLimitMin > 0) {
    const spent = (day.time[site.domain] || 0) / 60;
    if (spent >= site.timeLimitMin) {
      await clearPass(site.domain);
      chrome.tabs.update(tab.id, {
        url: pauseUrl({
          target: tab.url,
          domain: site.domain,
          reason: "timeLimit",
          limit: site.timeLimitMin
        })
      });
    }
  }
}

// ---- reminders --------------------------------------------------------------

async function scheduleReminder() {
  await chrome.alarms.clear(REMINDER_ALARM);
  const settings = await getSettings();
  if (settings.remindersEnabled && settings.reminderEveryMin > 0) {
    chrome.alarms.create(REMINDER_ALARM, {
      periodInMinutes: settings.reminderEveryMin,
      delayInMinutes: settings.reminderEveryMin
    });
  }
}

// ---- weekly recap -------------------------------------------------------------

async function scheduleRecap() {
  await chrome.alarms.clear(RECAP_ALARM);
  const { recap } = await getSettings();
  if (!recap.enabled) return;
  const next = new Date();
  next.setHours(recap.hour, 0, 0, 0);
  while (next.getDay() !== recap.day || next <= new Date()) {
    next.setDate(next.getDate() + 1);
  }
  chrome.alarms.create(RECAP_ALARM, {
    when: next.getTime(),
    periodInMinutes: 7 * 24 * 60
  });
}

chrome.notifications.onClicked.addListener((id) => {
  if (id !== RECAP_NOTE_ID) return;
  chrome.tabs.create({ url: chrome.runtime.getURL("recap.html") });
  chrome.notifications.clear(RECAP_NOTE_ID);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TICK_ALARM) return onTick();
  if (alarm.name === RECAP_ALARM) {
    chrome.notifications.create(RECAP_NOTE_ID, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: "Your week, in minutes",
      message: "Tap to see your Social Blocker weekly recap.",
      priority: 1
    });
    return;
  }
  if (alarm.name !== REMINDER_ALARM) return;
  const settings = await getSettings();
  if (!settings.remindersEnabled) return;
  chrome.notifications.create({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/icon128.png"),
    title: "Social Blocker",
    message: settings.reminderText || "Take a conscious breath.",
    priority: 1
  });
});

// React to settings changes (reminder cadence, sites, schedule, master toggle).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.sb_settings) {
    scheduleReminder();
    scheduleRecap();
    syncRules();
  }
});

function ensureTick() {
  chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1, delayInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  ensureTick();
  await scheduleReminder();
  await scheduleRecap();
  await syncRules();
  if (details && details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
});
chrome.runtime.onStartup.addListener(async () => {
  ensureTick();
  await scheduleReminder();
  await scheduleRecap();
  await syncRules();
});
