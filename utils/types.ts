export interface BlockerConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  urlPatterns: string[];
  cssSelectors: string[];
  urlMatchPatterns: RegExp[];
  enabled: boolean;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  blocksCount: number;
  timeSavedSeconds: number;
}

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface StorageData {
  enabled: boolean;
  blockers: Record<string, boolean>;
  totalBlocks: number;
  streakDays: number;
  streakStart: string | null; // YYYY-MM-DD
  lastDisabledAt: number | null;
  dailyStats: DailyStats[];
  goals: Goal[];
}

export type MessageType =
  | { type: "BLOCK_EVENT"; blockerId: string }
  | { type: "TOGGLE_ENABLED"; enabled: boolean }
  | { type: "TOGGLE_BLOCKER"; blockerId: string; enabled: boolean }
  | { type: "GET_STATE" }
  | { type: "STATE_UPDATE"; data: Partial<StorageData> };
