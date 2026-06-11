import { getSettings, saveSettings, getTodayStats } from "./src/storage.js";
import { strictActive } from "./src/schedule.js";
import { applyTheme } from "./src/theme.js";

const $ = (s) => document.querySelector(s);

function fmtH(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
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

  renderSiteToday(settings, day);
  renderStrictBtn(settings);
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

$("#masterToggle").addEventListener("change", async (e) => {
  const settings = await getSettings();
  // Turning everything off while strict hours are active would bypass strict
  // mode — that path goes through the options page and the typed phrase.
  if (!e.target.checked && strictActive(settings)) {
    e.target.checked = true;
    $("#todayNote").textContent = "Strict hours — disable from Settings (phrase required).";
    return;
  }
  settings.enabled = e.target.checked;
  await saveSettings(settings);
});

$("#strictNow").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STRICT_NOW" });
  render();
});

$("#openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
