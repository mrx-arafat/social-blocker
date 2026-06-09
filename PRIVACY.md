# Privacy Policy — Social Blocker

_Last updated: 2026-06-09_

Social Blocker is built to be private by design.

## What we collect

**Nothing leaves your device.** Social Blocker does not collect, transmit,
sell, or share any personal data. There are no servers, no analytics, no
tracking, and no user accounts.

## What is stored locally

The extension stores the following **only in your browser** (via the standard
`chrome.storage.local` API), so the extension can function:

- Your settings (guarded sites, limits, intentions, alternatives, reminders).
- Local usage counters (how many times sites were intercepted, continued, or
  stepped away from, and time-on-site totals).

This data never leaves your browser and is removed if you uninstall the
extension.

## Why the permissions are needed

- **webNavigation / tabs** — to detect when you open a guarded site and redirect
  that tab to the breathing/pause screen.
- **host access (all sites)** — so you can add *any* website to your own guarded
  list; the extension only acts on sites you choose.
- **storage** — to save your settings and local stats on your device.
- **alarms / idle** — to measure time-on-site (paused while you're away) and to
  send optional reminders.
- **notifications** — to show optional reminder nudges.

The extension does not read page content for any purpose other than hiding the
specific feed elements you enable (e.g. Reels, Shorts).

## Contact

Questions: open an issue at
<https://github.com/mrx-arafat/social-blocker>.
