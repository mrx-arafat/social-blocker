/**
 * URL Monitor — detects SPA navigation to Reels pages.
 *
 * Three-layer detection:
 * 1. Proxy on history.pushState/replaceState — catches programmatic navigation
 * 2. popstate event listener — catches back/forward navigation
 * 3. setInterval polling (500ms) — belt-and-suspenders fallback
 */

import { isReelsUrl } from "@/utils/blockers";

type UrlChangeCallback = (url: string, isReelsPage: boolean) => void;

let currentUrl = window.location.href;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let callback: UrlChangeCallback | null = null;
let isMonitoring = false;

// Store original history methods for restoration
const origPushState = history.pushState.bind(history);
const origReplaceState = history.replaceState.bind(history);

function checkUrl(): void {
  const newUrl = window.location.href;
  if (newUrl !== currentUrl) {
    currentUrl = newUrl;
    callback?.(newUrl, isReelsUrl(newUrl));
  }
}

function patchHistoryMethod(method: "pushState" | "replaceState"): void {
  const original =
    method === "pushState" ? origPushState : origReplaceState;
  history[method] = function (...args: Parameters<typeof history.pushState>) {
    const result = original(...args);
    checkUrl();
    return result;
  };
}

function restoreHistoryMethods(): void {
  history.pushState = origPushState;
  history.replaceState = origReplaceState;
}

export function startUrlMonitor(onUrlChange: UrlChangeCallback): void {
  if (isMonitoring) return;
  isMonitoring = true;
  callback = onUrlChange;
  currentUrl = window.location.href;

  // Layer 1: Proxy pushState/replaceState
  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  // Layer 2: popstate for back/forward
  window.addEventListener("popstate", checkUrl);

  // Layer 3: Polling fallback every 500ms
  pollInterval = setInterval(checkUrl, 500);

  // Initial check
  onUrlChange(currentUrl, isReelsUrl(currentUrl));
}

export function stopUrlMonitor(): void {
  if (!isMonitoring) return;
  isMonitoring = false;

  // Restore original history methods
  restoreHistoryMethods();

  window.removeEventListener("popstate", checkUrl);

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  callback = null;
}
