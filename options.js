import {
  getSettings,
  saveSettings,
  getAllStats,
  todayKey,
  normalizeDomain,
  DEFAULTS
} from "./src/storage.js";

const $ = (s) => document.querySelector(s);
let settings;

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
    cb.style.accentColor = "#000";
    cb.addEventListener("change", () => {
      site.enabled = cb.checked;
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

    // remove
    const rm = document.createElement("button");
    rm.className = "icon-btn";
    rm.textContent = "×";
    rm.title = "Remove";
    rm.addEventListener("click", () => {
      settings.sites.splice(i, 1);
      persist();
      renderSites();
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
  settings.sites.push({ domain, enabled: true, openLimit: 0, timeLimitMin: 0 });
  input.value = "";
  persist();
  renderSites();
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

// ---- init -------------------------------------------------------------------
async function init() {
  settings = await getSettings();

  bindToggle("masterToggle", "enabled");
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

  await renderStats();
}

init();
