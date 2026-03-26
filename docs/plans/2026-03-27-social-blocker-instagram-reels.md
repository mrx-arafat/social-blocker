# Social Blocker — Instagram Reels Blocker Extension

Created: 2026-03-27
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Build a cross-browser extension (Chrome + Firefox) called "Social Blocker" that acts as a psychological defense system against Instagram Reels addiction. Not just a blocker — a tool that interrupts the dopamine loop of infinite scrolling, challenges the compulsion to react for social validation, and replaces mindless consumption with self-awareness. Completely removes Reels with zero bypass, replaces blocked content with reflective/motivational overlays, tracks streaks and stats, and provides a warm, encouraging popup dashboard.

**Architecture:** WXT framework with React + TypeScript + Tailwind CSS. Content scripts handle DOM-level blocking (CSS injection + MutationObserver for SPA), background script manages URL interception and stats persistence. Extensible blocker system allows adding new targets (YouTube Shorts, TikTok, etc.) in the future.

**Tech Stack:** WXT, React 18, TypeScript, Tailwind CSS, Chrome Storage API, Manifest V3, declarativeNetRequest API

## Scope

### In Scope

- Instagram Reels nuclear blocking (content removal, URL interception, navigation prevention)
- Motivational full-screen overlay when Reels pages are detected
- Popup dashboard: streak counter, daily block stats, estimated time saved, weekly activity chart, rotating motivational quotes, personal goals
- Cross-browser support (Chrome MV3 + Firefox)
- Extensible blocker architecture (pluggable blocking targets)
- Persistent storage for stats, streaks, settings, and goals

### Out of Scope

- YouTube Shorts / TikTok / other platform blockers (architecture supports it, not implemented yet)
- Password-locked bypass prevention
- Mobile app blocking
- Social/community features
- Cloud sync across devices
- Browser store publishing workflow

## Context for Implementer

> This is a greenfield project — empty directory, no existing code.

- **Framework:** WXT (https://wxt.dev) — file-based entrypoints auto-generate the manifest. Content scripts go in `entrypoints/content/`, background in `entrypoints/background.ts`, popup in `entrypoints/popup/`
- **Instagram is a React SPA:** Page navigations happen via History API pushState/replaceState, not full page loads. The content script MUST use MutationObserver + URL change detection to handle dynamic content
- **Instagram Reels surfaces:** (1) `/reels/` page — dedicated Reels tab, (2) `/reel/<id>` — individual reel pages, (3) Reels icon in navigation bar, (4) Suggested reels in home feed, (5) Reels tab on user profiles
- **Cross-browser:** WXT handles most differences. Use `browser` namespace (WXT provides this). For `declarativeNetRequest`, Chrome and Firefox both support it in MV3. **Firefox requires `*://www.instagram.com/*` in `host_permissions` for redirect rules to work** (stricter than Chrome)
- **WXT version:** Pin to `wxt@^0.19` — verify shadow DOM mounting API (`createShadowRootUi` or `createIntegratedUi` depending on version) against the pinned version's docs before writing overlay code
- **Tailwind in extensions:** Must be configured to scope styles to avoid leaking into the host page. WXT + shadow DOM handles this for injected UI; popup styles are naturally isolated
- **Storage:** Use WXT's built-in `storage` utilities which wrap `browser.storage.local` with type safety

## Assumptions

- Instagram's web DOM uses recognizable patterns for Reels elements (nav links with `/reels/` href, role-based selectors) — Tasks 2, 3 depend on this
- WXT supports React 18 + Tailwind CSS via standard Vite plugins — Task 1 depends on this
- `declarativeNetRequest` is supported in both Chrome MV3 and Firefox MV3 — Task 4 depends on this
- Instagram's SPA navigation triggers `popstate` or `pushState` events that can be intercepted — Task 2 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Instagram DOM changes break selectors | High | Medium | Use multiple selector strategies (href-based, aria-label, role); implement fallback pattern matching; design selectors to be resilient to class name changes |
| MutationObserver performance overhead | Low | Medium | Throttle observer callbacks; observe only relevant subtrees; disconnect when extension disabled |
| Firefox MV3 declarativeNetRequest differences | Medium | Low | Test early on Firefox; use WXT's browser abstraction; fallback to webRequest if needed |
| Tailwind CSS leaking into Instagram page | Low | High | Use shadow DOM for injected overlay; scoped styles via WXT content script CSS isolation |

## Goal Verification

### Truths

1. Navigating to `instagram.com/reels/` shows a motivational overlay instead of Reels content
2. Navigating to `instagram.com/reel/<any-id>` shows a motivational overlay instead of the reel
3. The Reels icon/link in Instagram's navigation bar is hidden
4. Suggested reels in the home feed are removed
5. The popup shows current streak, blocks today, estimated time saved, a motivational quote, and a weekly chart
6. The extension works in both Chrome and Firefox
7. Disabling the extension via the popup toggle restores normal Instagram behavior

### Artifacts

- `entrypoints/content/index.tsx` — content script with blocking engine
- `entrypoints/content/overlay.tsx` — motivational overlay component
- `entrypoints/background.ts` — URL interception and stats tracking
- `entrypoints/popup/` — React popup dashboard
- `wxt.config.ts` — WXT configuration
- `public/rules.json` — declarativeNetRequest rules

## Progress Tracking

- [x] Task 1: Project scaffolding, configuration, and storage layer
- [x] Task 2: Content script — blocking engine (CSS + MutationObserver)
- [x] Task 3: Content script — motivational overlay
- [x] Task 4: Background script — URL interception and stats
- [x] Task 5: Popup UI — full dashboard
- [x] Task 6: Cross-browser build, icons, and polish

**Total Tasks:** 6 | **Completed:** 6 | **Remaining:** 0

## Implementation Tasks

### Task 1: Project Scaffolding, Configuration, and Storage Layer

**Objective:** Initialize the WXT project with React, TypeScript, and Tailwind CSS. Define all shared types, the extensible blocker configuration system, and the storage layer.

**Dependencies:** None

**Files:**

- Create: `package.json`
- Create: `wxt.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js` (if needed by Tailwind)
- Create: `assets/icon-16.png`, `assets/icon-32.png`, `assets/icon-48.png`, `assets/icon-128.png`
- Create: `utils/types.ts` — shared TypeScript interfaces
- Create: `utils/storage.ts` — storage abstraction using WXT storage
- Create: `utils/constants.ts` — motivational quotes (anti-comparison, self-worth, mindfulness — NOT hustle culture), self-awareness prompts, time reality check templates, default settings
- Create: `utils/blockers/instagram-reels.ts` — first blocker configuration
- Create: `utils/blockers/index.ts` — blocker registry (extensible)

**Key Decisions / Notes:**

- Use `pnpm create wxt@latest` or manually scaffold. WXT uses file-based entrypoints in `entrypoints/` directory
- Blocker config interface: `{ id, name, description, icon, urlPatterns, cssSelectors, contentMatchers, enabled }`
- Storage schema: `{ settings: { enabled, blockers }, stats: { totalBlocks, streakDays, streakStart, lastDisabledAt: number|null, dailyStats[], goals[] } }`
- Each blocker is a self-contained module exporting a `BlockerConfig` — future blockers just add a new file + register in index
- Use WXT's `storage.defineItem()` for type-safe reactive storage

**Definition of Done:**

- [ ] `pnpm dev` starts the extension in Chrome with HMR working
- [ ] `pnpm dev:firefox` starts the extension in Firefox
- [ ] TypeScript compiles with zero errors
- [ ] Tailwind CSS classes render correctly in the popup
- [ ] Storage utilities can read/write blocker settings and stats
- [ ] Instagram Reels blocker config is registered and queryable
- [ ] WXT version pinned; shadow DOM UI mounting API confirmed available
- [ ] `host_permissions` includes `*://www.instagram.com/*` in both Chrome and Firefox manifests

**Verify:**

- `pnpm dev` — extension loads in Chrome
- `pnpm dev:firefox` — extension loads in Firefox
- `pnpm build` — builds for Chrome without errors
- `pnpm build:firefox` — builds for Firefox without errors

---

### Task 2: Content Script — Blocking Engine

**Objective:** Build the content script that runs on `instagram.com` to remove all Reels-related elements. Uses CSS injection for instant hiding and MutationObserver for dynamic SPA content.

**Dependencies:** Task 1

**Files:**

- Create: `entrypoints/content/index.ts` — main content script entry
- Create: `entrypoints/content/blocker-engine.ts` — core blocking logic
- Create: `entrypoints/content/url-monitor.ts` — SPA URL change detection
- Create: `entrypoints/content/style.css` — CSS rules for hiding Reels elements

**Key Decisions / Notes:**

- **CSS injection (first line of defense):** Inject CSS immediately to hide known Reels elements before they render. Target: `a[href*="/reels"]` (nav links), elements with Reels-related aria-labels
- **MutationObserver (second line):** Watch for new elements added to DOM that match Reels patterns. Instagram's React rendering adds elements dynamically
- **URL monitoring:** Wrap `history.pushState` and `history.replaceState` in a Proxy that calls the original, then immediately checks `window.location.pathname` for reels patterns. Also listen to `popstate`. Additionally, add a `setInterval` fallback polling `location.pathname` every 500ms as belt-and-suspenders for any navigation pattern that escapes the proxy (some Instagram transitions use replaceState without triggering popstate). When URL matches `/reels` or `/reel/`, trigger overlay (Task 3)
- **Performance:** Use `requestIdleCallback` for non-critical DOM scans. Disconnect observer when extension is disabled
- **Communication:** Use `browser.runtime.sendMessage` to notify background script of each block event (for stats)
- **Selectors strategy (resilient to DOM changes):**
  - `a[href*="/reels"]` — any link pointing to reels
  - `a[href*="/reel/"]` — individual reel links
  - Navigation elements containing reels SVG icon (match by path data or viewBox)
  - Video containers in feed that are reels (detect by surrounding reel-specific markup)

**Definition of Done:**

- [ ] Reels navigation icon is hidden from Instagram's nav bar
- [ ] Navigating to `/reels/` is detected by the content script
- [ ] Navigating to `/reel/<id>` is detected by the content script
- [ ] Suggested reels in the home feed are removed
- [ ] Reels tab on user profiles is hidden
- [ ] Extension can be toggled — disabling restores all hidden elements
- [ ] No visible performance impact on Instagram browsing

**Verify:**

- Load extension, navigate to instagram.com — Reels nav icon is gone
- Click where Reels icon was — nothing happens
- Directly navigate to instagram.com/reels/ — URL change detected (overlay in Task 3)
- Scroll home feed — no Reels suggestions visible
- Visit a profile — Reels tab hidden

---

### Task 3: Content Script — Motivational Overlay

**Objective:** Build a beautiful, warm motivational overlay that replaces Reels content when the user navigates to a Reels page. Injected into Instagram's DOM via shadow DOM for style isolation.

**Dependencies:** Task 1, Task 2

**Files:**

- Create: `entrypoints/content/overlay.tsx` — React overlay component
- Create: `entrypoints/content/overlay.css` — overlay Tailwind styles
- Create: `entrypoints/content/mount-overlay.ts` — shadow DOM mounting logic

**Key Decisions / Notes:**

- **Shadow DOM:** Mount the overlay inside a shadow root to prevent Instagram's CSS from affecting it and vice versa. WXT's `createShadowRootUi` utility handles this
- **Design — psychological defense + warm motivational:**
  - Soft gradient background (warm amber/orange tones)
  - Large streak counter with flame/fire icon
  - **Self-awareness prompt:** "You were about to spend the next hour scrolling. Is that really what you want right now?" — breaks the autopilot
  - **Time reality check:** "You've saved X hours this week. That's Y episodes of your favorite show, or Z pages of a book."
  - **Anti-comparison reminder:** Rotating messages like "Their highlight reel isn't their real life" and "You don't need to perform being intellectual for anyone"
  - Rotating motivational quote (focus on self-worth, not productivity hustle)
  - "Back to Feed" button (redirects to instagram.com)
  - Subtle animation on mount (fade in + scale)
- **Trigger:** Called by the URL monitor (Task 2) when `/reels` or `/reel/` is detected
- **Data:** Reads stats from storage (Task 1) to display streak and time saved
- **Assumed time per reel:** 30 seconds average — each block saves ~30 seconds
- **Psychological hooks in quotes:** Include quotes specifically about comparison trap, validation-seeking, authentic connection vs. performative engagement. Not generic motivational — targeted at the social media psychology

**Definition of Done:**

- [ ] Overlay appears when navigating to instagram.com/reels/
- [ ] Overlay appears when navigating to instagram.com/reel/<id>
- [ ] Overlay shows current streak count
- [ ] Overlay shows a self-awareness prompt ("You were about to scroll for an hour...")
- [ ] Overlay shows a motivational/anti-comparison quote
- [ ] Overlay shows estimated time saved today with real-world equivalents
- [ ] "Back to Feed" button navigates to instagram.com
- [ ] Overlay is visually polished with warm colors and smooth animation
- [ ] Instagram's CSS does not affect the overlay (shadow DOM isolation)
- [ ] Overlay covers the entire viewport

**Verify:**

- Navigate to instagram.com/reels/ — full-screen warm overlay appears
- Overlay shows streak, quote, time saved
- Click "Back to Feed" — returns to instagram.com
- Overlay styling is consistent (not broken by Instagram CSS)

---

### Task 4: Background Script — URL Interception and Stats

**Objective:** Set up background-level URL blocking using declarativeNetRequest to intercept Reels URLs before they load. Manage stats tracking and streak persistence.

**Dependencies:** Task 1

**Files:**

- Create: `entrypoints/background.ts` — background script
- Create: `public/rules/instagram-reels.json` — declarativeNetRequest rules
- Create: `utils/stats.ts` — stats calculation utilities (time saved, streak logic)

**Key Decisions / Notes:**

- **declarativeNetRequest approach:** Use **dynamic rules** via `browser.declarativeNetRequest.updateDynamicRules()` (not static rulesets) — this allows the master toggle to add/remove rules at runtime without manifest changes. Rules redirect these URL patterns to `https://www.instagram.com/`:
  - `*://www.instagram.com/reels*` — main Reels page
  - `*://www.instagram.com/reel/*` — individual reel pages
  - `*://www.instagram.com/*/reels*` — profile Reels tabs (e.g., `instagram.com/username/reels/`)
  The content script overlay is the authoritative fallback for SPA-internal navigation that bypasses net-request rules
- **Master toggle mechanics:** When toggle is ON → `updateDynamicRules({ addRules: [...] })`. When OFF → `updateDynamicRules({ removeRuleIds: [...] })`. This is simpler than static rulesets and doesn't require manifest changes
- **Stats tracking:** Background listens for messages from content script reporting block events. Increments daily counter, updates storage
- **Streak logic:** Track `lastDisabledAt: number | null` timestamp. When master toggle is turned off, write `lastDisabledAt = Date.now()`. In streak calculation: if `lastDisabledAt` falls within the current or previous calendar day, reset streak. Otherwise increment
- **Daily reset:** At midnight (or on first access of new day), rotate daily stats into weekly history. Keep 7 days of history for the weekly chart
- **Alarm API:** Use `browser.alarms` for daily stat rotation (more reliable than setTimeout in service workers)

**Definition of Done:**

- [ ] Direct URL navigation to instagram.com/reels/ is redirected to instagram.com
- [ ] Direct URL navigation to instagram.com/reel/<id> is redirected to instagram.com
- [ ] Direct URL navigation to instagram.com/<username>/reels/ is redirected to instagram.com
- [ ] External reel links (opened from another tab/app) are blocked
- [ ] Block events from content script are received and counted
- [ ] Daily stats are persisted and rotated at midnight
- [ ] Streak is correctly calculated (consecutive days with extension enabled, resets if `lastDisabledAt` is within current/previous day)
- [ ] Weekly stats history is maintained (7 days)
- [ ] Stats are accessible from popup via storage

**Verify:**

- Type instagram.com/reels in address bar — redirected to instagram.com
- Check storage after blocking — block count incremented
- Simulate day change — stats rotate correctly

---

### Task 5: Popup UI — Full Dashboard

**Objective:** Build the extension popup as a polished React dashboard with motivational warm design, showing streak, stats, quotes, weekly chart, and goals.

**Dependencies:** Task 1, Task 4

**Files:**

- Create: `entrypoints/popup/index.html` — popup HTML entry
- Create: `entrypoints/popup/main.tsx` — React mount point
- Create: `entrypoints/popup/App.tsx` — main popup app component
- Create: `entrypoints/popup/components/Header.tsx` — logo, extension name, master toggle
- Create: `entrypoints/popup/components/StreakCard.tsx` — streak counter with flame animation
- Create: `entrypoints/popup/components/StatsCard.tsx` — blocks today + time saved
- Create: `entrypoints/popup/components/QuoteCard.tsx` — rotating motivational quote
- Create: `entrypoints/popup/components/WeeklyChart.tsx` — 7-day bar chart (pure CSS/SVG)
- Create: `entrypoints/popup/components/GoalsSection.tsx` — personal goals with checkboxes
- Create: `entrypoints/popup/components/BlockerList.tsx` — list of active blockers (extensible)
- Create: `entrypoints/popup/popup.css` — global Tailwind entry

**Key Decisions / Notes:**

- **Popup size:** 380px wide × 520px tall — spacious but not overwhelming
- **Design language:**
  - Warm color palette: amber-50 background, orange-500 accents, warm grays for text
  - Rounded corners (xl), soft shadows, gentle gradients
  - Flame emoji or SVG for streak icon
  - Smooth micro-animations (number counting up, quote fade-in)
- **Weekly chart:** Simple SVG bar chart — 7 bars showing daily block counts. Pure SVG, no charting library needed
- **Goals:** User can add up to 3 personal goals (free text). Stored in storage. Checkbox to mark complete. Goals reset weekly
- **Blocker list:** Shows "Instagram Reels" with a toggle. Future blockers appear here. Each shows name + icon + enabled state
- **Quote rotation:** Pick random quote from constants on each popup open. Collection of 30+ quotes categorized: anti-comparison ("Stop measuring your behind-the-scenes against their highlight reel"), self-worth ("You don't need likes to be valuable"), mindfulness ("Be present in your own life, not a spectator of others'"), and growth ("The hours you save today become the skills of tomorrow")
- **Master toggle:** Single switch to enable/disable ALL blocking. When off, content script stops blocking, declarativeNetRequest rules are disabled

**Definition of Done:**

- [ ] Popup opens with warm, polished design at 380×520px
- [ ] Master toggle enables/disables the extension (both content script blocking AND declarativeNetRequest URL rules)
- [ ] Streak counter shows correct consecutive days
- [ ] Stats show blocks today and estimated time saved
- [ ] Motivational quote displays and changes on each open
- [ ] Weekly bar chart shows last 7 days of activity
- [ ] Goals section allows adding, checking, and removing goals (max 3)
- [ ] Blocker list shows Instagram Reels with toggle
- [ ] All data persists across popup opens
- [ ] Smooth animations and micro-interactions

**Verify:**

- Click extension icon — popup opens with all sections visible
- Toggle master switch off → on — blocking state changes
- Add a goal, close popup, reopen — goal persists
- Check stats match actual blocking activity

---

### Task 6: Cross-Browser Build, Icons, and Polish

**Objective:** Ensure the extension works correctly in both Chrome and Firefox, create proper icon set, add final visual polish, and verify all features end-to-end.

**Dependencies:** Task 1-5

**Files:**

- Create/Update: `assets/icon-16.png`, `assets/icon-32.png`, `assets/icon-48.png`, `assets/icon-128.png`
- Update: `wxt.config.ts` — finalize browser-specific configurations
- Create: `assets/icon.svg` — source SVG for icon generation

**Key Decisions / Notes:**

- **Icons:** Shield-based design with warm colors matching the extension theme. Generate all sizes from a single SVG
- **Firefox specifics:** Verify `declarativeNetRequest` works. If not, implement `webRequest.onBeforeRequest` fallback
- **Content Security Policy:** Ensure injected content works within Instagram's CSP
- **Performance audit:** Check MutationObserver doesn't cause jank on Instagram
- **Edge cases:** Handle Instagram logged-out state, handle instagram.com vs www.instagram.com, handle mobile web view

**Definition of Done:**

- [ ] Extension loads and works in Chrome (latest)
- [ ] Extension loads and works in Firefox (latest)
- [ ] Icons display correctly at all sizes in both browsers
- [ ] No console errors in either browser
- [ ] All 7 Goal Verification truths pass in both browsers
- [ ] Extension description and name appear correctly
- [ ] Performance: no visible lag on Instagram pages

**Verify:**

- `pnpm build` — Chrome build succeeds
- `pnpm build:firefox` — Firefox build succeeds
- Load in Chrome → test all features
- Load in Firefox → test all features
- Check browser console — zero errors

## Open Questions

None — all key decisions resolved.

### Deferred Ideas

- YouTube Shorts blocker (add new blocker module)
- TikTok blocker (add new blocker module)
- Password/PIN lock to prevent disabling
- Cloud sync for stats across devices
- Break timer — allow X minutes per day (time budget mode)
- Community challenges (social accountability)
- Custom quote upload
- Notification reminders celebrating milestones
