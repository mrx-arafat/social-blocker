// Schedule → guard-mode resolution. Pure; `now` injected for testability.
// Modes: "normal" (breath + choice), "strict" (no continue), "off" (no guard).

const HM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function toMin(hm) {
  const m = HM.exec(hm || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function windowValid(w) {
  return !!w && Array.isArray(w.days) && w.days.length > 0 &&
    toMin(w.start) != null && toMin(w.end) != null &&
    ["normal", "strict", "off"].includes(w.mode);
}

// Does window w cover this (day, minutes)? start > end spans midnight:
// tonight's leg counts on the window's own days, the early-morning tail
// counts on the day after.
function covers(w, day, minutes) {
  const s = toMin(w.start), e = toMin(w.end);
  if (s <= e) return w.days.includes(day) && minutes >= s && minutes < e;
  if (w.days.includes(day) && minutes >= s) return true;
  const prev = (day + 6) % 7;
  return w.days.includes(prev) && minutes < e;
}

// settings needs: schedule {enabled, defaultMode, windows[]}, strictUntil.
export function resolveMode(settings, now = new Date()) {
  if ((settings.strictUntil || 0) > now.getTime()) return "strict";
  const sch = settings.schedule || {};
  if (!sch.enabled) return "normal";
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const w of sch.windows || []) {
    if (windowValid(w) && covers(w, day, minutes)) return w.mode;
  }
  return sch.defaultMode === "off" ? "off" : "normal";
}

// Is any strict source active right now? (gates weakening settings changes)
export function strictActive(settings, now = new Date()) {
  return resolveMode(settings, now) === "strict";
}
