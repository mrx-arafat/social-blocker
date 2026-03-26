import { useEffect, useState } from "react";
import Header from "./components/Header";
import StreakCard from "./components/StreakCard";
import StatsCard from "./components/StatsCard";
import QuoteCard from "./components/QuoteCard";
import WeeklyChart from "./components/WeeklyChart";
import GoalsSection from "./components/GoalsSection";
import BlockerList from "./components/BlockerList";
import { getRandomQuote } from "@/utils/constants";
import { getWeeklyStats } from "@/utils/stats";
import type { StorageData, DailyStats, Goal } from "@/utils/types";
import {
  extensionEnabled,
  blockerStates as blockerStatesStorage,
  streakDays as streakDaysStorage,
  totalBlocks as totalBlocksStorage,
  goals as goalsStorage,
  getFullState,
  getTodayStats,
} from "@/utils/storage";

export default function App() {
  const [state, setState] = useState<StorageData | null>(null);
  const [todayStats, setTodayStats] = useState<DailyStats>({
    date: "",
    blocksCount: 0,
    timeSavedSeconds: 0,
  });
  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);
  const [quote] = useState(getRandomQuote);

  useEffect(() => {
    async function load(): Promise<void> {
      const [fullState, today, weekly] = await Promise.all([
        getFullState(),
        getTodayStats(),
        getWeeklyStats(),
      ]);
      setState(fullState);
      setTodayStats(today);
      setWeeklyData(weekly);
    }
    load();

    const unwatchEnabled = extensionEnabled.watch((val) =>
      setState((prev) => (prev ? { ...prev, enabled: val } : prev)),
    );
    const unwatchStreak = streakDaysStorage.watch((val) =>
      setState((prev) => (prev ? { ...prev, streakDays: val } : prev)),
    );
    const unwatchTotal = totalBlocksStorage.watch((val) =>
      setState((prev) => (prev ? { ...prev, totalBlocks: val } : prev)),
    );
    const unwatchGoals = goalsStorage.watch((val) =>
      setState((prev) => (prev ? { ...prev, goals: val } : prev)),
    );

    return () => {
      unwatchEnabled();
      unwatchStreak();
      unwatchTotal();
      unwatchGoals();
    };
  }, []);

  if (!state) {
    return (
      <div className="min-h-[580px] bg-dark-gradient flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-neutral-800 animate-pulse" />
      </div>
    );
  }

  async function handleToggleEnabled(enabled: boolean): Promise<void> {
    await extensionEnabled.setValue(enabled);
    browser.runtime.sendMessage({ type: "TOGGLE_ENABLED", enabled });
    setState((prev) => (prev ? { ...prev, enabled } : prev));
  }

  async function handleToggleBlocker(
    blockerId: string,
    enabled: boolean,
  ): Promise<void> {
    const newBlockers = { ...state!.blockers, [blockerId]: enabled };
    await blockerStatesStorage.setValue(newBlockers);
    setState((prev) => (prev ? { ...prev, blockers: newBlockers } : prev));
  }

  async function handleAddGoal(text: string): Promise<void> {
    const newGoal: Goal = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    const newGoals = [...state!.goals, newGoal];
    await goalsStorage.setValue(newGoals);
    setState((prev) => (prev ? { ...prev, goals: newGoals } : prev));
  }

  async function handleToggleGoal(id: string): Promise<void> {
    const newGoals = state!.goals.map((g) =>
      g.id === id ? { ...g, completed: !g.completed } : g,
    );
    await goalsStorage.setValue(newGoals);
    setState((prev) => (prev ? { ...prev, goals: newGoals } : prev));
  }

  async function handleRemoveGoal(id: string): Promise<void> {
    const newGoals = state!.goals.filter((g) => g.id !== id);
    await goalsStorage.setValue(newGoals);
    setState((prev) => (prev ? { ...prev, goals: newGoals } : prev));
  }

  return (
    <div className="min-h-[580px] bg-dark-gradient">
      <div className="p-5 pb-6 overflow-y-auto max-h-[580px]">
        <Header enabled={state.enabled} onToggle={handleToggleEnabled} />

        {!state.enabled && (
          <div className="mb-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-red-400">
                  Shield is down
                </p>
                <p className="text-[11px] text-red-400/50 mt-0.5">
                  You're exposed to the scroll right now.
                </p>
              </div>
            </div>
          </div>
        )}

        <div
          className={`transition-opacity duration-300 ${
            state.enabled ? "opacity-100" : "opacity-40"
          }`}
        >
          <StreakCard days={state.streakDays} />
          <StatsCard
            blocksToday={todayStats.blocksCount}
            timeSavedToday={todayStats.timeSavedSeconds}
            totalBlocks={state.totalBlocks}
          />
          <QuoteCard quote={quote} />
          <WeeklyChart data={weeklyData} />
          <GoalsSection
            goals={state.goals}
            onAddGoal={handleAddGoal}
            onToggleGoal={handleToggleGoal}
            onRemoveGoal={handleRemoveGoal}
          />
        </div>

        <BlockerList
          blockerStates={state.blockers}
          onToggle={handleToggleBlocker}
        />

        <div className="mt-5 text-center">
          <p className="text-[9px] text-neutral-700 tracking-wider uppercase">
            Social Blocker v1.0 — break the chain
          </p>
        </div>
      </div>
    </div>
  );
}
