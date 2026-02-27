"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useDrops } from "@/hooks/useDrops";
import { useAuthIdentity } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";

export function HomeDropTicker() {
  const { user } = useAuthIdentity();
  const { openAuthModal } = useUI();
  const { drops } = useDrops(["active", "scheduled"]);

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
        {!user && <div className="absolute inset-0 backdrop-blur-md bg-black/35 z-10" />}
        {renderTrack()}
      </div>
      {!user && (
        <div className="mt-3 text-center">
          <button onClick={openAuthModal} className="text-sm text-brand-pink font-semibold underline underline-offset-4">
            Sign up to start unwrapping
          </button>
        </div>
      )}
      <style jsx>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
