# Chrome Web Store Submission Kit

Copy-paste material for the Developer Dashboard. Keep this file in sync with
`manifest.json` and `PRIVACY.md` whenever permissions or features change.

## Store listing

**Name (from manifest):** Social Blocker — Mindful Pause for Social Media

**Summary (from manifest description, ≤132 chars):**
> A mindful pause before distracting sites: breathe, set an intention, then choose. Daily limits, schedules & feed hiding, all local.

**Category:** Workflow & Planning (or Productivity → Focus)

**Language:** English

**Detailed description (paste into the dashboard):**

```
Social Blocker helps you use social media on purpose instead of on autopilot.

Rather than slamming a wall in front of you, it inserts a short mindful pause
before any site on your guarded list opens: a guided breath, an optional
intention ("why am I opening this?"), and a real choice — continue for a few
minutes, or step away.

WHAT IT DOES
• Pause screen — a breathing timer intercepts guarded sites before they load.
  Repeated opens the same day make the breath slightly longer, so impulsive
  reopening gets tedious on its own.
• Intentions — type why you're opening the site; your last reason is mirrored
  back next time.
• Daily limits — cap opens per day or minutes per day, per site. Hitting a
  limit shows a friendly wall for the rest of the day.
• Schedules & strict hours — block-free windows, strict windows (no
  "continue" button), and a one-tap "strict for 1 hour".
• Feed hiding — optionally hide Instagram Reels, YouTube Shorts, Facebook
  Reels and the X "For You" feed while keeping the rest of the site usable.
• Stats & streaks — local counters for pauses, opens, time-on-site, a
  calm-day streak, and an optional weekly recap notification.
• Koala buddy — an optional mascot that cheers you on.

PRIVATE BY DESIGN
Everything runs and stays on your device. No account, no server, no
analytics, no tracking — the code makes zero network calls. Your settings and
counters live in your browser's local storage and are deleted when you
uninstall.

PERMISSIONS, HONESTLY
The extension ships with access to nine common social sites. If you add your
own site to the guarded list, Chrome will ask you to grant access to that
site only — and if you decline, the site is still guarded through a fallback
path. There is no blanket access to your browsing.
```

**Graphic assets checklist (required by the dashboard):**
- [ ] Store icon 128×128 (use `icons/icon128.png`)
- [ ] At least one screenshot, 1280×800 (pause screen, options page, popup,
      recap — take 4–5; quality affects ranking)
- [ ] Small promo tile 440×280 (PNG/JPEG)
- [ ] Optional: marquee tile 1400×560, YouTube demo video

## Privacy tab

**Single purpose description:**
> Social Blocker has one purpose: helping users control their own use of
> distracting websites. It intercepts navigations to the user's chosen list of
> sites and shows a local "pause" page with a breathing timer and the choice to
> continue or leave, plus optional per-site daily limits, schedules, and
> hiding of short-video feeds on those same sites. All features serve this
> single purpose and all data stays on the user's device.

**Permission justifications (one field per permission):**

| Permission | Justification to paste |
|---|---|
| `storage` | Stores the user's settings (guarded sites, limits, schedules) and local usage counters on-device. No data is transmitted anywhere. |
| `webNavigation` | Detects top-frame navigations to sites on the user's guarded list so the tab can be redirected to the extension's local pause page. Also serves as the fallback blocking path when host access to a user-added site was declined. |
| `declarativeNetRequestWithHostAccess` | Lets the browser itself redirect guarded sites to the local pause page before any content loads (no flash of the blocked site). Session rules are built only for domains on the user's guarded list, and only act where the user has granted host access. |
| `scripting` | Injects the optional mascot-overlay content script into guarded sites only (static content scripts cannot cover sites the user adds at runtime). |
| `alarms` | A one-minute sampler measures time-on-site for the user's daily time limits and rolls the daily streak; also schedules optional reminder and weekly-recap notifications and the auto-re-enable timer. |
| `notifications` | Shows the user's optional periodic mindfulness reminder and the optional weekly recap notification. Both are off/controllable in settings. |
| `idle` | Pauses the time-on-site counter while the user is away from the keyboard, so time limits only count real usage. |
| Host permissions (declared) | The nine built-in guarded social domains (instagram.com, facebook.com, tiktok.com, twitter.com, x.com, youtube.com, reddit.com, snapchat.com, linkedin.com). Needed so the declarativeNetRequest redirect and the overlay work on the default list. |
| Host permissions (optional `*://*/*`) | Requested at runtime, per site, only when the user adds a custom domain to their own guarded list. Declining still guards the site via the webNavigation fallback. |

**Remote code:** No, I am not using remote code. (All logic ships in the
package; the only dynamic import is the extension's own `src/mascot.js`.)

**Data usage disclosures:** check **none** of the collection boxes — the
extension does not collect or transmit any user data. Certify the disclosures.

**Privacy policy URL:**
`https://github.com/mrx-arafat/social-blocker/blob/main/PRIVACY.md`
(host it on a plain page, e.g. GitHub Pages, if the dashboard rejects the
GitHub blob URL).

## Pre-submission checklist

- [ ] Bump `version` in `manifest.json` (must increase every upload).
- [ ] `node --test tests/*.test.mjs` — all green.
- [ ] Load the **packed** zip locally: `chrome://extensions` → Pack/drag, then
      click through pause → continue, pause → step away, limits, options,
      popup, recap.
- [ ] Zip with `manifest.json` at the zip root (no wrapping folder):
      `zip -r social-blocker.zip . -x '.git/*' 'tests/*' 'docs/*' '.playwright-cli/*' '*.md' '.gitignore'`
- [ ] Verify the zip contains every file referenced by `manifest.json`
      (icons, content scripts, pause/options/popup/recap/onboarding pages).
- [ ] Dashboard: listing text + ≥1 screenshot + promo tile uploaded.
- [ ] Privacy tab: single purpose, per-permission justifications, remote-code
      "No", data-use certifications, privacy policy URL.
- [ ] Account: contact email verified; enable "item published" notifications.
