interface StreakCardProps {
  days: number;
}

export default function StreakCard({ days }: StreakCardProps) {
  const milestone =
    days === 0
      ? "Day zero. This is where it starts."
      : days === 1
        ? "First day done. Momentum begins."
        : days < 7
          ? "Building discipline. Stay sharp."
          : days < 14
            ? "One full week. The grip is loosening."
            : days < 30
              ? "Two weeks strong. You're rewriting the habit."
              : "A month. You've broken the chain.";

  const icon =
    days === 0 ? "◯" : days < 7 ? "🔥" : days < 30 ? "⚡" : "◆";

  return (
    <div className="glass-accent rounded-2xl p-6 mb-3 text-center card-hover">
      <div className="flame-breath text-4xl mb-2 select-none">{icon}</div>

      <div className="count-animate">
        <span className="text-5xl font-black text-white tracking-tighter">
          {days}
        </span>
      </div>

      <div className="text-xs font-bold text-orange-400/80 mt-1 tracking-[0.2em] uppercase">
        {days === 1 ? "day" : "days"} clean
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          {milestone}
        </p>
      </div>
    </div>
  );
}
