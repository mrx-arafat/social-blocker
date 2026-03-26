import { formatTimeSaved } from "@/utils/constants";

interface StatsCardProps {
  blocksToday: number;
  timeSavedToday: number;
  totalBlocks: number;
}

export default function StatsCard({
  blocksToday,
  timeSavedToday,
  totalBlocks,
}: StatsCardProps) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-3">
      <Stat value={blocksToday.toString()} label="today" />
      <Stat value={formatTimeSaved(timeSavedToday)} label="saved" />
      <Stat value={totalBlocks.toString()} label="total" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass-dark rounded-xl p-3 text-center card-hover">
      <div className="text-lg font-bold text-white count-animate">{value}</div>
      <div className="text-[9px] font-semibold text-neutral-500 mt-0.5 uppercase tracking-[0.15em]">
        {label}
      </div>
    </div>
  );
}
