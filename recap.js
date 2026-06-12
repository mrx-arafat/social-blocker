import { getSettings, getAllStats, todayKey } from "./src/storage.js";
import { applyTheme } from "./src/theme.js";
import { pickMood, mascotLine, renderMascot } from "./src/mascot.js";

const $ = (s) => document.querySelector(s);

function fmtH(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
}

function keysBack(start, n) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    keys.push({ key: todayKey(d), date: new Date(d) });
  }
  return keys;
}

function dayMinutes(stat) {
  if (!stat) return 0;
  return Object.values(stat.time || {}).reduce((a, b) => a + b, 0) / 60;
}

const REFLECTIONS = [
  "What did the best day this week have in common?",
  "Which open this week was actually worth it?",
  "What were you avoiding when you reached for the feed?",
  "If next week looked like this one, would you be okay with that?",
  "What would you do with the hours you reclaimed?",
  "Who got your best attention this week — and who deserved it?"
];

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

async function init() {
  const settings = await getSettings();
  const all = await getAllStats();
  applyTheme(settings.theme);

  const now = new Date();
  const thisWeek = keysBack(now, 7);
  const prevAnchor = new Date(now);
  prevAnchor.setDate(prevAnchor.getDate() - 7);
  const lastWeek = keysBack(prevAnchor, 7);

  $("#weekRange").textContent =
    `${thisWeek[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ` +
    now.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  // Totals + delta vs previous week.
  const total = thisWeek.reduce((a, k) => a + dayMinutes(all[k.key]), 0);
  const prevTotal = lastWeek.reduce((a, k) => a + dayMinutes(all[k.key]), 0);
  $("#weekTotal").textContent = fmtH(total);
  const deltaEl = $("#weekDelta");
  if (prevTotal > 0) {
    const diff = total - prevTotal;
    const pct = Math.round((Math.abs(diff) / prevTotal) * 100);
    if (Math.abs(diff) < 1) {
      deltaEl.textContent = "about the same as last week";
    } else if (diff < 0) {
      deltaEl.textContent = `▼ ${pct}% less than last week`;
      deltaEl.classList.add("good");
    } else {
      deltaEl.textContent = `▲ ${pct}% more than last week`;
      deltaEl.classList.add("bad");
    }
  } else {
    deltaEl.textContent = "first tracked week";
  }

  // Day bars.
  const bars = $("#dayBars");
  const max = Math.max(1, ...thisWeek.map((k) => dayMinutes(all[k.key])));
  for (const k of thisWeek) {
    const min = dayMinutes(all[k.key]);
    const col = document.createElement("div");
    col.className = "day-col";
    const bar = document.createElement("div");
    bar.className = "bar" + (min ? "" : " empty");
    bar.style.height = (min ? Math.max(6, (min / max) * 100) : 3) + "%";
    bar.title = fmtH(min);
    const lab = document.createElement("div");
    lab.className = "day-label";
    lab.textContent = k.date.toLocaleDateString(undefined, { weekday: "narrow" });
    const val = document.createElement("div");
    val.className = "day-val";
    val.textContent = min ? fmtH(min) : "";
    col.append(val, bar, lab);
    bars.appendChild(col);
  }

  // Top 3 sites by minutes.
  const siteMin = {};
  for (const k of thisWeek) {
    const t = all[k.key]?.time || {};
    for (const [dom, sec] of Object.entries(t)) {
      siteMin[dom] = (siteMin[dom] || 0) + sec / 60;
    }
  }
  const top = Object.entries(siteMin).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topBox = $("#topSites");
  if (!top.length) {
    topBox.textContent = "No guarded-site time this week. Genuinely calm.";
  }
  const topMax = top.length ? top[0][1] : 1;
  for (const [dom, min] of top) {
    const row = document.createElement("div");
    row.className = "top-row";
    const name = document.createElement("span");
    name.className = "top-name";
    name.textContent = dom;
    const meter = document.createElement("div");
    meter.className = "top-meter";
    const fill = document.createElement("div");
    fill.className = "top-fill";
    fill.style.width = Math.max(6, (min / topMax) * 100) + "%";
    meter.appendChild(fill);
    const val = document.createElement("span");
    val.className = "top-val";
    val.textContent = fmtH(min);
    row.append(name, meter, val);
    topBox.appendChild(row);
  }

  // Signals.
  const hours = new Array(24).fill(0);
  let opensSum = 0, dismissed = 0, continued = 0;
  for (const k of thisWeek) {
    const s = all[k.key];
    if (!s) continue;
    (s.opensByHour || []).forEach((n, h) => {
      hours[h] += n;
      opensSum += n;
    });
    dismissed += s.dismissed || 0;
    continued += s.continued || 0;
  }
  if (opensSum >= 5) {
    const h = hours.indexOf(Math.max(...hours));
    const h12 = ((h + 11) % 12) + 1;
    $("#worstHour").textContent = `${h12} ${h >= 12 ? "PM" : "AM"}`;
  }
  const resolved = dismissed + continued;
  if (resolved) {
    $("#stepRate").textContent = Math.round((dismissed / resolved) * 100) + "%";
  }
  const streak = settings.streak?.current || 0;
  $("#streakVal").textContent = streak ? `🔥 ${streak} day${streak === 1 ? "" : "s"}` : "0 days";
  $("#reclaimedVal").textContent = fmtH(settings.reclaimedMin || 0);

  // Reflection rotates by ISO week so it changes weekly, not per visit.
  $("#reflection").textContent = REFLECTIONS[isoWeek(now) % REFLECTIONS.length];

  // Koala sums up the week — heart-eyes on a healthy streak, chill otherwise.
  if (settings.mascot?.enabled) {
    const ctx = {
      event: streak >= 3 ? "milestone" : null,
      onSocialSite: false,
      streak,
      minutesToday: 0,
      domain: ""
    };
    const mood = pickMood(ctx);
    renderMascot($("#mascot"), {
      mood,
      line: mascotLine(mood, ctx),
      name: settings.mascot.name
    });
  }
}

init();
