// Calm-day streaks + session-length estimates. Pure functions over stats.

// A day is "calm" when no daily limit wall was hit and total guarded time
// stayed under the global budget (budgetMinutes 0 = budget check off).
// A missing record means zero opens — calm by definition.
export function dayQualifies(day, { budgetMinutes, sites }) {
  if (!day) return true;
  for (const s of sites || []) {
    if (s.openLimit > 0 && (day.opens?.[s.domain] || 0) >= s.openLimit) return false;
    if (s.timeLimitMin > 0 && (day.time?.[s.domain] || 0) / 60 >= s.timeLimitMin) return false;
  }
  if (budgetMinutes > 0) {
    const totalSec = Object.values(day.time || {}).reduce((a, b) => a + b, 0);
    if (totalSec / 60 >= budgetMinutes) return false;
  }
  return true;
}

function shiftDate(key, delta) {
  const d = new Date(key + "T12:00:00"); // noon avoids DST edge cases
  d.setDate(d.getDate() + delta);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function prevDate(key) {
  return shiftDate(key, -1);
}

function nextDate(key) {
  return shiftDate(key, 1);
}

// Judge every day after lastProcessedDate up to (excluding) todayKey.
// Idempotent: re-running with the same inputs is a no-op. First run starts
// counting from today rather than judging unbounded history.
export function rollStreak(allStats, streak, settings, todayKey) {
  const out = { ...streak };
  if (!out.lastProcessedDate) {
    out.lastProcessedDate = prevDate(todayKey);
    return out;
  }
  for (let k = nextDate(out.lastProcessedDate); k < todayKey; k = nextDate(k)) {
    out.current = dayQualifies(allStats[k], settings) ? out.current + 1 : 0;
    out.best = Math.max(out.best, out.current);
    out.lastProcessedDate = k;
  }
  return out;
}

// Median minutes-per-open for a domain across recorded days; fallback 15
// until there are at least 5 informative days.
export function medianSessionMin(allStats, domain) {
  const samples = [];
  for (const day of Object.values(allStats || {})) {
    const opens = day.opens?.[domain] || 0;
    const sec = day.time?.[domain] || 0;
    if (opens > 0 && sec > 0) samples.push(sec / 60 / opens);
  }
  if (samples.length < 5) return 15;
  samples.sort((a, b) => a - b);
  const mid = Math.floor(samples.length / 2);
  const med = samples.length % 2 ? samples[mid] : (samples[mid - 1] + samples[mid]) / 2;
  return Math.round(med);
}
