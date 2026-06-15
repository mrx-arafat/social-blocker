import { getSettings, saveSettings, getTodayStats, SETTINGS_KEY } from "./src/storage.js";
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

  // Week strip: 7 dots, the last `min(streak,7)` lit as calm days.
  const week = $("#streakWeek");
  if (week) {
    week.innerHTML = "";
    const lit = Math.min(streak, 7);
    for (let i = 0; i < 7; i++) {
      const dot = document.createElement("span");
      dot.className = "streak-dot";
      // Light the most recent `lit` days (right-aligned), mark the last as today.
      if (i >= 7 - lit) dot.classList.add("on");
      if (i === 6 && streak > 0) dot.classList.add("today");
      week.appendChild(dot);
    }
  }

  // Milestone progress bar inside streak card.
  const milestones = [3, 7, 14, 21, 30, 60, 100];
  const nextM = milestones.find((m) => m > streak) ?? Math.ceil((streak + 1) / 50) * 50;
  const prevM = [...milestones].reverse().find((m) => m <= streak) ?? 0;
  // Highest milestone actually reached (handles the 50-step tail past 100).
  const reachedM = streak >= 100 ? Math.floor(streak / 50) * 50 : prevM;

  // Celebrate a freshly-crossed milestone. First time the field is missing we
  // migrate: existing users (who already have streak history) are seeded to
  // their current milestone silently — no retroactive pop. Brand-new users seed
  // to 0 so their first real milestone celebrates normally.
  let seen = settings.streak?.lastCelebrated;
  if (seen === undefined) {
    const hadHistory = (settings.streak?.best || 0) > 0 || (settings.streak?.current || 0) > 0;
    seen = hadHistory ? reachedM : 0;
    settings.streak.lastCelebrated = seen;
    await saveSettings(settings);
  }
  if (reachedM > seen) {
    celebrateStreak(reachedM);
    settings.streak.lastCelebrated = reachedM;
    await saveSettings(settings);
  }
  const goalPct = streak === 0 ? 0 : Math.min(100, ((streak - prevM) / (nextM - prevM)) * 100);
  const goalFill = $("#streakGoalFill");
  if (goalFill) goalFill.style.width = goalPct + "%";
  const goalLabel = $("#streakGoalLabel");
  if (goalLabel) {
    goalLabel.textContent = streak >= 100
      ? "legendary — keep going 🏆"
      : `${nextM - streak} day${nextM - streak === 1 ? "" : "s"} to ${nextM}-day goal`;
  }
  const reclaimed = settings.reclaimedMin || 0;
  const usedMin = settings.sites
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + Math.round((day.time[s.domain] || 0) / 60), 0);
  const net = Math.max(0, reclaimed - usedMin);
  $("#pReclaimed").textContent = fmtH(net);
  setJarFill(Math.min(100, (net / 120) * 100));
  const sub = $("#jarSub");
  if (sub) {
    sub.textContent = reclaimed > 0
      ? `+${fmtH(reclaimed)} in · ${fmtH(usedMin)} out`
      : "step away to fill the jar";
  }

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

// Koala greets from the popup: playing when protection is off, adoring on a
// strong streak, diligent on a building one, chill otherwise.
function renderBuddy(settings, streak) {
  const host = $("#mascot");
  if (!settings.mascot?.enabled) {
    host.innerHTML = "";
    return;
  }
  const ctx = {
    event: null,
    offDuty: !settings.enabled,
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
  inp.closest(".phrase-field").classList.remove("match");
  $("#disableConfirm").disabled = true;
  $("#disableModal").classList.remove("hidden");
  inp.focus();
}

function closeDisableModal() {
  $("#disableModal").classList.add("hidden");
}

$("#disablePhraseInput").addEventListener("paste", (e) => e.preventDefault());
$("#disablePhraseInput").addEventListener("input", () => {
  const ok = phraseMatches($("#disablePhraseInput").value, activePhrase);
  $("#disableConfirm").disabled = !ok;
  $("#disablePhraseInput").closest(".phrase-field").classList.toggle("match", ok);
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

function setJarFill(pct) {
  const liquid = $("#jarLiquid");
  if (liquid) liquid.style.height = pct + "%";
}

// Milestone reached — flash a pill, fling confetti, bounce the streak number.
function celebrateStreak(milestone) {
  const host = $("#streakCelebrate");
  if (!host) return;

  const colors = ["#f97316", "#22c55e", "#fbbf24", "#3b82f6", "#ec4899"];
  let pieces = "";
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
    const dist = 26 + Math.random() * 18;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const rot = (Math.random() * 540 - 270) | 0;
    const c = colors[i % colors.length];
    pieces += `<span class="confetti" style="background:${c};--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--rot:${rot}deg"></span>`;
  }
  host.innerHTML =
    pieces + `<div class="celebrate-pill">🎉 ${milestone}-day streak!</div>`;

  host.classList.remove("show");
  void host.getBoundingClientRect();
  host.classList.add("show");

  const num = $("#pStreak");
  if (num) {
    num.classList.remove("celebrate");
    void num.getBoundingClientRect();
    num.classList.add("celebrate");
  }
}

function pourIntoJar(deltaMin) {
  const pour = $("#jarPour");
  const body = document.querySelector(".jar-outline");
  const badge = $("#jarBadge");

  if (pour) {
    pour.classList.remove("pouring");
    void pour.offsetWidth;
    pour.classList.add("pouring");
  }
  if (body) {
    body.classList.remove("pulse");
    void body.getBoundingClientRect();
    body.classList.add("pulse");
  }
  if (badge && deltaMin > 0) {
    badge.textContent = `+${fmtH(deltaMin)}`;
    badge.classList.remove("pop");
    void badge.offsetWidth;
    badge.classList.add("pop");
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[SETTINGS_KEY]) return;
  const prev = changes[SETTINGS_KEY].oldValue;
  const next = changes[SETTINGS_KEY].newValue;
  if (!prev || !next) return;
  const delta = (next.reclaimedMin || 0) - (prev.reclaimedMin || 0);
  if (delta > 0) {
    pourIntoJar(delta);
    render();
  }
});

render();
