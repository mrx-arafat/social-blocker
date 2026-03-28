import { storage } from "wxt/storage";
import type { DailyStats, Goal, StorageData } from "./types";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export const extensionEnabled = storage.defineItem<boolean>("local:enabled", {
  fallback: true,
});

export const blockerStates = storage.defineItem<Record<string, boolean>>(
  "local:blockers",
  { fallback: { "instagram-reels": true, "youtube-shorts": true } },
);

export const totalBlocks = storage.defineItem<number>("local:totalBlocks", {
  fallback: 0,
});

export const streakDays = storage.defineItem<number>("local:streakDays", {
  fallback: 0,
});

export const streakStart = storage.defineItem<string | null>(
  "local:streakStart",
  { fallback: null },
);

export const lastDisabledAt = storage.defineItem<number | null>(
  "local:lastDisabledAt",
  { fallback: null },
);

export const dailyStats = storage.defineItem<DailyStats[]>(
  "local:dailyStats",
  { fallback: [] },
);

export const goals = storage.defineItem<Goal[]>("local:goals", {
  fallback: [],
});

export async function incrementBlockCount(): Promise<void> {
  const today = getTodayString();
  const stats = await dailyStats.getValue();
  const todayIndex = stats.findIndex((s) => s.date === today);

  if (todayIndex >= 0) {
    stats[todayIndex].blocksCount++;
    stats[todayIndex].timeSavedSeconds += 30;
  } else {
    stats.push({ date: today, blocksCount: 1, timeSavedSeconds: 30 });
  }

  // Keep only last 7 days, sorted by date
  const recent = stats.sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  await dailyStats.setValue(recent);
  await totalBlocks.setValue((await totalBlocks.getValue()) + 1);
}

export async function getTodayStats(): Promise<DailyStats> {
  const today = getTodayString();
  const stats = await dailyStats.getValue();
  return (
    stats.find((s) => s.date === today) ?? {
      date: today,
      blocksCount: 0,
      timeSavedSeconds: 0,
    }
  );
}

export async function getFullState(): Promise<StorageData> {
  const [enabled, blockers, total, streak, start, disabled, stats, g] =
    await Promise.all([
      extensionEnabled.getValue(),
      blockerStates.getValue(),
      totalBlocks.getValue(),
      streakDays.getValue(),
      streakStart.getValue(),
      lastDisabledAt.getValue(),
      dailyStats.getValue(),
      goals.getValue(),
    ]);

  return {
    enabled,
    blockers,
    totalBlocks: total,
    streakDays: streak,
    streakStart: start,
    lastDisabledAt: disabled,
    dailyStats: stats,
    goals: g,
  };
}
