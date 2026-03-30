"use client";

import { useMemo, memo } from "react";
import Image from "next/image";
import type { Drop } from "@/types/db";

interface HomeDropTickerProps {
  drops: Drop[];
}

export const HomeDropTicker = memo(function HomeDropTicker({ drops }: HomeDropTickerProps) {
  const tickerDrops = useMemo(() => drops.slice(0, 8), [drops]);
  if (tickerDrops.length === 0) return null;

  const renderTrack = () => (
    <div className="flex gap-3 md:gap-4 animate-[ticker_24s_linear_infinite]">
      {[...tickerDrops, ...tickerDrops].map((drop, idx) => (
        <div key={`${drop.id}-${idx}`} className="w-36 md:w-44 shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-black/60">
          <div className="relative w-full h-24 md:h-28 bg-black">
            <Image src={drop.imageUrl} alt={drop.title} fill sizes="180px" className="object-contain" />
          </div>
          <div className="p-2 text-left">
            <p className="text-[11px] md:text-xs font-semibold text-white line-clamp-1">{drop.title}</p>
            <p className="text-[10px] text-brand-purple">{drop.unlockCost} GD</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mt-6 md:mt-8">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3 relative">
        {renderTrack()}
      </div>
      <style jsx>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
});
