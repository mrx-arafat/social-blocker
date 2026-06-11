<div align="center">

# Social Blocker

**Pause before you scroll.**

A Chrome (Manifest V3) extension that puts a conscious breath, an intention, and
a real choice between you and distracting websites — instead of a brittle wall
you'll just fight or switch off.

`MV3` · `vanilla JS, no build step` · `100% local, no tracking` · `MIT`

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

### Schedules & strict mode *(v2)*
Time windows per weekday set the guard level: **normal** (breath + choice),
**strict** (no Continue at all — the only way through is stepping away), or
**off**. Weakening strict protection *while a strict window is active* requires
typing an unlock phrase (paste blocked). The popup has a **"Strict now — 1h"**
panic button.

### Streaks & time reclaimed *(v2)*
- A **calm day** = no limit wall hit and total guarded time under your daily
  budget. Consecutive calm days build a streak (popup, pause screen, recap).
- Every step-away credits your **median session length** back to a running
  "time reclaimed" total — resisting becomes visible progress, not a void.

### Persuasive pause messages *(v2)*
The pause screen confronts you with your own numbers, by priority: streak at
risk → your statistically weakest hour → repeat visits today → weekly cost
("4h 12m here this week — that's a movie and a walk") → reflection prompts.
Factual, never shaming — nothing to rebel against.

### Weekly recap *(v2)*
Once a week a notification opens a recap page: total vs last week, day-by-day
chart, top sites, weakest hour, step-away rate, streak — and one reflective
question.

### Reminders
Optional periodic notification — a gentle nudge to check in with yourself.

### Stats
- **Popup** — today's interruptions, step-aways, "resisted" rate, streak,
  time reclaimed, and per-site minutes/opens against their limits.
- **Settings** — a **Today** card (same numbers as the popup, by construction),
  last 7 days summary, 30-day trend, and an opens-by-hour heat strip.

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
| Master toggle | Turns the whole extension on/off |
| Breathing time | Base length of the forced breath (3–30s) |
| Escalating pause | Grow the breath on each reopen of the same site today |
| Added per reopen | Seconds added per prior open (0–20s) |
| Re-prompt after | How long a granted pass lasts (1–60 min) |
| Ask for an intention | Require naming a reason before continuing |
| Suggest an alternative | Show an alternative activity |
| Guarded sites | Add/remove sites; set per-site open & time limits |
| Feed blocking | Toggle Reels / Shorts / For-you hiding |
| Intentions / Alternatives | Edit the suggestion lists |
| Reminders | Enable, set cadence and message |

All changes save instantly.

---

## How it works (architecture)

- A `webNavigation.onBeforeNavigate` listener in the background service worker
  watches top-frame navigations. If the host matches a guarded site and there's
  no active pass, it redirects the tab to `pause.html` and records the
  interruption.
- The pause screen reads today's open count to compute the **escalating breath**,
  then on **Continue** asks the worker to grant a time-boxed **pass** (kept in
  `chrome.storage.session`, so it clears on browser restart) and increments the
  open count.
- A 1-minute `alarms` tick samples the active, **non-idle** tab to accumulate
  time-on-site and enforce the daily time limit.
- A content script (`content/feeds.js`) toggles classes on `<html>` so CSS can
  hide feed surfaces, and redirects dedicated Reels/Shorts pages.

All state lives in `chrome.storage.local` / `session`.

---

## Permissions

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Save settings and stats locally |
| `webNavigation` | Detect when you open a guarded site |
| `tabs` | Redirect the tab to the pause screen |
| `alarms` | Minute timer (time limits) and reminders |
| `notifications` | Reminder nudges |
| `idle` | Don't count time-on-site while you're away |
| `<all_urls>` | Match any site you add to your guarded list |

---

## Privacy

**Nothing leaves your device.** No servers, no analytics, no accounts, no
tracking. Settings and counters are stored only in your browser and are removed
if you uninstall. Full text: [`PRIVACY.md`](./PRIVACY.md).

---

## Project layout

```
social-blocker/
├── manifest.json            # MV3 manifest
├── background.js            # nav intercept, passes, limits, reminders, time sampling
├── src/
│   └── storage.js           # defaults + storage helpers (shared ES module)
├── pause.html / .css / .js  # breathing + choice screen (escalating)
├── popup.html / .css / .js  # quick toggle + today's stats
├── options.html / .css / .js# full settings, site list, feeds, stats
├── content/
│   ├── feeds.js             # feed-blocking content script
│   └── feeds.css            # feed-hide rules
├── icons/                   # 16 / 48 / 128 px
├── PRIVACY.md
└── README.md
```

---

## Development

No build, no dependencies — edit and reload.

Syntax check everything:

```bash
for f in background.js pause.js popup.js options.js src/storage.js content/feeds.js; do
  node --check "$f"
done
```

The decision logic (`src/storage.js` — domain matching, settings merge, stats)
is plain and can be exercised in Node by mocking the `chrome.*` APIs with an
in-memory store. The same approach drives the whole `background.js` flow
(intercept → continue → reopen) to verify blocking and the escalating breath.

### Packaging for the Chrome Web Store

```bash
zip -rq social-blocker.zip . -x '.git/*' '.gitignore' '*.DS_Store'
```

`manifest.json` must sit at the root of the zip (it does). Bump `version` in
`manifest.json` before each store resubmission.

---

## Roadmap & known limits

- **Blocking is browser-enforced** (v2): `declarativeNetRequest` session rules
  redirect guarded sites before the page loads — no service-worker race, no
  flash. The `webNavigation` listener remains as a fallback if rule install
  ever fails.
- **Feed selectors are best-effort** and may need updates as sites change markup.
- **Safari / iPad:** this MV3 core can be wrapped as a Safari Web Extension via
  Xcode without rewriting the logic.

---

## License

[MIT](./LICENSE) — do what you like.
