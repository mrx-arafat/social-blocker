/**
 * Mount/unmount the motivational overlay using WXT's Shadow DOM UI.
 *
 * The overlay is mounted inside a shadow root so Instagram's CSS
 * can't affect it, and our Tailwind styles don't leak into Instagram.
 */

import { createShadowRootUi, type ContentScriptContext } from "wxt/client";
import ReactDOM from "react-dom/client";
import { createElement } from "react";
import Overlay from "./overlay";
import type { DailyStats } from "@/utils/types";

let currentUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
let currentRoot: ReactDOM.Root | null = null;

export async function showOverlay(
  ctx: ContentScriptContext,
  stats: { streakDays: number; todayStats: DailyStats },
): Promise<void> {
  // Don't mount twice
  if (currentUi) return;

  const ui = await createShadowRootUi(ctx, {
    name: "social-blocker-overlay",
    position: "overlay",
    zIndex: 999999,
    anchor: "body",
    onMount: (container) => {
      const wrapper = document.createElement("div");
      container.append(wrapper);

      const root = ReactDOM.createRoot(wrapper);
      root.render(
        createElement(Overlay, {
          streakDays: stats.streakDays,
          timeSavedToday: stats.todayStats.timeSavedSeconds,
          blocksToday: stats.todayStats.blocksCount,
        }),
      );

      currentRoot = root;
      return root;
    },
    onRemove: (root) => {
      root?.unmount();
      currentRoot = null;
    },
  });

  ui.mount();
  currentUi = ui;
}

export function hideOverlay(): void {
  if (currentUi) {
    currentUi.remove();
    currentUi = null;
  }
}
