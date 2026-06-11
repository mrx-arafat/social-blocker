import { getSettings, saveSettings, normalizeDomain } from "./src/storage.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let settings;
let step = 0;

function showStep(n) {
  step = n;
  $$(".step").forEach((s, i) => s.classList.toggle("hidden", i !== n));
  $$(".dot").forEach((d, i) => d.classList.toggle("active", i === n));
  $("#nextBtn").textContent = n === 2 ? "Finish" : "Next";
}

function renderSiteChecks() {
  const box = $("#siteChecks");
  box.innerHTML = "";
  settings.sites.forEach((site) => {
    const lab = document.createElement("label");
    lab.className = "site-check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = site.enabled;
    cb.addEventListener("change", () => {
      site.enabled = cb.checked;
      saveSettings(settings);
    });
    const span = document.createElement("span");
    span.textContent = site.domain;
    lab.append(cb, span);
    box.appendChild(lab);
  });
}

$("#addSiteForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#addSiteInput");
  const domain = normalizeDomain(input.value);
  input.value = "";
  if (!domain || settings.sites.some((s) => s.domain === domain)) return;
  settings.sites.push({ domain, enabled: true, openLimit: 0, timeLimitMin: 0 });
  saveSettings(settings);
  renderSiteChecks();
});

$("#workHours").addEventListener("change", (e) => {
  if (e.target.checked) {
    settings.schedule.enabled = true;
    if (!settings.schedule.windows.length) {
      settings.schedule.windows.push({
        days: [1, 2, 3, 4, 5],
        start: "09:00",
        end: "17:00",
        mode: "strict"
      });
    }
  } else {
    settings.schedule.enabled = false;
  }
  saveSettings(settings);
});

const range = $("#budgetRange");
const out = $("#budgetOut");
const fmt = (v) => (Number(v) === 0 ? "off" : v + "m");
range.addEventListener("input", () => (out.textContent = fmt(range.value)));
range.addEventListener("change", () => {
  settings.budgetMinutes = Number(range.value);
  saveSettings(settings);
});

function finish() {
  window.close();
  setTimeout(() => location.replace("about:blank"), 120);
}

$("#nextBtn").addEventListener("click", () => {
  if (step < 2) showStep(step + 1);
  else finish();
});
$("#skipBtn").addEventListener("click", finish);

async function init() {
  settings = await getSettings();
  range.value = settings.budgetMinutes;
  out.textContent = fmt(settings.budgetMinutes);
  $("#workHours").checked = settings.schedule.enabled;
  renderSiteChecks();
  showStep(0);
}

init();
