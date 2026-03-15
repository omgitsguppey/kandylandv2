"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { ArrowRight, Images, Sparkles } from "lucide-react";

import { useDrops } from "@/hooks/useDrops";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { trackEvent } from "@/lib/telemetry";

const INITIAL_NOW_MS = Date.now();

export function LiveDropsForYouCarousel() {
  const router = useRouter();
  const { drops, loading } = useDrops(["active"]);
  const [nowMs, setNowMs] = useState(INITIAL_NOW_MS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const activeDrops = useMemo(
    () =>
      drops
        .filter((drop) => {
          if (drop.status !== "active") {
            return false;
          }

          if (Number.isFinite(drop.validFrom) && drop.validFrom > nowMs) {
            return false;
          }

          if (Number.isFinite(drop.validUntil) && Number(drop.validUntil) <= nowMs) {
            return false;
          }

          return true;
        })
        .slice(0, 8),
    [drops, nowMs],
  );

  if (!loading && activeDrops.length === 0) {
    return null;
  }

  return (
    <section className="glass-panel rounded-[2rem] border border-white/10 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/30 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Live Drops For You
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Tap any live cover to jump straight into the drop lineup.
          </p>
        </div>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
        {activeDrops.map((drop) => (
          <button
            key={drop.id}
            type="button"
            onClick={() => {
              trackEvent("navigation_click", {
                destination: "/drops",
                source: "experiences_live_drops",
                drop_id: drop.id,
              });
              router.push("/drops");
            }}
            className="group relative flex-[0_0_12rem] snap-start overflow-hidden rounded-[1.6rem] border border-white/10 bg-zinc-950 text-left"
            style={{ aspectRatio: getSupportedDropAspectRatio(drop).replace(":", " / ") }}
          >
            <NextImage
              src={drop.imageUrl}
              alt={drop.title}
              fill
              sizes="192px"
              className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

            <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <Images className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
              {(drop.mediaCounts?.images ?? 0) + (drop.mediaCounts?.videos ?? 0)} files
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3">
              <h3 className="line-clamp-2 text-sm font-extrabold leading-5 text-white">{drop.title}</h3>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                Open live drops
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
