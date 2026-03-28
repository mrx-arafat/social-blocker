/**
 * Blocker Engine — removes Shorts elements from YouTube's DOM.
 *
 * Uses MutationObserver to watch for dynamically added elements
 * (YouTube is an SPA that renders content dynamically via custom web components).
 * CSS handles the first-pass hiding; this handles elements that
 * CSS selectors can't easily target.
 */

import { youtubeShortsBlocker } from "@/utils/blockers/youtube-shorts";

let observer: MutationObserver | null = null;
let isActive = false;
let blockedCount = 0;
let onBlockCallback: (() => void) | null = null;

const SHORTS_SELECTORS = youtubeShortsBlocker.cssSelectors;

/**
 * Scan a subtree for Shorts elements and hide them.
 * Returns the number of elements hidden.
 */
function scanAndHide(root: Element | Document = document): number {
  let count = 0;

  for (const selector of SHORTS_SELECTORS) {
    const elements = root.querySelectorAll(selector);
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.dataset.socialBlockerHidden !== "true") {
        const container = findBlockableContainer(htmlEl);
        if (container) {
          container.style.display = "none";
          container.dataset.socialBlockerHidden = "true";
          count++;
        }
      }
    });
  }

  return count;
}

/**
 * Find the right container to hide.
 * For YouTube's custom web components, we target the component itself.
 * For sidebar items, we hide the guide entry renderer.
 */
function findBlockableContainer(el: HTMLElement): HTMLElement | null {
  // For shelf renderers, they are already the top-level container
  const shelf =
    el.closest("ytd-rich-shelf-renderer") ||
    el.closest("ytd-reel-shelf-renderer");
  if (shelf) return shelf as HTMLElement;

  // For sidebar/guide entries
  const guideEntry =
    el.closest("ytd-guide-entry-renderer") ||
    el.closest("ytd-mini-guide-entry-renderer");
  if (guideEntry) return guideEntry as HTMLElement;

  // For standalone links, just hide the link itself
  return el;
}

/**
 * Start the MutationObserver to watch for new Shorts elements.
 */
export function startBlocker(onBlock: () => void): void {
  if (isActive) return;
  isActive = true;
  onBlockCallback = onBlock;

  // Re-enable CSS blocking (removed by stopBlocker)
  document.documentElement.classList.remove("social-blocker-disabled");

  // Initial scan
  const initialBlocked = scanAndHide();
  if (initialBlocked > 0) {
    blockedCount += initialBlocked;
    onBlock();
  }

  // Watch for DOM changes
  observer = new MutationObserver((mutations) => {
    if (!isActive) return;

    let needsScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        needsScan = true;
        break;
      }
    }

    if (needsScan) {
      requestIdleCallback(() => {
        if (!isActive) return;
        const blocked = scanAndHide();
        if (blocked > 0) {
          blockedCount += blocked;
          onBlockCallback?.();
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Stop blocking and restore hidden elements.
 */
export function stopBlocker(): void {
  if (!isActive) return;
  isActive = false;

  observer?.disconnect();
  observer = null;
  onBlockCallback = null;

  // Restore all hidden elements
  document
    .querySelectorAll('[data-social-blocker-hidden="true"]')
    .forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.display = "";
      delete htmlEl.dataset.socialBlockerHidden;
    });

  // Remove disabled class for CSS rules
  document.documentElement.classList.add("social-blocker-disabled");
}

export function getBlockedCount(): number {
  return blockedCount;
}
