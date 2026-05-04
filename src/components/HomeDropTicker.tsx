"use client";

import { useMemo, memo } from "react";
import Image from "next/image";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import type { Drop } from "@/types/db";
import { isFirebaseStorageMediaUrl } from "@/lib/media-hosts";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";

interface HomeDropTickerProps {
  drops: Drop[];
}

export const HomeDropTicker = memo(function HomeDropTicker({ drops }: HomeDropTickerProps) {
  const tickerDrops = useMemo(() => drops.slice(0, 8), [drops]);
  const duplicatedTickerDrops = useMemo(() => [...tickerDrops, ...tickerDrops], [tickerDrops]);
  const imagePolicy = useMemo(() => getImageLoadingPolicy("home_drop_ticker"), []);
  if (tickerDrops.length === 0) return null;

  const renderTrack = () => (
    <div className="flex gap-3 will-change-transform motion-reduce:animate-none md:gap-4 animate-[ticker_24s_linear_infinite]">
      {duplicatedTickerDrops.map((drop, idx) => (
        <div key={`${drop.id}-${idx}`} className="w-36 md:w-44 shrink-0 rounded-2xl overflow-hidden border border-white/10 bg-black/60">
          <div className="relative w-full h-24 md:h-28 bg-black">
            <Image
              src={drop.imageUrl}
              alt={drop.title}
              fill
              loading={imagePolicy.loading}
              preload={imagePolicy.preload}
              fetchPriority={imagePolicy.fetchPriority}
              quality={imagePolicy.quality}
              sizes={imagePolicy.sizes}
              className="object-contain"
              decoding="async"
              unoptimized={isFirebaseStorageMediaUrl(drop.imageUrl)}
              {...getImagePolicyDataAttributes(imagePolicy)}
            />
          </div>
          <div className="p-2 text-left">
            <TitleMarquee
              title={drop.title}
              delaySeed={drop.id.charCodeAt(0) % 6}
              className="text-[11px] md:text-xs font-semibold text-white"
            />
            <p className="text-[10px] text-brand-purple">{drop.unlockCost} GD</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mt-6 [content-visibility:auto] [contain-intrinsic-size:180px] md:mt-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-3">
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
