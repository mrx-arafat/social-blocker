/**
 * Blocker Engine — removes Reels elements from Instagram's DOM.
 *
 * Uses MutationObserver to watch for dynamically added elements
 * (Instagram is a React SPA that renders content dynamically).
 * CSS handles the first-pass hiding; this handles elements that
 * CSS selectors can't easily target.
 */

import { instagramReelsBlocker } from "@/utils/blockers/instagram-reels";

let observer: MutationObserver | null = null;
let isActive = false;
let blockedCount = 0;
let onBlockCallback: (() => void) | null = null;

const REELS_SELECTORS = instagramReelsBlocker.cssSelectors;

/**
 * Scan a subtree for Reels elements and hide them.
 * Returns the number of elements hidden.
 */
function scanAndHide(root: Element | Document = document): number {
  let count = 0;

  for (const selector of REELS_SELECTORS) {
    const elements = root.querySelectorAll(selector);
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.dataset.socialBlockerHidden !== "true") {
        // Walk up to find the nearest meaningful container
        // Instagram wraps nav items in containers we should hide
        const container = findBlockableContainer(htmlEl);
        if (container) {
          container.style.display = "none";
          container.dataset.socialBlockerHidden = "true";
          count++;
        }
      }
    });
  }

  // Also scan for reels in feed — look for elements containing reel-like content
  // Instagram feed reels have links to /reel/ inside article-like containers
  const feedReels = root.querySelectorAll(
    'article a[href*="/reel/"], div[role="presentation"] a[href*="/reel/"]',
  );
  feedReels.forEach((el) => {
    const article = el.closest("article") || el.closest('[role="presentation"]');
    if (article) {
      const htmlArticle = article as HTMLElement;
      if (htmlArticle.dataset.socialBlockerHidden !== "true") {
        htmlArticle.style.display = "none";
        htmlArticle.dataset.socialBlockerHidden = "true";
        count++;
      }
    }
  });

  return count;
}

/**
 * Find the right container to hide.
 * For nav items, we want to hide the parent <li> or nav item wrapper.
 * For feed items, we want to hide the post container.
 */
function findBlockableContainer(el: HTMLElement): HTMLElement | null {
  // For navigation links, hide the closest list item or nav container
  const navItem =
    el.closest("li") ||
    el.closest('[role="listitem"]') ||
    el.closest('[role="menuitem"]');
  if (navItem) return navItem as HTMLElement;

  // For standalone links, just hide the link itself
  return el;
}

/**
 * Start the MutationObserver to watch for new Reels elements.
 */
export function startBlocker(onBlock: () => void): void {
  if (isActive) return;
  isActive = true;
  onBlockCallback = onBlock;

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
