interface QuoteCardProps {
  quote: string;
}

export default function QuoteCard({ quote }: QuoteCardProps) {
  return (
    <div className="glass-dark rounded-2xl p-4 mb-3 card-hover quote-fade">
      <div className="flex gap-3 items-start">
        <span className="text-orange-500/60 text-2xl leading-none font-serif select-none mt-[-2px]">
          "
        </span>
        <p className="text-[12px] text-neutral-400 leading-relaxed flex-1 italic">
          {quote}
        </p>
      </div>
    </div>
  );
}
