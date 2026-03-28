/**
 * Content script — runs on youtube.com.
 *
 * Coordinates the blocking engine (DOM manipulation),
 * URL monitor (SPA navigation detection), and overlay mounting.
 */

import { startBlocker, stopBlocker } from "./blocker-engine";
import { startUrlMonitor, stopUrlMonitor } from "./url-monitor";
import { showOverlay, hideOverlay } from "./mount-overlay";
import "./style.css";

export default defineContentScript({
  matches: ["*://www.youtube.com/*", "*://youtube.com/*"],
  cssInjectionMode: "manifest",
  runAt: "document_idle",

  async main(ctx) {
    const { extensionEnabled, blockerStates, streakDays, getTodayStats } =
      await import("@/utils/storage");

    let isEnabled = await extensionEnabled.getValue();
    const blockers = await blockerStates.getValue();
    let shortsBlockerEnabled = blockers["youtube-shorts"] ?? true;

    function shouldBlock(): boolean {
      return isEnabled && shortsBlockerEnabled;
    }

    // Notify background of block events
    function onBlock(): void {
      browser.runtime.sendMessage({
        type: "BLOCK_EVENT",
        blockerId: "youtube-shorts",
      });
    }

    // Handle URL changes — show/hide overlay for Shorts pages
    async function onUrlChange(
      _url: string,
      isShortsPage: boolean,
    ): Promise<void> {
      if (!shouldBlock()) return;

      if (isShortsPage) {
        const [streak, todayStats] = await Promise.all([
          streakDays.getValue(),
          getTodayStats(),
        ]);
        await showOverlay(ctx, { streakDays: streak, todayStats });
        onBlock();
      } else {
        hideOverlay();
      }
    }

    // Start or stop based on current state
    function updateState(): void {
      if (shouldBlock()) {
        startBlocker(onBlock);
        startUrlMonitor(onUrlChange);
      } else {
        stopBlocker();
        stopUrlMonitor();
        hideOverlay();
      }
    }

    // Listen for storage changes
    extensionEnabled.watch((newValue) => {
      isEnabled = newValue;
      updateState();
    });

    blockerStates.watch((newValue) => {
      shortsBlockerEnabled = newValue["youtube-shorts"] ?? true;
      updateState();
    });

    // Listen for messages from background/popup
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as { type: string; enabled?: boolean };
      if (msg.type === "TOGGLE_ENABLED") {
        isEnabled = msg.enabled ?? false;
        updateState();
      }
    });

    // Initial start
    updateState();

    // Cleanup on context invalidation (extension reload/update)
    ctx.onInvalidated(() => {
      stopBlocker();
      stopUrlMonitor();
      hideOverlay();
    });
  },
});
