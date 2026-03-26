interface HeaderProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function Header({ enabled, onToggle }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {/* Broken chain icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center border border-neutral-700/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
              stroke="#a3a3a3"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
              stroke="#a3a3a3"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Break slash */}
            <line
              x1="9"
              y1="9"
              x2="15"
              y2="15"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-white tracking-tight">
            Social Blocker
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                enabled
                  ? "bg-orange-500 status-pulse"
                  : "bg-neutral-600"
              }`}
            />
            <span className="text-[11px] text-neutral-500 font-medium">
              {enabled ? "Shield active" : "Shield down"}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onToggle(!enabled)}
        className={`toggle-track ${enabled ? "active" : "inactive"}`}
        aria-label={enabled ? "Disable blocking" : "Enable blocking"}
      >
        <div className="toggle-thumb" />
      </button>
    </div>
  );
}
