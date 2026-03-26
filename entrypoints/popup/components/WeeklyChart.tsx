import type { DailyStats } from "@/utils/types";

interface WeeklyChartProps {
  data: DailyStats[];
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const maxBlocks = Math.max(...data.map((d) => d.blocksCount), 1);
  const today = new Date().toISOString().split("T")[0];
  const totalWeek = data.reduce((s, d) => s + d.blocksCount, 0);

  return (
    <div className="glass-dark rounded-2xl p-5 mb-3 card-hover">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.15em]">
          This week
        </span>
        <span className="text-[10px] text-neutral-600 font-medium">
          {totalWeek} blocked
        </span>
      </div>

      <div className="flex items-end justify-between gap-1.5 h-20">
        {data.map((day) => {
          const pct = Math.max(
            (day.blocksCount / maxBlocks) * 100,
            day.blocksCount > 0 ? 10 : 3,
          );
          const dow = new Date(day.date + "T12:00:00").getDay();
          const isToday = day.date === today;

          return (
            <div key={day.date} className="flex flex-col items-center flex-1 gap-1">
              <span
                className={`text-[8px] font-bold ${
                  day.blocksCount > 0 ? "text-neutral-500" : "text-transparent"
                }`}
              >
                {day.blocksCount}
              </span>

              <div className="w-full flex items-end justify-center h-14">
                <div
                  className={`w-full max-w-[20px] rounded-md transition-all duration-500 ${
                    isToday
                      ? "bg-gradient-to-t from-orange-600 to-orange-400"
                      : day.blocksCount > 0
                        ? "bg-neutral-700"
                        : "bg-neutral-800/50"
                  }`}
                  style={{
                    height: `${pct}%`,
                    boxShadow: isToday
                      ? "0 0 12px rgba(249, 115, 22, 0.25)"
                      : "none",
                  }}
                />
              </div>

              <span
                className={`text-[9px] font-semibold ${
                  isToday ? "text-orange-400" : "text-neutral-600"
                }`}
              >
                {DAY_LABELS[dow]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
