// Friction for turning Social Blocker off. Disabling is the one action the
// impulsive part of us wants in the moment, so we make it deliberate: the user
// must hand-type a reflective phrase (paste blocked at the UI layer), and the
// "off" state is only ever temporary — it heals itself after a timeout.
//
// Pure helpers only — no DOM, no chrome APIs — so they're unit-testable and
// shared by the popup, the options page, and the background worker.

const norm = (s) => (s || "").trim().toLowerCase();

// True when typed input matches the target phrase (trimmed, case-insensitive).
// An empty target can never match, so a blank setting can't accidentally
// auto-confirm the gate.
export function phraseMatches(input, phrase) {
  const target = norm(phrase);
  if (!target) return false;
  return norm(input) === target;
}

// Timestamp (ms) at which a temporary disable should auto-re-enable.
// minutes <= 0 means "indefinite" → 0 (no scheduled re-enable).
export function reenableAt(nowMs, minutes) {
  return minutes > 0 ? nowMs + minutes * 60000 : 0;
}

// Whether a disabled blocker has served its timeout and should switch back on.
export function shouldAutoReenable(settings, nowMs) {
  return (
    !settings.enabled &&
    settings.disabledUntil > 0 &&
    nowMs >= settings.disabledUntil
  );
}

// Milliseconds left on a temporary disable (0 when expired or indefinite).
export function disableRemainingMs(settings, nowMs) {
  if (!settings.disabledUntil) return 0;
  return Math.max(0, settings.disabledUntil - nowMs);
}
