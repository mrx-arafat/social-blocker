import { getSettings, saveSettings, getTodayStats } from "./src/storage.js";
import { strictActive } from "./src/schedule.js";
import { applyTheme } from "./src/theme.js";
import { pickMood, mascotLine, renderMascot } from "./src/mascot.js";
import { phraseMatches, reenableAt, disableRemainingMs } from "./src/disable-gate.js";

const $ = (s) => document.querySelector(s);

function fmtH(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
}

function fmtClock(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function render() {
  const settings = await getSettings();
  const day = await getTodayStats();
  applyTheme(settings.theme);

  $("#masterToggle").checked = settings.enabled;

  // Psychology row: streak + reclaimed.
  const streak = settings.streak?.current || 0;
  $("#pStreak").textContent = streak ? `🔥 ${streak}` : "0";
  $("#pBest").textContent =
    settings.streak?.best > 1 ? `best: ${settings.streak.best}` : "";
  $("#pReclaimed").textContent = fmtH(settings.reclaimedMin || 0);

  $("#sAttempts").textContent = day.attempts;
  $("#sDismissed").textContent = day.dismissed;
  const resolved = day.continued + day.dismissed;
  const rate = resolved ? Math.round((day.dismissed / resolved) * 100) : 0;
  $("#sRate").textContent = rate + "%";

  $("#todayNote").textContent = day.attempts
    ? `${day.attempts} interruption${day.attempts === 1 ? "" : "s"} today — ${
        day.dismissed
      } ended in stepping away.`
    : "No interruptions yet today.";

  // When protection is off, that's the headline — say when it returns.
  if (!settings.enabled) {
    $("#todayNote").textContent =
      disableRemainingMs(settings, Date.now()) > 0
        ? `Protection off — back on at ${fmtClock(settings.disabledUntil)}.`
        : "Protection is off.";
  }

  renderSiteToday(settings, day);
  renderStrictBtn(settings);
  renderBuddy(settings, streak);
}

// Koala greets from the popup — heart-eyes on a healthy streak, chill otherwise.
function renderBuddy(settings, streak) {
  const host = $("#mascot");
  if (!settings.mascot?.enabled) {
    host.innerHTML = "";
    return;
  }
  const ctx = {
    event: streak >= 3 ? "milestone" : null,
    onSocialSite: false,
    streak,
    minutesToday: 0,
    domain: ""
  };
  const mood = pickMood(ctx);
  renderMascot(host, {
    mood,
    line: mascotLine(mood, ctx),
    name: settings.mascot.name
  });
}

// Today's per-site numbers — same getTodayStats() the options page uses,
// so the figures can never disagree.
function renderSiteToday(settings, day) {
  const box = $("#siteToday");
  box.innerHTML = "";
  const rows = settings.sites.filter(
    (s) => s.enabled && ((day.time[s.domain] || 0) > 0 || (day.opens[s.domain] || 0) > 0)
  );
  if (!rows.length) return;
  for (const site of rows) {
    const min = Math.round((day.time[site.domain] || 0) / 60);
    const opens = day.opens[site.domain] || 0;
    const row = document.createElement("div");
    row.className = "site-today-row";
    const name = document.createElement("span");
    name.className = "std-name";
    name.textContent = site.domain;
    const use = document.createElement("span");
    use.className = "std-use";
    const minTxt = site.timeLimitMin > 0 ? `${min}m/${site.timeLimitMin}m` : `${min}m`;
    const openTxt = site.openLimit > 0 ? `${opens}/${site.openLimit} opens` : `${opens} open${opens === 1 ? "" : "s"}`;
    use.textContent = `${minTxt} · ${openTxt}`;
    if (
      (site.timeLimitMin > 0 && min >= site.timeLimitMin) ||
      (site.openLimit > 0 && opens >= site.openLimit)
    ) {
      row.classList.add("over");
    }
    row.append(name, use);
    box.appendChild(row);
  }
}

function renderStrictBtn(settings) {
  const btn = $("#strictNow");
  const until = settings.strictUntil || 0;
  if (until > Date.now()) {
    const end = new Date(until);
    const hh = String(end.getHours()).padStart(2, "0");
    const mm = String(end.getMinutes()).padStart(2, "0");
    btn.textContent = `Strict until ${hh}:${mm}`;
    btn.disabled = true; // turning off early = options page + phrase
  } else {
    btn.textContent = "Strict now — 1h";
    btn.disabled = false;
  }
}

// Phrase captured when the disable modal opens, so keystroke checks don't race
// against storage reads.
let activePhrase = "";

$("#masterToggle").addEventListener("change", async (e) => {
  const settings = await getSettings();

  // Turning it back on is frictionless — and cancels any pending auto-re-enable.
  if (e.target.checked) {
    settings.enabled = true;
    settings.disabledUntil = 0;
    await saveSettings(settings);
    render();
    return;
  }

  // Disabling during strict hours stays blocked — that path needs the strict
  // phrase on the options page.
  if (strictActive(settings)) {
    e.target.checked = true;
    $("#todayNote").textContent = "Strict hours — disable from Settings (phrase required).";
    return;
  }

  // Otherwise don't disable yet: revert the toggle and make them type first.
  e.target.checked = true;
  openDisableModal(settings);
});

function openDisableModal(settings) {
  activePhrase = settings.disablePhrase;
  $("#disablePhraseText").textContent = settings.disablePhrase;
  const mins = settings.disableMinutes || 0;
  $("#disableNote").textContent =
    mins > 0
      ? `It switches back on automatically after ${mins} min.`
      : "It stays off until you turn it back on.";
  const inp = $("#disablePhraseInput");
  inp.value = "";
  $("#disableConfirm").disabled = true;
  $("#disableModal").classList.remove("hidden");
  inp.focus();
}

function closeDisableModal() {
  $("#disableModal").classList.add("hidden");
}

$("#disablePhraseInput").addEventListener("paste", (e) => e.preventDefault());
$("#disablePhraseInput").addEventListener("input", () => {
  $("#disableConfirm").disabled = !phraseMatches($("#disablePhraseInput").value, activePhrase);
});
$("#disableCancel").addEventListener("click", () => {
  closeDisableModal();
  render();
});
$("#disableConfirm").addEventListener("click", async () => {
  if (!phraseMatches($("#disablePhraseInput").value, activePhrase)) return;
  const settings = await getSettings();
  settings.enabled = false;
  settings.disabledUntil = reenableAt(Date.now(), settings.disableMinutes || 0);
  await saveSettings(settings);
  closeDisableModal();
  render();
});

$("#strictNow").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STRICT_NOW" });
  render();
});

$("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
