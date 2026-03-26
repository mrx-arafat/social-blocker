import { getAllBlockers } from "@/utils/blockers";

interface BlockerListProps {
  blockerStates: Record<string, boolean>;
  onToggle: (blockerId: string, enabled: boolean) => void;
}

export default function BlockerList({
  blockerStates,
  onToggle,
}: BlockerListProps) {
  const blockers = getAllBlockers();

  return (
    <div className="glass-dark rounded-2xl p-5 card-hover">
      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em] block mb-3">
        Blocking rules
      </span>

      <div className="space-y-3">
        {blockers.map((blocker) => {
          const enabled = blockerStates[blocker.id] ?? blocker.enabled;

          return (
            <div key={blocker.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center border border-pink-500/10">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <line x1="18" y1="2" x2="22" y2="6" />
                  </svg>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-neutral-200">
                    {blocker.name}
                  </div>
                  <div className="text-[9px] text-neutral-600 mt-0.5 font-medium uppercase tracking-wider">
                    Nuclear — no bypass
                  </div>
                </div>
              </div>

              <button
                onClick={() => onToggle(blocker.id, !enabled)}
                className={`toggle-track ${enabled ? "active" : "inactive"}`}
                style={{ width: 40, height: 22 }}
                aria-label={`Toggle ${blocker.name}`}
              >
                <div
                  className="toggle-thumb"
                  style={{ width: 18, height: 18, top: 2 }}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5">
        <span className="text-[10px] text-neutral-700 italic">
          YouTube Shorts, TikTok — coming soon
        </span>
      </div>
    </div>
  );
}
