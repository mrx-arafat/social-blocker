import { getSettings } from "./src/storage.js";

const params = new URLSearchParams(location.search);
const target = params.get("target") || "";
const domain = params.get("domain") || "this site";
const reason = params.get("reason") || ""; // "", "timeLimit"

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const el = {
  breathePhase: $("#breathePhase"),
  choicePhase: $("#choicePhase"),
  limitPhase: $("#limitPhase"),
  donePhase: $("#donePhase"),
  countdown: $("#countdown"),
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
  closeBtn: $("#closeBtn")
};

let settings;
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

function stepAway() {
  chrome.runtime.sendMessage({ type: "DISMISS" });
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
    location.replace(target);
  } else if (res && res.blocked) {
    showLimit(res.blocked, res.limit);
  } else {
    el.continueBtn.disabled = false;
    el.continueBtn.innerHTML = `Continue to <span class="domain-label">${domain}</span>`;
  }
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

async function init() {
  settings = await getSettings();

  // Time-limit interception skips the breath and goes straight to the wall.
  if (reason === "timeLimit") {
    const site = settings.sites.find((s) => s.domain === domain);
    showLimit("timeLimit", site ? site.timeLimitMin : "");
    el.limitLeaveBtn.addEventListener("click", closeTab);
    return;
  }

  buildIntentions();
  if (settings.showAlternatives) pickAlternative();
  else el.altBlock.classList.add("hidden");

  el.altRefresh.addEventListener("click", pickAlternative);
  el.continueBtn.addEventListener("click", onContinue);
  el.leaveBtn.addEventListener("click", stepAway);
  el.limitLeaveBtn.addEventListener("click", closeTab);
  el.closeBtn.addEventListener("click", closeTab);

  runBreathing(Math.max(2, settings.pauseSeconds || 8));
}

init();
