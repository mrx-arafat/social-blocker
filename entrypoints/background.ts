/**
 * Background script — handles URL-level blocking and stats management.
 *
 * Uses declarativeNetRequest dynamic rules to redirect Reels URLs
 * before the page even loads. Also manages stats and streak tracking.
 */

import {
  extensionEnabled,
  lastDisabledAt,
  incrementBlockCount,
} from "@/utils/storage";
import { updateStreak, rotateDailyStats } from "@/utils/stats";

export default defineBackground(() => {
  const RULE_IDS = {
    REELS_PAGE: 1,
    REEL_SINGLE: 2,
    PROFILE_REELS: 3,
  };

  const REDIRECT_URL = "https://www.instagram.com/";

  /** Add declarativeNetRequest dynamic rules for blocking Reels URLs. */
  async function enableUrlBlocking(): Promise<void> {
    try {
      const rules = [
        {
          id: RULE_IDS.REELS_PAGE,
          priority: 1,
          action: {
            type: "redirect" as const,
            redirect: { url: REDIRECT_URL },
          },
          condition: {
            urlFilter: "||www.instagram.com/reels",
            resourceTypes: ["main_frame" as const],
          },
        },
        {
          id: RULE_IDS.REEL_SINGLE,
          priority: 1,
          action: {
            type: "redirect" as const,
            redirect: { url: REDIRECT_URL },
          },
          condition: {
            urlFilter: "||www.instagram.com/reel/",
            resourceTypes: ["main_frame" as const],
          },
        },
        {
          id: RULE_IDS.PROFILE_REELS,
          priority: 1,
          action: {
            type: "redirect" as const,
            redirect: { url: REDIRECT_URL },
          },
          condition: {
            urlFilter: "||www.instagram.com/*/reels",
            resourceTypes: ["main_frame" as const],
          },
        },
      ];

      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: Object.values(RULE_IDS),
        addRules: rules,
      });
    } catch (e) {
      console.error("[Social Blocker] Failed to enable URL blocking:", e);
    }
  }

  /** Remove all dynamic rules. */
  async function disableUrlBlocking(): Promise<void> {
    try {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: Object.values(RULE_IDS),
      });
    } catch (e) {
      console.error("[Social Blocker] Failed to disable URL blocking:", e);
    }
  }

  /** Handle messages from content script and popup. */
  browser.runtime.onMessage.addListener(
    (message: unknown) => {
      const msg = message as { type: string; blockerId?: string; enabled?: boolean };
      switch (msg.type) {
        case "BLOCK_EVENT":
          incrementBlockCount();
          break;

        case "TOGGLE_ENABLED":
          if (msg.enabled) {
            enableUrlBlocking();
          } else {
            disableUrlBlocking();
            lastDisabledAt.setValue(Date.now());
          }
          extensionEnabled.setValue(msg.enabled!);
          break;

        case "TOGGLE_BLOCKER":
          // Future: handle per-blocker toggling
          break;
      }
    },
  );

  /** Set up daily alarm for stats rotation and streak update. */
  browser.alarms.create("daily-rotation", {
    periodInMinutes: 60, // Check every hour
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "daily-rotation") {
      await rotateDailyStats();
      await updateStreak();
    }
  });

  /** On install/startup — initialize state. */
  browser.runtime.onInstalled.addListener(async () => {
    const enabled = await extensionEnabled.getValue();
    if (enabled) {
      await enableUrlBlocking();
    }
    await rotateDailyStats();
    await updateStreak();
  });

  // Also run on startup (service worker restart)
  browser.runtime.onStartup.addListener(async () => {
    const enabled = await extensionEnabled.getValue();
    if (enabled) {
      await enableUrlBlocking();
    }
    await rotateDailyStats();
    await updateStreak();
  });
});
