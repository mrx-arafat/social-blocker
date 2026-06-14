// Pure helpers for behavioural-nudge features. No chrome deps — fed plain data
// by the pages so they stay unit-testable.

// Reason Replay: mirror the user's own last intention for a domain back at them
// on the pause screen, with the typical time it costs. Returns null when there's
// nothing to replay (first-ever visit, or no intention recorded).
export function replayLine(last, medianMin) {
  if (!last || !last.text) return null;
  const text = String(last.text).trim();
  if (!text) return null;
  const cost = Number(medianMin) > 0 ? ` — usually about ${Math.round(medianMin)}m` : "";
  return `Last time here: “${text}”${cost}`;
}

// Guard-my-weak-hour: the hour of day (0–23) you reach for guarded sites most,
// from an aggregated 24-slot opensByHour array. Returns null until there's
// enough signal (matches the recap's 5-open threshold) so we don't guard noise.
export function peakHour(hours, minTotal = 5) {
  if (!Array.isArray(hours) || hours.length !== 24) return null;
  const total = hours.reduce((a, b) => a + (b || 0), 0);
  if (total < minTotal) return null;
  let best = 0;
  for (let h = 1; h < 24; h++) if ((hours[h] || 0) > (hours[best] || 0)) best = h;
  return hours[best] > 0 ? best : null;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// A one-hour strict schedule window covering the given hour, every day.
// 23:00 wraps to "00:00" — schedule.covers() handles the midnight span.
export function windowForHour(hour) {
  return {
    days: [0, 1, 2, 3, 4, 5, 6],
    start: `${pad2(hour)}:00`,
    end: `${pad2((hour + 1) % 24)}:00`,
    mode: "strict"
  };
}

// True when an equivalent window already exists (same start/end/mode and at
// least the same days) — lets the button stay idempotent.
export function hasWindow(windows, win) {
  return (windows || []).some(
    (w) => w.start === win.start && w.end === win.end && w.mode === win.mode
  );
}
