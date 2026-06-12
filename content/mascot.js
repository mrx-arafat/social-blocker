// Koala overlay content script (plain script — no ES modules in content
// scripts). Floats the mascot bottom-right on guarded sites inside a
// Shadow DOM so site CSS can't touch it. Mood logic lives in src/mascot.js,
// pulled in via dynamic import (web_accessible_resources).
//
// Injected programmatically by background.js on navigation to any guarded
// site (static manifest matches can't cover user-added domains).

(function () {
  // Background may inject more than once for the same document.
  if (window.__sbMascotInjected) return;
  window.__sbMascotInjected = true;

  const SETTINGS_KEY = "sb_settings";
  const STATS_KEY = "sb_stats";
  const BUBBLE_SHOW_DELAY_MS = 6000;
  const BUBBLE_HIDE_AFTER_MS = 14000;
  const BUBBLE_REPEAT_MS = 5 * 60 * 1000;

  const host = location.hostname.replace(/^www\./, "");
  let container = null;
  let shadow = null;
  let mascotMod = null;
  let bubbleTimer = null;
  let repeatTimer = null;

  function hostMatches(domain) {
    const d = domain.toLowerCase().replace(/^www\./, "");
    return host === d || host.endsWith("." + d);
  }

  function guardedDomain(settings) {
    const sites = Array.isArray(settings.sites) ? settings.sites : [];
    const hit = sites.find((s) => s.enabled && hostMatches(s.domain));
    return hit ? hit.domain : null;
  }

  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  const STYLE = `
    :host { all: initial; }
    .wrap {
      position: fixed; right: 18px; bottom: 18px; z-index: 2147483647;
      display: flex; flex-direction: column; align-items: flex-end;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      pointer-events: none;
      animation: rise .45s cubic-bezier(.34,1.56,.64,1) both;
    }
    .bubble {
      position: relative;
      max-width: 230px; margin-bottom: 10px; padding: 10px 14px;
      background: #fff; color: #333; font-size: 13px; line-height: 1.45;
      border: 1px solid rgba(0,0,0,.06);
      border-radius: 14px;
      box-shadow: 0 6px 20px rgba(0,0,0,.16);
      opacity: 0; transform: translateY(6px) scale(.96);
      transition: opacity .25s ease, transform .25s cubic-bezier(.34,1.56,.64,1);
    }
    .bubble::after {
      content: ""; position: absolute; bottom: -6px; right: 26px;
      width: 10px; height: 10px; background: #fff;
      border-right: 1px solid rgba(0,0,0,.06);
      border-bottom: 1px solid rgba(0,0,0,.06);
      transform: rotate(45deg);
    }
    .bubble.show { opacity: 1; transform: translateY(0) scale(1); }
    .koala {
      width: 76px; height: 76px; cursor: pointer; pointer-events: auto;
      filter: drop-shadow(0 3px 8px rgba(0,0,0,.28));
      transform-origin: 50% 90%;
      animation: breathe 3.4s ease-in-out infinite;
      transition: transform .15s ease;
    }
    .koala:hover { transform: scale(1.08) rotate(-3deg); }
    @keyframes breathe {
      0%, 100% { transform: scale(1) translateY(0); }
      50% { transform: scale(1.03) translateY(-2px); }
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .wrap, .koala, .bubble { animation: none; transition: none; }
    }
  `;

  function removeOverlay() {
    clearTimeout(bubbleTimer);
    clearTimeout(repeatTimer);
    if (container) container.remove();
    container = null;
    shadow = null;
  }

  async function minutesTodayFor(domain) {
    const got = await chrome.storage.local.get(STATS_KEY);
    const day = (got[STATS_KEY] || {})[todayKey()] || {};
    return Math.round(((day.time || {})[domain] || 0) / 60);
  }

  function showBubble(text) {
    if (!shadow) return;
    const bubble = shadow.querySelector(".bubble");
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove("show"), BUBBLE_HIDE_AFTER_MS);
  }

  async function speak(domain) {
    const minutesToday = await minutesTodayFor(domain);
    const ctx = { event: null, onSocialSite: true, streak: 0, minutesToday, domain };
    const mood = mascotMod.pickMood(ctx);
    const img = shadow.querySelector(".koala");
    if (img) img.src = chrome.runtime.getURL(mascotMod.MASCOT_ICONS[mood]);
    showBubble(mascotMod.mascotLine(mood, ctx));
    clearTimeout(repeatTimer);
    repeatTimer = setTimeout(() => speak(domain), BUBBLE_REPEAT_MS);
  }

  async function mountOverlay(settings, domain) {
    if (container) return;
    if (!mascotMod) {
      mascotMod = await import(chrome.runtime.getURL("src/mascot.js"));
    }
    container = document.createElement("div");
    container.id = "sb-mascot-host";
    shadow = container.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);

    const wrap = document.createElement("div");
    wrap.className = "wrap";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    wrap.appendChild(bubble);

    const img = document.createElement("img");
    img.className = "koala";
    img.alt = (settings.mascot && settings.mascot.name) || mascotMod.DEFAULT_MASCOT_NAME;
    img.title = img.alt;
    img.src = chrome.runtime.getURL(mascotMod.MASCOT_ICONS.angry);
    img.addEventListener("click", () => {
      const b = shadow.querySelector(".bubble");
      if (b.classList.contains("show")) b.classList.remove("show");
      else speak(domain);
    });
    wrap.appendChild(img);

    shadow.appendChild(wrap);
    (document.body || document.documentElement).appendChild(container);

    bubbleTimer = setTimeout(() => speak(domain), BUBBLE_SHOW_DELAY_MS);
  }

  function apply(settings) {
    const mascot = settings.mascot || {};
    const domain = guardedDomain(settings);
    const wanted =
      settings.enabled !== false &&
      mascot.enabled !== false &&
      mascot.overlayEnabled !== false &&
      domain;
    if (wanted) mountOverlay(settings, domain);
    else removeOverlay();
  }

  function load() {
    chrome.storage.local.get(SETTINGS_KEY, (got) => {
      apply(got[SETTINGS_KEY] || {});
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[SETTINGS_KEY]) {
      apply(changes[SETTINGS_KEY].newValue || {});
    }
  });

  if (document.body) load();
  else document.addEventListener("DOMContentLoaded", load);
})();
