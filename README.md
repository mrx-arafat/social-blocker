<div align="center">

# Social Blocker

**Pause before you scroll.**

A Chrome (Manifest V3) extension that puts a conscious breath, an intention, and
a real choice between you and distracting websites — instead of a brittle wall
you'll just fight or switch off.

`MV3` · `vanilla JS, no build step` · `100% local, no tracking` · `85 tests` · `MIT`

</div>

---

## Table of contents

- [Why it works this way](#why-it-works-this-way)
- [Features](#features)
- [How the daily limits actually work](#how-the-daily-limits-actually-work)
- [Install](#install)
- [Settings reference](#settings-reference)
- [How it works (architecture)](#how-it-works-architecture)
- [Permissions](#permissions)
- [Privacy](#privacy)
- [Project layout](#project-layout)
- [Development](#development)
- [Roadmap & known limits](#roadmap--known-limits)
- [License](#license)

---

## Why it works this way

Most "site blockers" slam a door: you hit a wall, feel controlled, and either
disable the extension or rebound harder. That's **psychological reactance**, and
it's why hard blocks fail over time.

Social Blocker is built on the opposite idea — **friction-based self-regulation**
(the approach behind apps like *one sec*):

- Interrupt the **impulse** with a forced breath.
- Make you **name a reason** (engages deliberate thinking).
- Make repeated opens progressively **tedious**, so the urge fades on its own.
- Reflect your own behaviour back at you — streaks, weak hours, reclaimed time.
- Always leave the choice with you — there's nothing to rebel against.

The hard daily limits are still there as optional backstops, but the
**escalating pause** does the real work.

---

## Features

### The pause
Visiting a guarded site redirects to a breathing screen:

1. **"Take a deep breath…"** — an animated ring and a countdown you can't skip.
2. **"Do you really need it now?"** — the moment of choice.
3. **Continue** to the site, or **step away**. Both outcomes are recorded.

### Escalating pause — the main deterrent
Each time you reopen the **same site on the same day**, the breath gets longer:

| Opens today | 0 | 1 | 2 | 3 | 5 | … |
|-------------|---|---|---|---|---|---|
| Breath (base 8s, +5s each) | 8s | 13s | 18s | 23s | 33s | up to 60s |

By the fourth or fifth return the wait is annoying enough that you quit on your
own. Base time, step, and cap are all configurable.

### Intentions
Before you can continue, name **why** you're opening it — pick a chip or add your
own. Naming the reason kills a surprising number of mindless opens.

### Reason Replay
The pause screen mirrors **your own last intention** for that site back at you,
with the time it usually costs — *"Last time here: 'just curious' — usually about
18m."* Seeing your last excuse is a strong nudge to step away.

### Alternatives
Offers something better to do instead — *"take a short walk", "drink water",
"message a friend who matters"*. Fully editable.

### Daily limits (optional backstops)
Per guarded site:

- **Opens / day** — cap how many real opens you get.
- **Minutes / day** — cap time on site. Time is sampled once a minute and
  **pauses while you're idle**, then bounces you to a "time's up" wall.

`0` = unlimited. See [exact semantics below](#how-the-daily-limits-actually-work).

### Feed blocking
Hides the most addictive infinite-scroll surfaces while keeping the rest of the
site usable:

- Instagram **Reels** (and redirects away from `/reels/`)
- YouTube **Shorts** (and redirects away from `/shorts/`)
- Facebook **Reels**
- X (Twitter) **"For you"** tab

### Schedules & strict mode
Time windows per weekday set the guard level: **normal** (breath + choice),
**strict** (no Continue at all — the only way through is stepping away), or
**off**. Weakening strict protection *while a strict window is active* requires
typing an unlock phrase (paste blocked). The popup has a **"Strict now — 1h"**
panic button.

### Guard my weak hour
The settings page learns the hour you reach for guarded sites most. One click
turns that hour into a daily **strict** schedule window — closing the loop from
insight to action.

### Streaks, the calm calendar & the time jar
- A **calm day** = no limit wall hit and total guarded time under your daily
  budget. Consecutive calm days build a streak (popup, pause screen, recap).
- A **calm calendar** — a GitHub-style 12-week heatmap on the settings page.
  Brighter squares are calmer days; an empty square is a day a limit wall was hit.
- Every step-away credits your **median session length** into a visible **time
  jar** — resisting becomes progress you can watch fill, not a void.

### Persuasive pause messages
The pause screen confronts you with your own numbers, by priority: streak at
risk → your statistically weakest hour → repeat visits today → weekly cost
("4h 12m here this week — that's a movie and a walk") → reflection prompts.
Factual, never shaming — nothing to rebel against.

### Weekly recap
Once a week a notification opens a recap page: total vs last week, day-by-day
chart, top sites, weakest hour, step-away rate, streak — and one reflective
question.

### Koala buddy
A small mascot, **Koby**, reacts to your behaviour across the extension pages —
and can optionally float on guarded sites as a gentle presence. Rename or disable
him in settings.

### Reminders
Optional periodic notification — a gentle nudge to check in with yourself.

### Light & dark theme
Clean light theme by default, with a dark-mode toggle in the header. Every
surface (popup, pause, settings, recap, onboarding) shares one tuned palette.

### Safety-first disable
Turning protection off is gated: you must hand-type a phrase (paste blocked), and
"off" **heals itself** after a configurable window — it's never a one-click escape
hatch you'll regret.

### Stats
- **Popup** — today's interruptions, step-aways, "resisted" rate, streak, the
  time jar, and per-site minutes/opens against their limits.
- **Settings** — a **Today** card (same numbers as the popup, by construction),
  last 7 days, 30-day trend, an opens-by-hour heat strip, and the calm calendar.

**Default guarded sites:** Instagram, Facebook, TikTok, X/Twitter, YouTube,
Reddit (Snapchat & LinkedIn are included but off by default). All editable.

---

## How the daily limits actually work

The behavior is intentional but not obvious — worth knowing so it doesn't
surprise you:

- **An open is counted only when you click _Continue_** and actually reach the
  site. Closing the breath screen or choosing *"I don't want to anymore"* is
  **free** — it never burns an open.
- After you continue, a **grace pass** (default 5 min) lets you browse and follow
  internal links **without re-prompting**. Reopening within that window is
  silently allowed.
- Once the pass expires, the **escalating pause** returns (longer each time), and
  if you've hit your **Opens/day** or **Minutes/day** cap you go straight to the
  limit wall — no breath, no continue — until **local midnight**, when counts
  reset.

Want every reopen to re-confront you sooner? Lower **Re-prompt after** to `1`
minute. Want maximum friction with no wall? Turn limits off and lean on the
escalating pause.

---

## Install

This is an unpacked extension (no build step required).

1. Clone or download this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder.
5. Pin the icon — click it for the popup, or **Settings** for everything.

After pulling new changes, return to `chrome://extensions` and click **↻ reload**
on the card.

Works in **Chrome, Edge, Brave, and Arc**.

---

## Settings reference

| Setting | What it controls |
|---------|------------------|
| Master toggle | Turns the whole extension on/off (typed-phrase gated, auto re-enables) |
| Theme | Light / dark for all extension pages |
| Breathing time | Base length of the forced breath |
| Escalating pause | Grow the breath on each reopen of the same site today |
| Added per reopen | Seconds added per prior open |
| Re-prompt after | How long a granted pass lasts (minutes) |
| Ask for an intention | Require naming a reason before continuing |
| Suggest an alternative | Show an alternative activity |
| Daily budget | Total guarded-site minutes/day before a day stops being "calm" |
| Guarded sites | Add/remove sites; set per-site open & time limits |
| Feed blocking | Toggle Reels / Shorts / For-you hiding |
| Schedules | Per-weekday windows: normal / strict / off |
| Intentions / Alternatives | Edit the suggestion lists |
| Koala buddy | Rename, enable, and toggle the on-site overlay |
| Reminders | Enable, set cadence and message |
| Weekly recap | Enable, choose day and hour |

All changes save instantly.

---

## How it works (architecture)

Vanilla JS, ES modules, no build step. State lives entirely in
`chrome.storage.local` (settings + stats) and `chrome.storage.session`
(short-lived passes).

- **Blocking is browser-enforced.** `declarativeNetRequest` session rules
  redirect guarded sites to `pause.html` *before* the page loads — no
  service-worker race, no flash of content. Rules are rebuilt from current state
  whenever settings, passes, or the schedule change.
- A `webNavigation.onBeforeNavigate` listener in the background service worker is
  the **fallback** if a DNR rule ever fails to install, and is the single point
  that records each interruption.
- The pause screen reads today's open count to compute the **escalating breath**,
  then on **Continue** asks the worker to grant a time-boxed **pass** (in
  `chrome.storage.session`, so it clears on browser restart) and increments the
  open count.
- A 1-minute `alarms` tick samples the active, **non-idle** tab to accumulate
  time-on-site, enforce the daily time limit, and roll the calm-day streak.
- The koala overlay is injected with `scripting` on committed navigations to
  guarded sites (static content scripts can't match user-added domains).
- A content script (`content/feeds.js`) toggles classes on `<html>` so CSS can
  hide feed surfaces, and redirects dedicated Reels/Shorts pages.

Pure decision logic lives in small ES modules under `src/` so it can be unit
tested in Node with an in-memory `chrome.*` mock.

---

## Permissions

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Save settings and stats locally |
| `declarativeNetRequest` | Redirect guarded sites to the pause screen before they load |
| `webNavigation` | Fallback detection + single interruption-counting point |
| `tabs` | Redirect the tab to the pause / limit screen |
| `scripting` | Inject the koala overlay on guarded sites you add yourself |
| `alarms` | Minute timer (time limits, streak roll) and reminders |
| `notifications` | Reminder nudges and the weekly recap |
| `idle` | Don't count time-on-site while you're away |
| `<all_urls>` | Match any site you add to your guarded list |

---

## Privacy

**Nothing leaves your device.** No servers, no analytics, no accounts, no
tracking — there are no network calls anywhere in the code. Settings and counters
are stored only in your browser and are removed if you uninstall. Full text:
[`PRIVACY.md`](./PRIVACY.md).

---

## Project layout

```
social-blocker/
├── manifest.json             # MV3 manifest
├── background.js             # DNR sync, nav intercept, passes, limits, reminders, time/streak sampling
├── theme.css                 # shared polish layer (tokens, depth, focus, motion) — loaded first
├── mascot.css                # koala buddy styles
├── src/                      # pure ES modules (unit-tested)
│   ├── storage.js            #   defaults + storage helpers, domain matching
│   ├── rules.js              #   declarativeNetRequest rule construction
│   ├── schedule.js           #   schedule window → guard-mode resolution
│   ├── streak.js             #   calm-day streak + median session length
│   ├── calendar.js           #   calm-day heatmap grid + day grading
│   ├── insights.js           #   reason replay, weak-hour, schedule-window helpers
│   ├── messages.js           #   persuasive pause-message selection
│   ├── disable-gate.js       #   typed-phrase disable + auto re-enable
│   ├── mascot.js             #   koala mood + line selection
│   └── theme.js              #   apply light/dark theme
├── pause.html / .css / .js   # breathing + choice screen (escalating, reason replay)
├── popup.html / .css / .js   # quick toggle, streak, time jar, today's stats
├── options.html / .css / .js # full settings, sites, feeds, schedules, calendar, stats
├── recap.html / .css / .js   # weekly recap page
├── onboarding.html / .css / .js  # first-run setup
├── content/
│   ├── feeds.js / feeds.css  # feed-blocking content script + hide rules
│   └── mascot.js             # injected koala overlay
├── tests/                    # node --test suites + in-memory chrome mock
├── icons/                    # 16 / 48 / 128 px + mascot SVGs
├── PRIVACY.md
└── README.md
```

---

## Development

No build, no dependencies — edit and reload the unpacked extension.

**Run the test suite** (85 tests, Node's built-in runner — no install needed):

```bash
node --test tests/*.mjs
```

The pure modules in `src/` are tested directly; storage and the full
`background.js` flow are exercised through an in-memory `chrome.*` mock
(`tests/mock-chrome.mjs`). Each module has a matching `tests/<name>.test.mjs`.

**Syntax-check everything:**

```bash
for f in *.js src/*.js content/*.js; do node --check "$f"; done
```

### Packaging for the Chrome Web Store

```bash
zip -rq social-blocker.zip . -x '.git/*' '.gitignore' 'tests/*' '*.DS_Store'
```

`manifest.json` must sit at the root of the zip (it does). Bump `version` in
`manifest.json` before each store resubmission.

---

## Roadmap & known limits

- **Feed selectors are best-effort** and may need updates as sites change markup.
- **Time-on-site is sampled from the focused window only** — a guarded site left
  open in an unfocused window doesn't accrue time toward its limit.
- **Safari / iPad:** this MV3 core can be wrapped as a Safari Web Extension via
  Xcode without rewriting the logic.

---

## License

[MIT](./LICENSE) — do what you like.
