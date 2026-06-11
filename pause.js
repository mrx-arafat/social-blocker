import { getSettings, getTodayStats, getAllStats, todayKey } from "./src/storage.js";
import { pickMessage } from "./src/messages.js";
import { medianSessionMin } from "./src/streak.js";
import { applyTheme } from "./src/theme.js";

const params = new URLSearchParams(location.search);
const domain = params.get("domain") || "this site";
const reason = params.get("reason") || ""; // "", "timeLimit", "openLimit"
const limitParam = params.get("limit"); // numeric string or null

// The DNR redirect appends the original URL unencoded as the LAST param
// (`…&target=https://x.com/a?b=1&c=2`), so URLSearchParams would truncate it
// at the first `&`. Slice it out of the raw query string instead.
const rawSearch = location.search;
const tIdx = rawSearch.indexOf("target=");
const target = tIdx >= 0 ? rawSearch.slice(tIdx + "target=".length) : "";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const el = {
  breathePhase: $("#breathePhase"),
  choicePhase: $("#choicePhase"),
  limitPhase: $("#limitPhase"),
  donePhase: $("#donePhase"),
  countdown: $("#countdown"),
  breatheSub: $("#breatheSub"),
  streakBadge: $("#streakBadge"),
  psyMessage: $("#psyMessage"),
  strictNote: $("#strictNote"),
  intentionBlock: $("#intentionBlock"),
  intentionChips: $("#intentionChips"),
  altBlock: $("#altBlock"),
  altSuggestion: $("#altSuggestion"),
  altRefresh: $("#altRefresh"),
  continueBtn: $("#continueBtn"),
  leaveBtn: $("#leaveBtn"),
  continueHint: $("#continueHint"),
  limitTitle: $("#limitTitle"),
  limitSub: $("#limitSub"),
  limitLeaveBtn: $("#limitLeaveBtn"),
  doneSub: $("#doneSub"),
  closeBtn: $("#closeBtn")
};

let settings;
let mode = "normal";
let chosenIntention = null;

document.title = `Take a breath — ${domain}`;
$$(".domain-label").forEach((n) => (n.textContent = domain));
$("#domainLabel").textContent = domain;

function show(phase) {
  [el.breathePhase, el.choicePhase, el.limitPhase, el.donePhase].forEach((p) =>
    p.classList.add("hidden")
  );
  phase.classList.remove("hidden");
}

function showLimit(kind, limit) {
  if (kind === "timeLimit") {
    el.limitTitle.textContent = "Time's up for today";
    el.limitSub.textContent = `You've reached your ${limit}-minute daily limit on ${domain}. It'll be available again tomorrow.`;
  } else {
    el.limitTitle.textContent = "You've reached your daily limit";
    el.limitSub.textContent = `You've opened ${domain} ${limit} time${
      limit === 1 ? "" : "s"
    } today — that was the cap you set. Come back tomorrow.`;
  }
  show(el.limitPhase);
}

function fmtH(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
}

async function stepAway() {
  const res = await chrome.runtime.sendMessage({ type: "DISMISS", domain });
  if (res && res.credited) {
    const fresh = await getSettings();
    el.doneSub.textContent =
      `≈ ${res.credited}m reclaimed. Total: ${fmtH(fresh.reclaimedMin || 0)}.`;
  }
  show(el.donePhase);
}

function pickAlternative() {
  const list = settings.alternatives || [];
  if (!list.length) {
    el.altBlock.classList.add("hidden");
    return;
  }
  const i = Math.floor(Math.random() * list.length);
  el.altSuggestion.textContent = list[i];
}

function buildIntentions() {
  if (!settings.requireIntention) {
    el.intentionBlock.classList.add("hidden");
    el.continueBtn.disabled = false;
    return;
  }
  el.intentionChips.innerHTML = "";
  (settings.intentions || []).forEach((text) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = text;
    chip.addEventListener("click", () => selectIntention(chip, text));
    el.intentionChips.appendChild(chip);
  });
  // Custom intention chip.
  const custom = document.createElement("button");
  custom.className = "chip";
  custom.type = "button";
  custom.textContent = "+ Add your own";
  custom.addEventListener("click", () => {
    const val = prompt("What's your intention?");
    if (val && val.trim()) {
      custom.textContent = val.trim();
      selectIntention(custom, val.trim());
    }
  });
  el.intentionChips.appendChild(custom);
}

function selectIntention(chip, text) {
  chosenIntention = text;
  $$(".chip").forEach((c) => c.classList.remove("selected"));
  chip.classList.add("selected");
  el.continueBtn.disabled = false;
  el.continueHint.classList.add("hidden");
}

async function onContinue() {
  if (settings.requireIntention && !chosenIntention) {
    el.continueHint.classList.remove("hidden");
    return;
  }
  el.continueBtn.disabled = true;
  el.continueBtn.textContent = "Opening…";
  const res = await chrome.runtime.sendMessage({
    type: "GRANT_PASS",
    domain,
    intention: chosenIntention
  });
  if (res && res.ok) {
    if (/^https?:\/\//i.test(target)) {
      location.replace(target);
    } else {
      location.replace("https://" + domain);
    }
  } else if (res && res.blocked === "strict") {
    renderStrict();
  } else if (res && res.blocked) {
    showLimit(res.blocked, res.limit);
  } else {
    el.continueBtn.disabled = false;
    el.continueBtn.innerHTML = `Continue to <span class="domain-label">${domain}</span>`;
  }
}

function renderStrict() {
  el.continueBtn.classList.add("hidden");
  el.intentionBlock.classList.add("hidden");
  el.continueHint.classList.add("hidden");
  el.strictNote.classList.remove("hidden");
  el.strictNote.textContent =
    "Strict hours — continuing is off right now. The only way through is to step away.";
}

function runBreathing(seconds) {
  let remaining = seconds;
  el.countdown.textContent = remaining;
  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tick);
      show(el.choicePhase);
      return;
    }
    el.countdown.textContent = remaining;
  }, 1000);
}

function closeTab() {
  // Works when the tab can be scripted closed; otherwise navigate away.
  window.close();
  setTimeout(() => location.replace("about:blank"), 120);
}

// Mirrors background's limitReason — the DNR path has no reason param, so the
// pause page resolves limits itself from the same stored numbers.
function localLimit(site, day) {
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

// Build message context from the last 7 days of real data.
function messageContext(all, day, streak) {
  const keys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(todayKey(d));
  }
  let minutesWeek = 0, stepAwaysWeek = 0;
  const hourTotals = new Array(24).fill(0);
  let hourSum = 0;
  for (const k of keys) {
    const s = all[k];
    if (!s) continue;
    minutesWeek += (s.time?.[domain] || 0) / 60;
    stepAwaysWeek += s.dismissed || 0;
    (s.opensByHour || []).forEach((n, h) => {
      hourTotals[h] += n;
      hourSum += n;
    });
  }
  let worstHour = null;
  if (hourSum >= 5) {
    worstHour = hourTotals.indexOf(Math.max(...hourTotals));
  }
  return {
    domain,
    visitsToday: day.opens[domain] || 0,
    minutesToday: Math.round((day.time[domain] || 0) / 60),
    minutesWeek: Math.round(minutesWeek),
    streak,
    stepAwaysWeek,
    reclaimedWeekMin: stepAwaysWeek * medianSessionMin(all, domain),
    worstHour,
    nowHour: new Date().getHours()
  };
}

async function init() {
  settings = await getSettings();
  applyTheme(settings.theme);

  // Single counting point for interruptions (DNR + fallback paths both land here).
  await chrome.runtime.sendMessage({ type: "RECORD_ATTEMPT" });

  const day = await getTodayStats();
  const site = settings.sites.find((s) => s.domain === domain);

  // Over a daily limit? Straight to the wall — honor the legacy URL param
  // from the webNavigation fallback, otherwise resolve locally.
  const limit =
    reason === "timeLimit" || reason === "openLimit"
      ? { reason, limit: limitParam != null ? Number(limitParam) : 0 }
      : localLimit(site, day);
  if (limit) {
    showLimit(limit.reason, limit.limit);
    el.limitLeaveBtn.addEventListener("click", closeTab);
    return;
  }

  const modeRes = await chrome.runtime.sendMessage({ type: "GET_MODE" });
  mode = (modeRes && modeRes.mode) || "normal";

  // Streak badge + persuasive message from the user's own data.
  const streak = settings.streak?.current || 0;
  if (streak >= 2) {
    el.streakBadge.textContent = `🔥 ${streak}-day calm streak`;
    el.streakBadge.classList.remove("hidden");
  }
  const all = await getAllStats();
  el.psyMessage.textContent = pickMessage(messageContext(all, day, streak));

  if (mode === "strict") {
    renderStrict();
  } else {
    buildIntentions();
    el.continueBtn.addEventListener("click", onContinue);
  }

  if (settings.showAlternatives) pickAlternative();
  else el.altBlock.classList.add("hidden");

  el.altRefresh.addEventListener("click", pickAlternative);
  el.leaveBtn.addEventListener("click", stepAway);
  el.limitLeaveBtn.addEventListener("click", closeTab);
  el.closeBtn.addEventListener("click", closeTab);

  runBreathing(breathSeconds(settings, day));
}

// Effective breath length, growing with each time you've already opened this
// site today (escalating friction).
function breathSeconds(settings, day) {
  const base = Math.max(2, settings.pauseSeconds || 8);
  if (!settings.escalatePause) return base;
  const opensToday = day.opens[domain] || 0;
  const secs = base + opensToday * (settings.escalateStep || 0);
  const capped = Math.min(secs, settings.escalateMax || 60);
  if (opensToday > 0) {
    el.breatheSub.innerHTML =
      `Opening <b>${domain}</b> again — breathe a little longer this time.`;
  }
  return capped;
}

init();
