import {
  getSettings,
  saveSettings,
  getAllStats,
  getTodayStats,
  todayKey,
  normalizeDomain,
  DEFAULTS
} from "./src/storage.js";
import { strictActive } from "./src/schedule.js";
import { applyTheme } from "./src/theme.js";
import { renderMascot, DEFAULT_MASCOT_NAME } from "./src/mascot.js";
import { phraseMatches, reenableAt } from "./src/disable-gate.js";
import { requestSiteAccess, releaseSiteAccess } from "./src/permissions.js";
import { buildCalendar } from "./src/calendar.js";
import { peakHour, windowForHour, hasWindow } from "./src/insights.js";

const $ = (s) => document.querySelector(s);
let settings;

// ---- typed-phrase confirmation gate ------------------------------------------
// Weakening protection (turning the blocker off, or strict-weakening edits while
// strict hours are active) requires typing a phrase exactly — paste blocked. The
// phrase and copy vary by context; the modal itself is generic.
let pendingApply = null;
let modalPhrase = "";

function confirmWithPhrase(phrase, applyFn, copy = {}) {
  pendingApply = applyFn;
  modalPhrase = phrase;
  $("#phraseTitle").textContent = copy.title || "Are you sure?";
  $("#phraseBody").textContent = copy.body || "To confirm, type this exactly:";
  $("#phraseText").textContent = phrase;
  const inp = $("#phraseInput");
  inp.value = "";
  inp.closest(".phrase-field").classList.remove("match");
  $("#phraseConfirm").disabled = true;
  $("#phraseModal").classList.remove("hidden");
  inp.focus();
}

// Strict-hours guard for protection-weakening edits other than the master toggle
// (schedule off, editing/removing windows, removing sites).
function guardStrict(applyFn) {
  if (!strictActive(settings)) {
    applyFn();
    return;
  }
  confirmWithPhrase(settings.strictPhrase, applyFn, {
    title: "Strict hours are active",
    body: "To weaken strict protection right now, type this exactly:"
  });
}

function bindPhraseModal() {
  const inp = $("#phraseInput");
  inp.addEventListener("paste", (e) => e.preventDefault());
  inp.addEventListener("input", () => {
    const ok = phraseMatches(inp.value, modalPhrase);
    $("#phraseConfirm").disabled = !ok;
    inp.closest(".phrase-field").classList.toggle("match", ok);
  });
  $("#phraseCancel").addEventListener("click", () => {
    pendingApply = null;
    // Full reload resets any optimistic UI state without re-binding listeners.
    location.reload();
  });
  $("#phraseConfirm").addEventListener("click", () => {
    if (!phraseMatches(inp.value, modalPhrase)) return;
    $("#phraseModal").classList.add("hidden");
    const fn = pendingApply;
    pendingApply = null;
    if (fn) fn();
  });
}

// ---- save + toast -----------------------------------------------------------
let toastTimer;
async function persist() {
  await saveSettings(settings);
  const t = $("#toast");
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1200);
}

// ---- simple controls --------------------------------------------------------
function bindToggle(id, key) {
  const elx = $("#" + id);
  elx.checked = settings[key];
  elx.addEventListener("change", () => {
    settings[key] = elx.checked;
    persist();
  });
}

function bindRange(id, outId, key, suffix) {
  const elx = $("#" + id);
  const out = $("#" + outId);
  elx.value = settings[key];
  out.textContent = settings[key] + suffix;
  elx.addEventListener("input", () => {
    out.textContent = elx.value + suffix;
  });
  elx.addEventListener("change", () => {
    settings[key] = Number(elx.value);
    persist();
  });
}

// ---- guarded sites ----------------------------------------------------------
function renderSites() {
  const list = $("#siteList");
  list.innerHTML = "";
  settings.sites.forEach((site, i) => {
    const row = document.createElement("div");
    row.className = "site-row" + (site.enabled ? "" : " off");

    // name + enable
    const name = document.createElement("div");
    name.className = "site-name";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = site.enabled;
    cb.addEventListener("change", () => {
      if (!cb.checked) {
        guardStrict(() => {
          site.enabled = false;
          persist();
          renderSites();
        });
        cb.checked = site.enabled; // revert until confirmed
        return;
      }
      site.enabled = true;
      persist();
      renderSites();
    });
    const dom = document.createElement("span");
    dom.className = "dom";
    dom.textContent = site.domain;
    name.append(cb, dom);

    // open limit
    const opens = numInput(site.openLimit, (v) => {
      site.openLimit = v;
      persist();
    });
    // time limit
    const mins = numInput(site.timeLimitMin, (v) => {
      site.timeLimitMin = v;
      persist();
    });

    // remove (weakens strict coverage -> phrase-gated during strict hours)
    const rm = document.createElement("button");
    rm.className = "icon-btn";
    rm.textContent = "×";
    rm.title = "Remove";
    rm.addEventListener("click", () => {
      guardStrict(() => {
        const removed = settings.sites[i];
        settings.sites.splice(i, 1);
        if (removed) releaseSiteAccess(removed.domain);
        persist();
        renderSites();
      });
    });

    row.append(name, opens, mins, rm);
    list.appendChild(row);
  });
}

function numInput(value, onChange) {
  const inp = document.createElement("input");
  inp.type = "number";
  inp.min = "0";
  inp.className = "num-input";
  inp.value = value;
  inp.addEventListener("change", () => {
    onChange(Math.max(0, Number(inp.value) || 0));
  });
  return inp;
}

$("#addSiteForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#addSiteInput");
  const domain = normalizeDomain(input.value);
  if (!domain) return;
  if (settings.sites.some((s) => s.domain === domain)) {
    input.value = "";
    return;
  }
  // Ask for host access first, while the submit gesture is still live. The
  // site is guarded either way (webNavigation fallback); the grant only adds
  // the flash-free redirect + mascot overlay.
  requestSiteAccess(domain).finally(() => {
    settings.sites.push({ domain, enabled: true, openLimit: 0, timeLimitMin: 0 });
    input.value = "";
    persist();
    renderSites();
  });
});

// ---- feeds ------------------------------------------------------------------
function bindFeeds() {
  for (const key of Object.keys(DEFAULTS.feeds)) {
    const elx = $("#feed_" + key);
    if (!elx) continue;
    elx.checked = !!settings.feeds[key];
    elx.addEventListener("change", () => {
      settings.feeds[key] = elx.checked;
      persist();
    });
  }
}

// ---- editable tag lists (intentions / alternatives) -------------------------
function renderTags(listId, arrKey) {
  const list = $("#" + listId);
  list.innerHTML = "";
  settings[arrKey].forEach((text, i) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.append(document.createTextNode(text));
    const x = document.createElement("button");
    x.textContent = "×";
    x.addEventListener("click", () => {
      settings[arrKey].splice(i, 1);
      persist();
      renderTags(listId, arrKey);
    });
    tag.appendChild(x);
    list.appendChild(tag);
  });
}

function bindAdder(formId, inputId, arrKey, listId) {
  $("#" + formId).addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = $("#" + inputId);
    const val = inp.value.trim();
    if (!val) return;
    if (!settings[arrKey].includes(val)) settings[arrKey].push(val);
    inp.value = "";
    persist();
    renderTags(listId, arrKey);
  });
}

// ---- schedule editor ----------------------------------------------------------
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function defaultWindow() {
  return { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00", mode: "strict" };
}

// Any edit that could weaken strict coverage goes through guardStrict; pure
// tightening (adding a window) does not.
function renderWindows() {
  const list = $("#windowList");
  list.innerHTML = "";
  settings.schedule.windows.forEach((w, i) => {
    const row = document.createElement("div");
    row.className = "window-row";

    const days = document.createElement("div");
    days.className = "day-checks";
    DAY_LETTERS.forEach((letter, d) => {
      const lab = document.createElement("label");
      lab.className = "day-check";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = w.days.includes(d);
      cb.addEventListener("change", () => {
        guardStrict(() => {
          if (cb.checked) {
            if (!w.days.includes(d)) w.days.push(d);
          } else {
            w.days = w.days.filter((x) => x !== d);
          }
          persist();
          renderWindows();
        });
      });
      const span = document.createElement("span");
      span.textContent = letter;
      lab.append(cb, span);
      days.appendChild(lab);
    });

    const start = document.createElement("input");
    start.type = "time";
    start.value = w.start;
    start.addEventListener("change", () => {
      guardStrict(() => {
        w.start = start.value;
        persist();
      });
    });
    const end = document.createElement("input");
    end.type = "time";
    end.value = w.end;
    end.addEventListener("change", () => {
      guardStrict(() => {
        w.end = end.value;
        persist();
      });
    });

    const mode = document.createElement("select");
    mode.className = "mode-select";
    [["normal", "Normal"], ["strict", "Strict"], ["off", "Off"]].forEach(([v, t]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      mode.appendChild(o);
    });
    mode.value = w.mode;
    mode.addEventListener("change", () => {
      guardStrict(() => {
        w.mode = mode.value;
        persist();
      });
    });

    const rm = document.createElement("button");
    rm.className = "icon-btn";
    rm.textContent = "×";
    rm.title = "Remove window";
    rm.addEventListener("click", () => {
      guardStrict(() => {
        settings.schedule.windows.splice(i, 1);
        persist();
        renderWindows();
      });
    });

    const times = document.createElement("div");
    times.className = "window-times";
    times.append(start, document.createTextNode("–"), end);

    row.append(days, times, mode, rm);
    list.appendChild(row);
  });
}

function bindSchedule() {
  const en = $("#scheduleEnabled");
  en.checked = settings.schedule.enabled;
  en.addEventListener("change", () => {
    if (!en.checked) {
      guardStrict(() => {
        settings.schedule.enabled = false;
        persist();
      });
      en.checked = settings.schedule.enabled;
      return;
    }
    settings.schedule.enabled = true;
    persist();
  });

  const dm = $("#scheduleDefaultMode");
  dm.value = settings.schedule.defaultMode;
  dm.addEventListener("change", () => {
    settings.schedule.defaultMode = dm.value;
    persist();
  });

  $("#addWindow").addEventListener("click", () => {
    settings.schedule.windows.push(defaultWindow());
    persist();
    renderWindows();
  });

  renderWindows();
}

// ---- budget + recap -------------------------------------------------------------
function bindBudget() {
  const elx = $("#budgetMinutes");
  const out = $("#budgetMinutesOut");
  const fmt = (v) => (Number(v) === 0 ? "off" : v + "m");
  elx.value = settings.budgetMinutes;
  out.textContent = fmt(settings.budgetMinutes);
  elx.addEventListener("input", () => (out.textContent = fmt(elx.value)));
  elx.addEventListener("change", () => {
    settings.budgetMinutes = Number(elx.value);
    persist();
  });
}

function bindRecap() {
  const en = $("#recapEnabled");
  en.checked = settings.recap.enabled;
  en.addEventListener("change", () => {
    settings.recap.enabled = en.checked;
    persist();
  });

  const hourSel = $("#recapHour");
  for (let h = 0; h < 24; h++) {
    const o = document.createElement("option");
    o.value = String(h);
    o.textContent = String(h).padStart(2, "0") + ":00";
    hourSel.appendChild(o);
  }
  const daySel = $("#recapDay");
  daySel.value = String(settings.recap.day);
  hourSel.value = String(settings.recap.hour);
  daySel.addEventListener("change", () => {
    settings.recap.day = Number(daySel.value);
    persist();
  });
  hourSel.addEventListener("change", () => {
    settings.recap.hour = Number(hourSel.value);
    persist();
  });

  $("#openRecap").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL("recap.html") });
  });
}

// ---- reminders text ---------------------------------------------------------
function bindReminderText() {
  const elx = $("#reminderText");
  elx.value = settings.reminderText;
  elx.addEventListener("change", () => {
    settings.reminderText = elx.value;
    persist();
  });
}

// ---- stats ------------------------------------------------------------------

function fmtH(min) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? `${h}h${m ? " " + m + "m" : ""}` : `${m}m`;
}

// Today card — reads through the same getTodayStats() as the popup, so the
// daily numbers shown here can never disagree with anything else.
async function renderToday() {
  const day = await getTodayStats();
  const totalMin = Math.round(
    Object.values(day.time).reduce((a, b) => a + b, 0) / 60
  );
  const totalOpens = Object.values(day.opens).reduce((a, b) => a + b, 0);
  $("#tMinutes").textContent = fmtH(totalMin);
  $("#tOpens").textContent = totalOpens;
  $("#tStepAways").textContent = day.dismissed;

  const box = $("#todaySites");
  box.innerHTML = "";
  const active = settings.sites.filter(
    (s) => (day.time[s.domain] || 0) > 0 || (day.opens[s.domain] || 0) > 0
  );
  for (const site of active) {
    const min = Math.round((day.time[site.domain] || 0) / 60);
    const opens = day.opens[site.domain] || 0;
    const row = document.createElement("div");
    row.className = "today-site-row";
    const name = document.createElement("span");
    name.className = "dom";
    name.textContent = site.domain;
    const use = document.createElement("span");
    use.className = "use";
    const minTxt = site.timeLimitMin > 0 ? `${min}m / ${site.timeLimitMin}m` : `${min}m`;
    const openTxt = site.openLimit > 0 ? `${opens} / ${site.openLimit} opens` : `${opens} open${opens === 1 ? "" : "s"}`;
    use.textContent = `${minTxt} · ${openTxt}`;
    row.append(name, use);
    box.appendChild(row);
  }
  if (!active.length) {
    const p = document.createElement("p");
    p.className = "card-sub";
    p.textContent = "No guarded-site activity yet today.";
    box.appendChild(p);
  }
}

// 30-day interruption bars + hour-of-day heat strip.
async function renderMonth() {
  const all = await getAllStats();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: todayKey(d), date: d, stat: all[todayKey(d)] });
  }
  let max = 1;
  days.forEach((d) => {
    if (d.stat) max = Math.max(max, d.stat.attempts);
  });

  const bars = $("#monthBars");
  bars.innerHTML = "";
  days.forEach((d) => {
    const col = document.createElement("div");
    col.className = "week-bar";
    const n = d.stat ? d.stat.attempts : 0;
    const bar = document.createElement("div");
    bar.className = "bar" + (n ? "" : " empty");
    bar.style.height = (n ? Math.max(6, (n / max) * 100) : 3) + "%";
    bar.title = `${d.key}: ${n} interruption${n === 1 ? "" : "s"}`;
    const lab = document.createElement("div");
    lab.className = "day";
    const dom = d.date.getDate();
    lab.textContent = dom === 1 || dom === 15 ? String(dom) : "";
    col.append(bar, lab);
    bars.appendChild(col);
  });

  const hours = new Array(24).fill(0);
  days.forEach((d) => {
    (d.stat?.opensByHour || []).forEach((n, h) => (hours[h] += n));
  });
  const hMax = Math.max(1, ...hours);
  const strip = $("#hourStrip");
  strip.innerHTML = "";
  hours.forEach((n, h) => {
    const cell = document.createElement("div");
    cell.className = "hour-cell";
    cell.style.opacity = n ? String(0.25 + 0.75 * (n / hMax)) : "0.08";
    cell.title = `${String(h).padStart(2, "0")}:00 — ${n} open${n === 1 ? "" : "s"}`;
    strip.appendChild(cell);
  });

  setupGuardHour(hours);
}

// Turn the weakest hour into a one-click strict schedule window. Hidden until
// there's enough signal, and once an equivalent window already exists.
function setupGuardHour(hours) {
  const btn = $("#guardHourBtn");
  const hour = peakHour(hours);
  const win = hour == null ? null : windowForHour(hour);
  if (hour == null || hasWindow(settings.schedule.windows, win)) {
    btn.classList.add("hidden");
    return;
  }
  const label = `${String(hour).padStart(2, "0")}:00`;
  btn.textContent = `Guard my weak hour (${label})`;
  btn.classList.remove("hidden");
  btn.onclick = async () => {
    settings.schedule.windows.push(win);
    settings.schedule.enabled = true;
    await persist();
    const en = $("#scheduleEnabled");
    if (en) en.checked = true;
    renderWindows();
    btn.classList.add("hidden");
  };
}

async function renderStats() {
  const all = await getAllStats();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    days.push({ key, label: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()], stat: all[key] });
  }

  let attempts = 0, dismissed = 0, continued = 0, max = 1;
  days.forEach((d) => {
    const s = d.stat;
    if (s) {
      attempts += s.attempts;
      dismissed += s.dismissed;
      continued += s.continued;
      max = Math.max(max, s.attempts);
    }
  });
  $("#wAttempts").textContent = attempts;
  $("#wDismissed").textContent = dismissed;
  const resolved = dismissed + continued;
  $("#wRate").textContent = (resolved ? Math.round((dismissed / resolved) * 100) : 0) + "%";

  const bars = $("#weekBars");
  bars.innerHTML = "";
  days.forEach((d) => {
    const col = document.createElement("div");
    col.className = "week-bar";
    const n = d.stat ? d.stat.attempts : 0;
    const bar = document.createElement("div");
    bar.className = "bar" + (n ? "" : " empty");
    bar.style.height = (n ? Math.max(6, (n / max) * 100) : 3) + "%";
    bar.title = `${n} interruption${n === 1 ? "" : "s"}`;
    const day = document.createElement("div");
    day.className = "day";
    day.textContent = d.label;
    col.append(bar, day);
    bars.appendChild(col);
  });
}

// Calm calendar — GitHub-style heatmap of calm days over the last 12 weeks.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function calTooltip(cell) {
  const d = new Date(cell.key + "T12:00:00");
  const date = `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (cell.state === "future") return date;
  if (cell.state === "pretrack") return `${date} — before tracking`;
  if (cell.opens === 0) return `${date} — no opens · calm`;
  const calm = cell.level > 0 ? "calm" : "limit reached";
  return `${date} — ${cell.opens} open${cell.opens === 1 ? "" : "s"} · ${cell.minutes}m · ${calm}`;
}

async function renderCalendar() {
  const all = await getAllStats();
  const cal = buildCalendar(all, settings, todayKey());

  const grid = $("#calGrid");
  grid.innerHTML = "";
  cal.weeks.forEach((col) => {
    const colEl = document.createElement("div");
    colEl.className = "cal-col";
    col.forEach((cell) => {
      const box = document.createElement("div");
      box.className = `cal-box cal-l${cell.level}` + (cell.state === "tracked" ? "" : ` cal-${cell.state}`);
      box.title = calTooltip(cell);
      colEl.appendChild(box);
    });
    grid.appendChild(colEl);
  });

  // Month labels: show a month name above the first column it appears in.
  const months = $("#calMonths");
  months.innerHTML = "";
  // Seed with the first column's month so the partial leftmost month isn't
  // labelled — avoids two month names crowding the start (GitHub does this).
  let lastMonth = cal.weeks.length ? new Date(cal.weeks[0][0].key + "T12:00:00").getMonth() : -1;
  cal.weeks.forEach((col) => {
    const m = new Date(col[0].key + "T12:00:00").getMonth();
    const lab = document.createElement("span");
    lab.textContent = m !== lastMonth ? MONTHS[m] : "";
    lastMonth = m;
    months.appendChild(lab);
  });
}

// ---- koala buddy --------------------------------------------------------------
function bindMascot() {
  const preview = () =>
    renderMascot($("#mascotPreview"), {
      mood: "cool",
      line: `Hi! I'm ${settings.mascot.name || DEFAULT_MASCOT_NAME}.`,
      name: settings.mascot.name
    });
  preview();

  const name = $("#mascotName");
  name.value = settings.mascot.name;
  name.addEventListener("change", () => {
    settings.mascot.name = name.value.trim() || DEFAULT_MASCOT_NAME;
    name.value = settings.mascot.name;
    preview();
    persist();
  });

  const en = $("#mascotEnabled");
  en.checked = settings.mascot.enabled;
  en.addEventListener("change", () => {
    settings.mascot.enabled = en.checked;
    persist();
  });

  const overlay = $("#mascotOverlayEnabled");
  overlay.checked = settings.mascot.overlayEnabled;
  overlay.addEventListener("change", () => {
    settings.mascot.overlayEnabled = overlay.checked;
    persist();
  });
}

// ---- disable friction --------------------------------------------------------
function bindDisableGate() {
  const phrase = $("#disablePhrase");
  phrase.value = settings.disablePhrase;
  phrase.addEventListener("change", () => {
    const v = phrase.value.trim();
    if (!v) {
      // An empty phrase would make the gate un-satisfiable — never allow it.
      phrase.value = settings.disablePhrase;
      return;
    }
    settings.disablePhrase = v;
    persist();
  });

  const mins = $("#disableMinutes");
  const out = $("#disableMinutesOut");
  const fmt = (v) => (Number(v) === 0 ? "off" : v + "m");
  mins.value = settings.disableMinutes;
  out.textContent = fmt(settings.disableMinutes);
  mins.addEventListener("input", () => (out.textContent = fmt(mins.value)));
  mins.addEventListener("change", () => {
    settings.disableMinutes = Number(mins.value);
    persist();
  });
}

// ---- init -------------------------------------------------------------------
async function init() {
  settings = await getSettings();
  applyTheme(settings.theme);

  const themeBtn = $("#themeToggle");
  const themeIcon = () => (themeBtn.textContent = settings.theme === "dark" ? "☀" : "☾");
  themeIcon();
  themeBtn.addEventListener("click", () => {
    settings.theme = settings.theme === "dark" ? "light" : "dark";
    applyTheme(settings.theme);
    themeIcon();
    persist();
  });

  // Master toggle weakens strict coverage — phrase-gated during strict hours.
  const master = $("#masterToggle");
  master.checked = settings.enabled;
  master.onchange = () => {
    // Re-enabling is frictionless and cancels any pending auto-re-enable.
    if (master.checked) {
      settings.enabled = true;
      settings.disabledUntil = 0;
      persist();
      return;
    }
    // Disabling always needs the typed phrase: the strict phrase during strict
    // hours, the disable phrase otherwise. Either way it's a temporary "off".
    const strict = strictActive(settings);
    confirmWithPhrase(
      strict ? settings.strictPhrase : settings.disablePhrase,
      () => {
        settings.enabled = false;
        settings.disabledUntil = reenableAt(Date.now(), settings.disableMinutes || 0);
        master.checked = false;
        persist();
      },
      strict
        ? { title: "Strict hours are active", body: "To turn protection off right now, type this exactly:" }
        : { title: "Turn protection off?", body: "Pause first. To turn it off, type this exactly:" }
    );
    master.checked = settings.enabled; // stay on until the phrase is confirmed
  };
  bindRange("pauseSeconds", "pauseSecondsOut", "pauseSeconds", "s");
  bindToggle("escalatePause", "escalatePause");
  bindRange("escalateStep", "escalateStepOut", "escalateStep", "s");
  bindRange("passDurationMin", "passDurationOut", "passDurationMin", "m");
  bindToggle("requireIntention", "requireIntention");
  bindToggle("showAlternatives", "showAlternatives");

  renderSites();
  bindFeeds();

  renderTags("intentionList", "intentions");
  renderTags("altList", "alternatives");
  bindAdder("addIntentionForm", "addIntentionInput", "intentions", "intentionList");
  bindAdder("addAltForm", "addAltInput", "alternatives", "altList");

  bindToggle("remindersEnabled", "remindersEnabled");
  bindRange("reminderEveryMin", "reminderEveryOut", "reminderEveryMin", "m");
  bindReminderText();

  bindBudget();
  bindSchedule();
  bindRecap();
  bindMascot();
  bindDisableGate();

  await renderToday();
  await renderStats();
  await renderMonth();
  await renderCalendar();
}

bindPhraseModal();
init();
