# Social Blocker v2.0 — Design Spec

Date: 2026-06-11
Status: Approved by user (design dialogue), pending spec review
Approach: Phased single release — foundation → psychology → polish. Vanilla JS, MV3, no build step, 100% local.

## Goals

1. **Harder blocking** — eliminate the redirect race so the site never flashes before the pause screen.
2. **Smarter friction** — schedules, strict mode with typed-phrase unlock.
3. **Psychology layer** — streaks, time reclaimed, persuasive cost-framing messages, weekly recap. The extension should actively remind the user, with their own data, that the scroll is not worth their time — without triggering reactance.
4. **Better insights** — 30-day stats, per-site breakdowns, trigger-hour insight, and **today's stats shown properly** (clear, accurate daily numbers in popup and options).
5. **Polish** — popup v2, onboarding, dark mode, pause-screen refresh.

Non-goals: accounts, sync, telemetry, build tooling, per-site schedules, mobile.

---

## 1. Blocking foundation (declarativeNetRequest)

**Problem:** `webNavigation.onBeforeNavigate` + `tabs.update` redirect is best-effort; MV3 worker wake-up can lose the race and the site flashes.

**Design:**

- Add `declarativeNetRequest` permission to `manifest.json`.
- On worker startup and on any guarded-site/settings change, install **session-scoped dynamic rules** (`chrome.declarativeNetRequest.updateSessionRules`), one per guarded+enabled site:
  - `regexFilter`: `^https?://([^/]*\.)?<domain>(/.*)?$` (main_frame only)
  - `action`: redirect with `regexSubstitution` to `chrome-extension://<id>/pause.html?to=\0` — the full original URL rides along.
- **Pass granted** → remove that site's rule; schedule an alarm at pass expiry to re-install it.
- **Mode `off`** (master toggle, schedule window, or site disabled) → rule absent.
- Session rules clear on browser restart — matches existing pass semantics (passes live in `chrome.storage.session`).
- Rule IDs: stable hash-free mapping — keep a `domain → ruleId` map in session storage; allocate sequential IDs.
- `webNavigation` listener **stays** as (a) fallback if rule install failed, (b) the stats recorder for interruptions.

**Error handling:** `updateSessionRules` rejection → `console.warn`, fallback path still blocks via webNavigation. Never throw out of the worker's top level.

## 2. Schedules

- New settings shape:
  ```js
  schedule: {
    enabled: false,
    defaultMode: 'normal',        // mode outside all windows: 'normal' | 'off'
    windows: []                   // [{ days: [1,2,3,4,5], start: '09:00', end: '17:00', mode: 'strict' }]
  }
  ```
- Modes: `normal` (breath + choice), `strict` (no Continue), `off` (no guarding).
- Resolution: at every block decision (DNR rule sync + pause page render), find the first window containing now (`day`, `HH:MM` local); its mode wins. Overlaps: first match in list order. Outside all windows → `defaultMode`.
- Windows that cross midnight (`start > end`) span into the next day.
- Mode changes re-sync DNR rules via a 1-minute alarm tick (already exists for time sampling) — a schedule boundary takes effect within ≤1 min.
- Malformed window (bad time string, empty days) → ignored, treated as absent.
- Options UI: list of windows, each row = day checkboxes + start/end time inputs + mode select + delete. "Add window" button. Keep it a flat list — no calendar grid.

## 3. Strict mode

- During a strict window the pause screen shows: breath animation + persuasive message + **only** "step away". No Continue button, no intention input.
- Direct URL hits while strict → same pause screen (DNR rule still redirects; pause page resolves mode and renders strict variant).
- **Typed-phrase unlock:** while a strict window is currently active, any settings change that weakens strict coverage (disabling schedule, disabling strict window, removing a guarded site, master toggle off) requires typing the phrase exactly: `I choose to give this hour away`. Paste is blocked (`onpaste` prevented). Outside active strict windows, settings edit freely.
- Popup gets a **"Strict now — 1h"** button: creates a temporary strict window for the next 60 min (stored as `strictUntil` timestamp, checked alongside schedule windows). Turning it off early requires the phrase.

## 4. Psychology layer

### 4.1 Streaks

- **Calm day** = (no daily limit wall was hit) AND (total guarded-site minutes that day < `budgetMinutes`).
- `budgetMinutes`: new global setting, default 45, `0` = budget check disabled (then calm day = no wall hit).
- State: `streak: { current, best, lastQualifiedDate }` in `chrome.storage.local`.
- Computed **lazily**: on the first recorded event after local midnight, yesterday is evaluated; missed days (browser closed) count as calm if they had zero recorded opens.
- Shown: popup (flame + count), pause screen ("5-day calm streak — continuing may end it"), recap.

### 4.2 Time reclaimed

- Every **step-away** credits the user's **median session length** for that site (sessions = continue→last-activity spans already derivable from minute sampling; fallback 15 min when < 5 sessions of history).
- `reclaimed: { totalMin }` accumulates forever (display formats as h/m).
- Shown: popup, pause screen ("You've reclaimed 6h 20m this month"), recap.

### 4.3 Persuasive messages (pause screen)

- A template library (~15 lines) filled with live data; one chosen per pause by fixed priority — streak-at-risk > trigger-hour match > 3rd-or-later visit today > weekly cost (if > 2h) > reclaimed — falling back to random among data-eligible templates:
  - visit count: "3rd visit today — 38 min so far."
  - weekly cost: "This week: 4h 12m here. That's a movie and a walk."
  - streak risk: "5-day calm streak. Continuing ends today's."
  - reclaimed: "You've stepped away 12 times this week — about 3h reclaimed."
  - trigger hour: "9 PM is your weakest hour. It's 9:04 PM."
- Tone rules: factual, second person, cost-framing, never shaming, never "you failed". Reactance-safe: the message informs, the choice stays.
- Templates with insufficient data (e.g. < 1 week history) are excluded from rotation.

### 4.4 Weekly recap

- Settings: `recap: { enabled: true, day: 0, hour: 19 }` (Sunday 7 PM default).
- Weekly `chrome.alarms` → notification → click opens `recap.html`:
  - week total vs previous week (delta, colored),
  - per-day bar chart,
  - per-site top 3,
  - worst trigger hour,
  - step-away rate,
  - streak status,
  - one reflective question rotated from a small list ("What did the best day this week have in common?").
- Recap reads from the 30-day stats store; nothing extra persisted except `lastRecapShown`.

## 5. Stats upgrade

- Daily per-site stats retained **30 days** (currently 7); pruning on the existing midnight/lazy rollover.
- Per-day record gains **hour buckets**: `opensByHour: number[24]` (increment on continue). Powers trigger-hour insight.
- **Daily stats shown properly** (user-requested fix):
  - **Popup**: today's per-site rows — site name, minutes used / limit, opens used / limit — accurate to the last minute sample, plus interruptions / step-aways / resisted-rate as now.
  - **Options**: today's section pinned above the 7-day summary; 30-day trend chart; per-site breakdown table; trigger-hour heat strip (24 cells).
  - All "today" reads resolve through one shared helper (`getTodayStats()` in `src/storage.js`) so popup, options, pause, and recap can never disagree.

## 6. Polish

- **Popup v2**: master toggle, streak flame, time reclaimed, today's per-site stats (above), "Strict now — 1h", settings link. No scroll beyond ~480px.
- **Onboarding**: `onboarding.html` opened once on `runtime.onInstalled` (install reason only, not update): 3 skippable steps — pick guarded sites → set schedule (optional) → set daily budget. Writes the same settings object.
- **Dark mode**: `prefers-color-scheme: dark` support in all CSS files via custom properties (one shared `:root` palette per file, no framework).
- **Pause screen refresh**: cleaner layout, persuasive message slot, streak indicator, strict variant. Keeps the breathing ring as the centerpiece.

## 7. Data model (src/storage.js — added defaults)

```js
schedule: { enabled: false, defaultMode: 'normal', windows: [] },
strict:   { phrase: 'I choose to give this hour away' },
streak:   { current: 0, best: 0, lastQualifiedDate: null },
budgetMinutes: 45,
reclaimed: { totalMin: 0 },
recap:    { enabled: true, day: 0, hour: 19 },
strictUntil: 0
```

- Existing deep-merge-with-defaults handles migration; new keys appear with defaults on first read after update.
- Stats day record: `{ interruptions, continues, stepAways, minutesBySite, opensBySite, opensByHour }`.

## 8. New/changed files

```
manifest.json        + declarativeNetRequest permission; pause.html added to web_accessible_resources (required for DNR redirects to an extension page)
background.js        DNR rule sync, schedule/mode resolution, strictUntil, recap alarm, streak rollover
src/storage.js       new defaults, getTodayStats(), schedule resolver, streak logic, median session calc
src/messages.js      NEW — persuasive template library + picker
pause.html/.css/.js  strict variant, message slot, streak, refresh, dark mode
popup.html/.css/.js  v2 layout, per-site today stats, strict-now, dark mode
options.html/.css/.js schedule editor, budget, strict phrase gate, 30-day charts, dark mode
recap.html/.css/.js  NEW — weekly recap page
onboarding.html/.css/.js NEW — 3-step first-run
```

## 9. Error handling summary

| Failure | Behavior |
|---|---|
| DNR rule install fails | warn + webNavigation fallback blocks |
| Malformed schedule window | ignored; defaultMode applies |
| Storage read race at midnight | streak computed lazily, idempotent (keyed by date) |
| No history for median session | fallback 15 min |
| Notification permission revoked | recap alarm still fires; recap opens on next popup visit via badge |

## 10. Testing

- `node --check` every JS file (existing convention).
- Node harness with mocked `chrome.*` in-memory store (existing convention) covering: schedule mode resolution (incl. midnight-crossing windows, overlaps, malformed), streak qualification + lazy rollover + missed days, median session calc + fallback, message template selection/exclusion, DNR rule construction (regex, IDs, add/remove on pass), `getTodayStats()` consistency.
- Manual: load unpacked, hit each guarded site, verify no flash, strict window behavior, phrase gate, recap render.
- playwright-cli (session-isolated) smoke of `pause.html`, `recap.html`, `options.html`, `onboarding.html` rendered standalone with a stubbed `chrome` object.

## 11. Estimate

~900 added/changed lines. No dependencies, no build step, no new privacy surface (all local).
