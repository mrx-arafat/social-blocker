// Calm-day calendar heatmap (GitHub-style). Pure functions over stats — no
// chrome deps, so the options page feeds in allStats + settings and renders the
// returned grid. Brighter box = calmer day; an empty box = a day a limit wall
// was hit. Color reuses the existing dayQualifies judgement from streak.js.

import { dayQualifies } from "./streak.js";

function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftKey(key, delta) {
  const d = new Date(key + "T12:00:00"); // noon avoids DST edge cases
  d.setDate(d.getDate() + delta);
  return keyOf(d);
}

function dowOf(key) {
  return new Date(key + "T12:00:00").getDay(); // 0 = Sunday
}

function totalOpens(day) {
  return day ? Object.values(day.opens || {}).reduce((a, b) => a + b, 0) : 0;
}

function totalMinutes(day) {
  if (!day) return 0;
  return Math.round(Object.values(day.time || {}).reduce((a, b) => a + b, 0) / 60);
}

// Map one day's record to a shade 0..4. A day that hit a wall / blew the budget
// is 0 (empty, like GitHub's no-activity gray); a perfectly calm zero-open day
// is the brightest. Lighter usage between those reads brighter.
export function gradeDay(day, settings) {
  if (!dayQualifies(day, settings)) return 0;
  const opens = totalOpens(day);
  if (opens === 0) return 4;
  if (opens <= 2) return 3;
  if (opens <= 5) return 2;
  return 1;
}

// Build a weeks-wide grid (each column = one Sun..Sat week, oldest first) ending
// with the week containing `today` (a YYYY-MM-DD key). Cell state:
//   future   — after today, not yet happened
//   pretrack — before the first day we have any record for (extension not yet
//              tracking); rendered empty so pre-install days don't fake green
//   tracked  — graded normally (absent record = calm zero-open day = brightest)
export function buildCalendar(allStats, settings, today, weeks = 12) {
  const keys = Object.keys(allStats || {});
  const trackingStart = keys.length ? keys.slice().sort()[0] : today;
  const startKey = shiftKey(today, -dowOf(today) - (weeks - 1) * 7);

  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const key = shiftKey(startKey, w * 7 + r);
      let state, level = 0, day = null;
      if (key > today) {
        state = "future";
      } else if (key < trackingStart) {
        state = "pretrack";
      } else {
        state = "tracked";
        day = (allStats && allStats[key]) || null;
        level = gradeDay(day, settings);
      }
      col.push({
        key,
        dow: r,
        state,
        level,
        opens: totalOpens(day),
        minutes: totalMinutes(day)
      });
    }
    cols.push(col);
  }
  return { weeks: cols, trackingStart };
}
