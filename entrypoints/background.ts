/**
 * Background script — handles URL-level blocking and stats management.
 *
 * Uses declarativeNetRequest dynamic rules to redirect Reels/Shorts URLs
 * before the page even loads. Also manages stats and streak tracking.
 */

import {
  extensionEnabled,
  blockerStates,
  lastDisabledAt,
  incrementBlockCount,
} from "@/utils/storage";
import { updateStreak, rotateDailyStats } from "@/utils/stats";

export default defineBackground(() => {
  const INSTAGRAM_RULE_IDS = [1, 2, 3];
  const YOUTUBE_RULE_IDS = [4, 5, 6];
  const ALL_RULE_IDS = [...INSTAGRAM_RULE_IDS, ...YOUTUBE_RULE_IDS];

  const INSTAGRAM_REDIRECT = "https://www.instagram.com/";
  const YOUTUBE_REDIRECT = "https://www.youtube.com/";

  function getInstagramRules() {
    return [
      {
        id: 1,
        priority: 1,
        action: {
          type: "redirect" as const,
          redirect: { url: INSTAGRAM_REDIRECT },
        },
        condition: {
          urlFilter: "||www.instagram.com/reels",
          resourceTypes: ["main_frame" as const],
        },
      },
      {
        id: 2,
        priority: 1,
        action: {
          type: "redirect" as const,
          redirect: { url: INSTAGRAM_REDIRECT },
        },
        condition: {
          urlFilter: "||www.instagram.com/reel/",
          resourceTypes: ["main_frame" as const],
        },
      },
      {
        id: 3,
        priority: 1,
        action: {
          type: "redirect" as const,
          redirect: { url: INSTAGRAM_REDIRECT },
        },
        condition: {
          urlFilter: "||www.instagram.com/*/reels",
          resourceTypes: ["main_frame" as const],
        },
      },
    ];
  }

  function getYouTubeRules() {
    return [
      {
        id: 4,
        priority: 1,
        action: {
          type: "redirect" as const,
          redirect: { url: YOUTUBE_REDIRECT },
        },
        condition: {
          urlFilter: "||www.youtube.com/shorts/",
          resourceTypes: ["main_frame" as const],
        },
      },
      {
        id: 5,
        priority: 1,
        action: {
          type: "redirect" as const,
          redirect: { url: YOUTUBE_REDIRECT },
        },
        condition: {
          urlFilter: "||www.youtube.com/shorts",
          resourceTypes: ["main_frame" as const],
        },
      },
      {
        id: 6,
        priority: 1,
        action: {
          type: "redirect" as const,
          redirect: { url: YOUTUBE_REDIRECT },
        },
        condition: {
          urlFilter: "||youtube.com/shorts",
          resourceTypes: ["main_frame" as const],
        },
      },
    ];
  }

  /** Enable URL blocking for all active blockers. */
  async function enableAllUrlBlocking(): Promise<void> {
    try {
      const states = await blockerStates.getValue();
      const rules = [];

      if (states["instagram-reels"] ?? true) {
        rules.push(...getInstagramRules());
      }
      if (states["youtube-shorts"] ?? true) {
        rules.push(...getYouTubeRules());
      }

      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ALL_RULE_IDS,
        addRules: rules,
      });
    } catch (e) {
      console.error("[Social Blocker] Failed to enable URL blocking:", e);
    }
  }

  /** Remove all dynamic rules. */
  async function disableAllUrlBlocking(): Promise<void> {
    try {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ALL_RULE_IDS,
      });
    } catch (e) {
      console.error("[Social Blocker] Failed to disable URL blocking:", e);
    }
  }

  /** Toggle URL blocking for a specific blocker. */
  async function toggleBlockerRules(
    blockerId: string,
    enabled: boolean,
  ): Promise<void> {
    try {
      let ruleIds: number[];
      let rules;

      if (blockerId === "instagram-reels") {
        ruleIds = INSTAGRAM_RULE_IDS;
        rules = getInstagramRules();
      } else if (blockerId === "youtube-shorts") {
        ruleIds = YOUTUBE_RULE_IDS;
        rules = getYouTubeRules();
      } else {
        return;
      }

      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds,
        addRules: enabled ? rules : [],
      });
    } catch (e) {
      console.error(`[Social Blocker] Failed to toggle ${blockerId}:`, e);
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
            enableAllUrlBlocking();
          } else {
            disableAllUrlBlocking();
            lastDisabledAt.setValue(Date.now());
          }
          extensionEnabled.setValue(msg.enabled!);
          break;

        case "TOGGLE_BLOCKER":
          if (msg.blockerId && msg.enabled !== undefined) {
            blockerStates.getValue().then((current) => {
              blockerStates.setValue({ ...current, [msg.blockerId!]: msg.enabled! });
            });
            toggleBlockerRules(msg.blockerId, msg.enabled);
          }
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
      await enableAllUrlBlocking();
    }
    await rotateDailyStats();
    await updateStreak();
  });

  // Also run on startup (service worker restart)
  browser.runtime.onStartup.addListener(async () => {
    const enabled = await extensionEnabled.getValue();
    if (enabled) {
      await enableAllUrlBlocking();
    }
    await rotateDailyStats();
    await updateStreak();
  });
});
