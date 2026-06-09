// Social Blocker — background service worker (MV3, module).
// Responsibilities: intercept navigations to guarded sites, manage temporary
// passes, enforce open/time limits, track stats, fire reminders.

import {
  getSettings,
  findSite,
  mutateDay,
  getDayStats
} from "./src/storage.js";

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

// ---- navigation interception ------------------------------------------------

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // top frame only
  const url = details.url;
  if (!/^https?:\/\//i.test(url)) return; // ignore chrome://, extension pages
  if (url.startsWith(EXT_ORIGIN)) return; // never intercept our own pages

  const settings = await getSettings();
  if (!settings.enabled) return;

  const host = hostOf(url);
  const site = findSite(settings, host);
  if (!site) return;

  // Already holding a pass for this domain? Let it through.
  if (await hasValidPass(site.domain)) return;

  // Intercept: count the attempt, then redirect. If the user is already over a
  // daily limit, go straight to the limit wall rather than the breathing screen.
  const day = await mutateDay((d) => {
    d.attempts += 1;
  });
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
          await mutateDay((d) => {
            d.dismissed += 1;
          });
          sendResponse({ ok: true });
          break;
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
  });
  return { ok: true };
}

// Every minute, sample the active foreground tab. If it sits on a guarded
// site (and the user isn't idle), add a minute of "time on site" and enforce
// the daily time limit by bouncing the tab to the pause screen.
async function onTick() {
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

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TICK_ALARM) return onTick();
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

// React to settings changes (e.g. reminder cadence).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.sb_settings) scheduleReminder();
});

function ensureTick() {
  chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1, delayInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(async () => {
  ensureTick();
  await scheduleReminder();
});
chrome.runtime.onStartup.addListener(async () => {
  ensureTick();
  await scheduleReminder();
});
