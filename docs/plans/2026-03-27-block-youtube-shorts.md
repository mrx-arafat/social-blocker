# Block YouTube Shorts Implementation Plan

Created: 2026-03-27
Status: VERIFIED
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** Block YouTube Shorts content from the YouTube web version — including Shorts URLs, homepage shelf, sidebar tab, and search results — with a motivational overlay on Shorts page navigation.

**Architecture:** New YouTube-specific content script (`entrypoints/youtube.content/`) following the existing Instagram Reels pattern. Shared overlay component extracted from the Instagram content script. Background script extended with YouTube Shorts `declarativeNetRequest` redirect rules.

**Tech Stack:** WXT, React, TypeScript, Tailwind CSS, declarativeNetRequest API

## Scope

### In Scope

- YouTube Shorts blocker config with URL patterns and CSS selectors
- Separate content script for `youtube.com` with DOM blocking engine
- URL-level blocking via `declarativeNetRequest` (redirect `/shorts` to YouTube homepage)
- Motivational overlay when user navigates to Shorts URLs
- Shared overlay component (extracted from Instagram content script)
- Sidebar "Shorts" tab hiding
- Homepage Shorts shelf hiding
- Search results Shorts hiding
- Popup BlockerList updated (YouTube Shorts entry, remove "coming soon")

### Out of Scope

- TikTok blocking (future)
- YouTube Shorts in embedded iframes on other sites
- Mobile YouTube app blocking
- YouTube Shorts in subscription feed (complex, deferred)

## Context for Implementer

> Write for an implementer who has never seen the codebase.

- **Patterns to follow:** Instagram Reels blocker at `utils/blockers/instagram-reels.ts:1-29` — each blocker is a `BlockerConfig` with `id`, `name`, `urlPatterns`, `cssSelectors`, `urlMatchPatterns`, `enabled`. Content script pattern at `entrypoints/content/index.ts:1-99`.
- **Conventions:** WXT content scripts live in `entrypoints/<name>/index.ts` and auto-register. CSS injection via `cssInjectionMode: "manifest"`. Storage uses `wxt/storage` defineItem pattern. `pnpm` is the package manager.
- **Key files:**
  - `utils/blockers/index.ts` — blocker registry, exports `getAllBlockers()`, `getBlockerById()`, `isReelsUrl()`
  - `utils/storage.ts` — WXT storage items, `blockerStates` fallback defines default on/off per blocker
  - `entrypoints/background.ts` — `declarativeNetRequest` rules, message handler, streak/stats alarms
  - `entrypoints/content/blocker-engine.ts` — MutationObserver DOM blocking pattern
  - `entrypoints/content/url-monitor.ts` — SPA navigation detection (pushState proxy + popstate + polling)
  - `entrypoints/content/overlay.tsx` — motivational overlay React component (hardcoded Instagram back URL)
  - `entrypoints/content/mount-overlay.ts` — shadow DOM overlay mounting
  - `wxt.config.ts` — manifest config, `host_permissions`
- **Gotchas:**
  - YouTube uses custom web components (`ytd-*`) — CSS selectors must target these, not standard HTML
  - YouTube is an SPA — same pushState/popstate interception needed as Instagram
  - `declarativeNetRequest` rule IDs must not collide — Instagram uses 1-3, YouTube must use 4+
  - The overlay's "Back to Feed" text and `instagram.com` URL are hardcoded — must be parameterized
  - `style.css` with `cssInjectionMode: "manifest"` is injected before page load — first line of defense
- **Domain context:** YouTube Shorts are short-form vertical videos. They appear at `/shorts` and `/shorts/<id>` URLs. On the homepage, they appear in a horizontal shelf. In sidebar navigation, there's a dedicated "Shorts" tab. In search results, they appear as a reel shelf.

## YouTube Shorts DOM Selectors Reference

| Element | CSS Selectors |
|---------|--------------|
| Shorts shelf (homepage) | `ytd-rich-shelf-renderer[is-shorts]`, `ytd-reel-shelf-renderer` |
| Shorts sidebar tab | `ytd-guide-entry-renderer a[title="Shorts"]` (parent), `ytd-mini-guide-entry-renderer a[title="Shorts"]` (parent) |
| Shorts links | `a[href="/shorts"]`, `a[href^="/shorts/"]` |
| Shorts in search | `ytd-reel-shelf-renderer` |

## Assumptions

- YouTube's `ytd-rich-shelf-renderer[is-shorts]` and `ytd-reel-shelf-renderer` selectors correctly target Shorts shelves — supported by YouTube's current DOM structure — Tasks 4 depends on this
- WXT allows multiple content scripts via separate `entrypoints/<name>/` directories — supported by WXT docs and framework design — Task 4 depends on this
- `declarativeNetRequest` supports `youtube.com` URL filters alongside Instagram ones — supported by the API being origin-agnostic — Task 3 depends on this

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| YouTube changes DOM structure/class names | Medium | Medium | Use multiple selector strategies (attribute selectors + tag names); MutationObserver catches dynamic changes |
| Shorts sidebar tab `title` attribute is locale-dependent | Medium | Low | Also target by `href="/shorts"` which is locale-independent |
| YouTube Shorts shelf uses new component names | Low | Medium | Include both `ytd-rich-shelf-renderer[is-shorts]` and `ytd-reel-shelf-renderer` as selectors |
| Content script conflicts between sites | Low | High | Separate content scripts with distinct `matches` patterns — complete isolation |

## Goal Verification

### Truths

1. Navigating to `youtube.com/shorts` or `youtube.com/shorts/<id>` shows the motivational overlay (not Shorts content)
2. The YouTube homepage does not display any Shorts shelf
3. The YouTube sidebar does not show a "Shorts" navigation tab
4. YouTube search results do not contain Shorts sections
5. The popup shows "YouTube Shorts" in the BlockerList with a working toggle
6. Toggling the YouTube Shorts blocker off re-enables all hidden YouTube Shorts content
7. Instagram Reels blocking continues to work unchanged

### Artifacts

1. `utils/blockers/youtube-shorts.ts` — blocker config
2. `entrypoints/youtube.content/index.ts` — content script entry
3. `entrypoints/youtube.content/blocker-engine.ts` — DOM blocking engine
4. `entrypoints/youtube.content/style.css` — CSS-based first-pass hiding
5. `entrypoints/background.ts` — updated with YouTube redirect rules

## Progress Tracking

- [x] Task 1: YouTube Shorts blocker config + registry + storage
- [x] Task 2: Extract shared overlay component
- [x] Task 3: WXT config + background script YouTube rules
- [x] Task 4: YouTube content script (CSS + engine + URL monitor + entry)
- [x] Task 5: Update popup BlockerList UI

**Total Tasks:** 5 | **Completed:** 5 | **Remaining:** 0

## Implementation Tasks

### Task 1: YouTube Shorts Blocker Config, Registry, and Storage

**Objective:** Create the YouTube Shorts `BlockerConfig` and register it in the blocker system so the rest of the extension recognizes it.

**Dependencies:** None

**Files:**

- Create: `utils/blockers/youtube-shorts.ts`
- Modify: `utils/blockers/index.ts`
- Modify: `utils/storage.ts`

**Key Decisions / Notes:**

- Follow the exact pattern from `utils/blockers/instagram-reels.ts:1-29`
- URL patterns for WXT manifest matching: `*://www.youtube.com/shorts*`, `*://www.youtube.com/shorts/*`
- CSS selectors: `a[href="/shorts"]`, `a[href^="/shorts/"]`, `ytd-rich-shelf-renderer[is-shorts]`, `ytd-reel-shelf-renderer`, `ytd-guide-entry-renderer:has(a[title="Shorts"])`, `ytd-mini-guide-entry-renderer:has(a[title="Shorts"])`
- URL match patterns (RegExp): `^https?:\/\/(www\.)?youtube\.com\/shorts(\/.*)?$`
- Add `isShortsUrl()` function in `utils/blockers/index.ts` alongside existing `isReelsUrl()`
- Add `"youtube-shorts": true` to `blockerStates` fallback in `utils/storage.ts:12-15`
- **Migration note:** Existing users with already-stored `blockerStates` will not receive the new default (WXT storage fallback only applies when the key is absent). When reading the `youtube-shorts` key from stored records, use `?? true` to treat missing keys as enabled by default. This pattern is already used in `entrypoints/content/index.ts:24` for Instagram.

**Definition of Done:**

- [ ] `youtube-shorts.ts` exports a valid `BlockerConfig`
- [ ] `getAllBlockers()` returns both Instagram Reels and YouTube Shorts
- [ ] `getBlockerById("youtube-shorts")` returns the config
- [ ] `isShortsUrl("https://www.youtube.com/shorts/abc123")` returns `true`
- [ ] `isShortsUrl("https://www.youtube.com/watch?v=abc")` returns `false`
- [ ] Storage default includes `youtube-shorts: true`
- [ ] Missing `youtube-shorts` key in stored records treated as `true` (via `?? true`)
- [ ] No type errors (`pnpm exec tsc --noEmit`)

**Verify:**

- `pnpm exec tsc --noEmit`

---

### Task 2: Extract Shared Overlay Component

**Objective:** Move the overlay component to a shared location and parameterize the back URL/label so both Instagram and YouTube content scripts can reuse it.

**Dependencies:** None

**Files:**

- Create: `utils/components/Overlay.tsx`
- Modify: `entrypoints/content/overlay.tsx` — re-export from shared location (or update import in mount-overlay)
- Modify: `entrypoints/content/mount-overlay.ts` — update import path, pass `backUrl`/`backLabel`

**Key Decisions / Notes:**

- Add `backUrl` and `backLabel` props to `OverlayProps` (see `entrypoints/content/overlay.tsx:9-13`)
- Default values: `backUrl = "https://www.instagram.com/"`, `backLabel = "Back to Feed"` to maintain backward compatibility
- Move the `Overlay` component and `Pill` helper to `utils/components/Overlay.tsx`
- **Critical:** The back URL is hardcoded inside `handleBack()` at `overlay.tsx:30` (`window.location.href = "https://www.instagram.com/"`) — must be replaced with the `backUrl` prop. The button text "Back to Feed" is a literal at `overlay.tsx:249` — must be replaced with `backLabel` prop.
- Update `mount-overlay.ts:35` to pass `backUrl` and `backLabel` when creating the element
- Update `showOverlay` signature to accept optional `backUrl`/`backLabel` params

**Definition of Done:**

- [ ] `utils/components/Overlay.tsx` exists with parameterized `backUrl`/`backLabel` props
- [ ] `handleBack()` uses the `backUrl` prop instead of the hardcoded `instagram.com` string
- [ ] Button text renders `backLabel` prop instead of the literal "Back to Feed" string
- [ ] Instagram overlay still works (back button goes to `instagram.com`, text says "Back to Feed")
- [ ] No type errors (`pnpm exec tsc --noEmit`)

**Verify:**

- `pnpm exec tsc --noEmit`

---

### Task 3: WXT Config and Background Script YouTube Rules

**Objective:** Add YouTube to host permissions and add `declarativeNetRequest` redirect rules for YouTube Shorts URLs.

**Dependencies:** Task 1

**Files:**

- Modify: `wxt.config.ts`
- Modify: `entrypoints/background.ts`

**Key Decisions / Notes:**

- Add `"*://www.youtube.com/*"`, `"*://youtube.com/*"` to `host_permissions` in `wxt.config.ts:11`
- Update manifest `description` to mention YouTube Shorts alongside Instagram Reels
- Use rule IDs 4, 5, and 6 for YouTube (Instagram uses 1-3) in `entrypoints/background.ts`
  - Rule 4: `||www.youtube.com/shorts/` (individual shorts, www) — redirect to `https://www.youtube.com/`
  - Rule 5: `||www.youtube.com/shorts` (shorts feed, www) — redirect to `https://www.youtube.com/`
  - Rule 6: `||youtube.com/shorts` (non-www fallback) — redirect to `https://www.youtube.com/`
- **Implement TOGGLE_BLOCKER handler:** The current `TOGGLE_BLOCKER` case at `background.ts:105-107` is a stub (`// Future: handle per-blocker toggling`). Must implement it to selectively add/remove YouTube rule IDs (4-6) when `msg.blockerId === "youtube-shorts"` and Instagram rule IDs (1-3) when `msg.blockerId === "instagram-reels"`. Refactor `enableUrlBlocking`/`disableUrlBlocking` into per-blocker functions (e.g., `enableInstagramBlocking()`, `enableYouTubeBlocking()`) or parameterize by blocker ID.
- The popup already sends `TOGGLE_BLOCKER` messages via `handleToggleBlocker` in `App.tsx:80-87` — but the background script also needs to persist the toggle state via `blockerStates` storage.

**Definition of Done:**

- [ ] `wxt.config.ts` includes YouTube in `host_permissions`
- [ ] Background script has YouTube Shorts redirect rules (IDs 4-6)
- [ ] YouTube rules use `https://www.youtube.com/` as redirect target
- [ ] Rule IDs don't collide with Instagram (1-3)
- [ ] `TOGGLE_BLOCKER` handler implemented — toggling `youtube-shorts` off removes YouTube rules (4-6), toggling back on re-adds them
- [ ] `TOGGLE_BLOCKER` handler also works for `instagram-reels` (rules 1-3)
- [ ] No type errors (`pnpm exec tsc --noEmit`)
- [ ] Extension builds successfully (`pnpm build`)

**Verify:**

- `pnpm exec tsc --noEmit && pnpm build`

---

### Task 4: YouTube Content Script

**Objective:** Create the YouTube-specific content script that hides Shorts elements from the DOM, monitors URL changes, and shows the motivational overlay on Shorts pages.

**Dependencies:** Task 1, Task 2

**Files:**

- Create: `entrypoints/youtube.content/style.css`
- Create: `entrypoints/youtube.content/blocker-engine.ts`
- Create: `entrypoints/youtube.content/url-monitor.ts`
- Create: `entrypoints/youtube.content/mount-overlay.ts`
- Create: `entrypoints/youtube.content/index.ts`

**Key Decisions / Notes:**

- **`style.css`:** CSS-first blocking for YouTube Shorts elements:
  - `a[href="/shorts"], a[href^="/shorts/"]` — Shorts links
  - `ytd-rich-shelf-renderer[is-shorts]` — homepage Shorts shelf
  - `ytd-reel-shelf-renderer` — Shorts reel shelf (homepage + search)
  - `ytd-guide-entry-renderer:has(a[title="Shorts"])` — sidebar tab
  - `ytd-mini-guide-entry-renderer:has(a[title="Shorts"])` — mini sidebar tab
  - Use `display: none !important` with `.social-blocker-disabled` restore class (same pattern as `entrypoints/content/style.css:18-23`)

- **`blocker-engine.ts`:** Follow pattern from `entrypoints/content/blocker-engine.ts`
  - Use MutationObserver to watch for dynamically added YouTube elements
  - `scanAndHide()` targets YouTube Shorts selectors from the blocker config
  - `findBlockableContainer()` adapted for YouTube's `ytd-*` component hierarchy — for shelf items, hide the entire `ytd-rich-shelf-renderer` or `ytd-reel-shelf-renderer`; for sidebar items, hide the `ytd-guide-entry-renderer`

- **`url-monitor.ts`:** Same 3-layer SPA detection as `entrypoints/content/url-monitor.ts:1-81` but uses `isShortsUrl()` instead of `isReelsUrl()`

- **`mount-overlay.ts`:** Same as `entrypoints/content/mount-overlay.ts` but passes `backUrl="https://www.youtube.com/"` and `backLabel="Back to YouTube"` to the shared overlay

- **`index.ts`:** Content script entry point
  - `matches: ["*://www.youtube.com/*", "*://youtube.com/*"]`
  - `cssInjectionMode: "manifest"`, `runAt: "document_idle"`
  - Same state management pattern as `entrypoints/content/index.ts:18-98` but for `youtube-shorts` blocker ID
  - Listen for `blockerStates` changes for `youtube-shorts` key

**Definition of Done:**

- [ ] Content script registers for YouTube URLs
- [ ] CSS hides Shorts elements before JS loads
- [ ] MutationObserver catches dynamically added Shorts elements
- [ ] URL monitor detects SPA navigation to `/shorts` pages
- [ ] Overlay appears on Shorts pages with "Back to YouTube" button
- [ ] Toggling off restores all hidden elements
- [ ] No type errors (`pnpm exec tsc --noEmit`)
- [ ] Extension builds successfully (`pnpm build`)

**Verify:**

- `pnpm exec tsc --noEmit && pnpm build`

---

### Task 5: Update Popup BlockerList UI

**Objective:** Update the popup's BlockerList to show YouTube Shorts as a blocker entry and remove the "coming soon" placeholder.

**Dependencies:** Task 1

**Files:**

- Modify: `entrypoints/popup/components/BlockerList.tsx`

**Key Decisions / Notes:**

- The BlockerList already renders dynamically from `getAllBlockers()` at `BlockerList.tsx:12` — adding YouTube Shorts to the registry (Task 1) will automatically show it in the list
- Remove the "YouTube Shorts, TikTok — coming soon" text at `BlockerList.tsx:68-72`
- Update the "coming soon" text to only mention "TikTok — coming soon" since YouTube Shorts is now supported
- The icon for YouTube Shorts should be distinct from Instagram — use a YouTube-style play button or shorts icon. The current Instagram icon is a camera/Instagram SVG at `BlockerList.tsx:28-40`. Need to add per-blocker icon rendering or a generic icon approach.
- Consider rendering different icons per blocker based on `blocker.id` — switch case or icon map

**Definition of Done:**

- [ ] YouTube Shorts appears in the popup's blocker list with its own toggle
- [ ] Toggle correctly enables/disables YouTube Shorts blocking
- [ ] "Coming soon" text updated to only mention TikTok
- [ ] YouTube Shorts entry has a visually distinct icon from Instagram Reels
- [ ] No type errors (`pnpm exec tsc --noEmit`)

**Verify:**

- `pnpm exec tsc --noEmit && pnpm build`

---

## Open Questions

None — all decisions made during planning.

### Deferred Ideas

- TikTok blocking (mentioned in the "coming soon" text)
- YouTube Shorts in subscription feed (more complex DOM targeting)
- Per-site overlay theming (different colors/branding per platform)
- Shorts detection in embedded iframes on other sites
