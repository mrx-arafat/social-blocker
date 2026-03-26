import { useState } from "react";
import type { Goal } from "@/utils/types";

interface GoalsSectionProps {
  goals: Goal[];
  onAddGoal: (text: string) => void;
  onToggleGoal: (id: string) => void;
  onRemoveGoal: (id: string) => void;
}

export default function GoalsSection({
  goals,
  onAddGoal,
  onToggleGoal,
  onRemoveGoal,
}: GoalsSectionProps) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  function handleAdd(): void {
    const t = text.trim();
    if (t) {
      onAddGoal(t);
      setText("");
      setAdding(false);
    }
  }

  function handleKey(e: React.KeyboardEvent): void {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setAdding(false);
      setText("");
    }
  }

  return (
    <div className="glass-dark rounded-2xl p-5 mb-3 card-hover">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em]">
          Intentions
        </span>
        {goals.length < 3 && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-[10px] font-semibold text-orange-500 hover:text-orange-400 transition-colors"
          >
            + Add
          </button>
        )}
      </div>

      {goals.length === 0 && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3.5 rounded-xl border border-dashed border-neutral-700 text-neutral-600 hover:border-neutral-600 hover:text-neutral-500 transition-colors text-[12px] font-medium"
        >
          Set an intention for this week
        </button>
      )}

      <div className="space-y-2">
        {goals.map((goal) => (
          <div key={goal.id} className="flex items-start gap-2.5 group py-0.5">
            <button
              onClick={() => onToggleGoal(goal.id)}
              className={`flex-shrink-0 w-[18px] h-[18px] mt-0.5 rounded border-[1.5px] transition-all duration-200 flex items-center justify-center ${
                goal.completed
                  ? "bg-orange-500 border-orange-500"
                  : "border-neutral-600 hover:border-neutral-400"
              }`}
            >
              {goal.completed && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span
              className={`text-[12px] leading-snug flex-1 transition-all ${
                goal.completed
                  ? "text-neutral-600 line-through"
                  : "text-neutral-300"
              }`}
            >
              {goal.text}
            </span>
            <button
              onClick={() => onRemoveGoal(goal.id)}
              className="flex-shrink-0 text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g., Read 20 pages today"
              maxLength={80}
              autoFocus
              className="flex-1 text-[12px] px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
            />
            <button
              onClick={handleAdd}
              disabled={!text.trim()}
              className="px-3 py-2 rounded-lg text-[11px] font-bold bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
