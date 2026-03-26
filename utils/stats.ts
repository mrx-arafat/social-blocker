import {
  streakDays,
  streakStart,
  lastDisabledAt,
  dailyStats,
  goals,
} from "./storage";
import type { DailyStats } from "./types";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/**
 * Recalculate streak based on lastDisabledAt timestamp.
 * If the extension was disabled at any point during today or yesterday,
 * the streak resets.
 */
export async function updateStreak(): Promise<void> {
  const today = getTodayString();
  const disabled = await lastDisabledAt.getValue();

  if (disabled !== null) {
    const disabledDate = new Date(disabled).toISOString().split("T")[0];
    const yesterday = getYesterdayString();

    if (disabledDate === today || disabledDate === yesterday) {
      // Extension was disabled recently — reset streak
      await streakDays.setValue(0);
      await streakStart.setValue(null);
      return;
    }
  }

  // Check if we need to increment the streak
  const currentStart = await streakStart.getValue();
  if (currentStart === null) {
    // First day of streak
    await streakStart.setValue(today);
    await streakDays.setValue(1);
  } else {
    // Calculate days since streak start
    const startDate = new Date(currentStart);
    const todayDate = new Date(today);
    const diffMs = todayDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    await streakDays.setValue(diffDays);
  }
}

/**
 * Rotate daily stats — keep only the last 7 days.
 * Called on day change or extension startup.
 */
export async function rotateDailyStats(): Promise<void> {
  const stats = await dailyStats.getValue();
  const today = getTodayString();

  // Ensure today has an entry
  if (!stats.find((s) => s.date === today)) {
    stats.push({ date: today, blocksCount: 0, timeSavedSeconds: 0 });
  }

  // Keep only last 7 days
  const recent = stats
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  await dailyStats.setValue(recent);

  // Reset goals older than 7 days
  const currentGoals = await goals.getValue();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeGoals = currentGoals.filter((g) => g.createdAt > oneWeekAgo);
  if (activeGoals.length !== currentGoals.length) {
    await goals.setValue(activeGoals);
  }
}

/**
 * Get stats for the last 7 days, filling gaps with zeros.
 */
export async function getWeeklyStats(): Promise<DailyStats[]> {
  const stats = await dailyStats.getValue();
  const result: DailyStats[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const existing = stats.find((s) => s.date === dateStr);
    result.push(
      existing ?? { date: dateStr, blocksCount: 0, timeSavedSeconds: 0 },
    );
  }

  return result;
}
