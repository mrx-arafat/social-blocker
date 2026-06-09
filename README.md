# Social Blocker

A Chrome (Manifest V3) extension that puts a conscious **pause** between you and
distracting sites. Before a social feed loads, you take a breath, name your
intention, and make a real choice — continue, or step away.

A web port of the "one sec / Ascent" idea, in a clean black-and-white theme.

---

## Why

Most "site blockers" just slam a door. Social Blocker does something gentler and
more effective: it interrupts the reflex, makes you breathe, and asks _"do you
really need it now?"_ — turning an automatic open into a conscious decision.

---

## Features

### The pause
Visiting a guarded site redirects to a breathing screen:

1. **"Take a deep breath…"** — an animated ring and a countdown you can't skip.
2. **"Do you really need it now?"** — the moment of choice.
3. **Continue** to the site, or **step away**. Both outcomes are tracked.

### Escalating pause (the main deterrent)
Each time you reopen the same site **today**, the breath gets longer
(e.g. 8s → 13s → 18s …, capped at 60s). Repeated opens become tedious, so the
impulse fades on its own — without a hard wall that just provokes you to fight
or disable the tool. Tunable in settings.

### Intentions
Before you can continue, name _why_ you're opening it (pick a chip or add your
own). Naming the reason kills a surprising number of mindless opens.

### Alternatives
Offers something better to do instead — "take a short walk", "drink water",
"message a friend who matters". Fully editable.

### Daily limits
Per guarded site:
- **Opens / day** — cap how many times you can open it.
- **Minutes / day** — cap time on site. Time is sampled once a minute and
  **pauses while you're idle**, then bounces you to a "time's up" wall when hit.

`0` means unlimited.

### Feed blocking
Hides the most addictive infinite-scroll surfaces while keeping the rest of the
site usable:
- Instagram **Reels** (+ redirects away from `/reels/`)
- YouTube **Shorts** (+ redirects away from `/shorts/`)
- Facebook **Reels**
- X (Twitter) **"For you"** tab

### Temporary passes
After you choose to continue, the site stays open without re-prompting for a
configurable window (default 5 min), so normal browsing isn't nagged to death.

### Reminders
Optional periodic notification — a gentle nudge to check in with yourself.

### Stats
- **Popup** — today's interruptions, step-aways, and "resisted" rate.
- **Settings** — last 7 days summary plus a daily bar chart.

**Default guarded sites:** Instagram, Facebook, TikTok, X/Twitter, YouTube,
Reddit (Snapchat & LinkedIn included but off). All editable.

---

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this folder
4. Pin the icon — click it for the popup, or open **Settings** for everything.

Works in **Chrome, Edge, Brave, and Arc**.

---

## Settings overview

| Setting | What it controls |
|---------|------------------|
| Master toggle | Turns the whole extension on/off |
| Breathing time | Length of the forced breath (3–30s) |
| Re-prompt after | How long a granted pass lasts (1–60 min) |
| Ask for an intention | Require naming a reason to continue |
| Suggest an alternative | Show an alternative activity |
| Guarded sites | Add/remove sites; set open & time limits each |
| Feed blocking | Toggle Reels / Shorts / For-you hiding |
| Intentions / Alternatives | Edit the suggestion lists |
| Reminders | Enable, set cadence and message |

All changes save instantly.

---

## How it works

- A `webNavigation` listener in the background service worker watches top-frame
  navigations. If the host matches a guarded site and there's no active pass, it
  redirects the tab to `pause.html` and records the interruption.
- Choosing **Continue** grants a time-boxed pass (kept in `chrome.storage.session`,
  so it clears on browser restart) and increments the open count.
- A 1-minute alarm samples the active, non-idle tab to accumulate time-on-site
  and enforce the daily time limit.
- A content script toggles classes on `<html>` so CSS can hide feed surfaces, and
  redirects dedicated Reels/Shorts pages.

All data lives in `chrome.storage.local` on your machine. **Nothing is sent
anywhere** — no servers, no analytics, no accounts.

---

## Project layout

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest |
| `background.js` | nav intercept, passes, limits, reminders, time sampling |
| `src/storage.js` | defaults + storage helpers (shared ES module) |
| `pause.html` / `.css` / `.js` | breathing + choice screen |
| `popup.html` / `.css` / `.js` | quick toggle + today's stats |
| `options.html` / `.css` / `.js` | full settings, site list, feeds, stats |
| `content/feeds.js` / `.css` | feed-blocking content script |
| `icons/` | 16 / 48 / 128 px icons |

---

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | save settings and stats locally |
| `webNavigation` | detect when you open a guarded site |
| `tabs` | redirect the tab to the pause screen |
| `alarms` | minute timer (time limits) and reminders |
| `notifications` | reminder nudges |
| `idle` | don't count time while you're away |
| `<all_urls>` | match any site you add to the guarded list |

---

## Notes & roadmap

- Feed-blocking selectors are **best-effort** and may need updates as sites
  change their markup.
- **Safari / iPad:** this MV3 core can later be wrapped as a Safari Web Extension
  via Xcode without rewriting the logic.

---

## License

MIT — do what you like.
