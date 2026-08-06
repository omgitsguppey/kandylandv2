"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { ArrowRight, Images, Sparkles } from "lucide-react";

import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { useDrops } from "@/hooks/useDrops";
import { useNow } from "@/hooks/useNow";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { trackEvent } from "@/lib/telemetry";
import { reportClientIssue } from "@/lib/client-error-reporting";
import type { Drop } from "@/types/db";

interface LiveDropsForYouCarouselProps {
  initialDrops?: Drop[];
}

export function LiveDropsForYouCarousel({ initialDrops }: LiveDropsForYouCarouselProps) {
  const router = useRouter();
  const { drops, loading } = useDrops(["active"], initialDrops);
  const nowMs = useNow({ intervalMs: 60_000 });
  const [recommendedDrops, setRecommendedDrops] = useState<Drop[] | null>(null);
  const imagePolicy = getImageLoadingPolicy("dashboard_collection");

  const activeDrops = useMemo(
    () =>
      (recommendedDrops ?? drops)
        .filter((drop) => {
          if (drop.status !== "active") {
            return false;
          }

          if (nowMs <= 0) {
            return true;
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
    [drops, nowMs, recommendedDrops],
  );

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/drops/recommendations?limit=8", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return response.json() as Promise<{ drops?: Drop[] }>;
      })
      .then((payload) => {
        if (cancelled || !Array.isArray(payload?.drops) || payload.drops.length === 0) {
          return;
        }
        setRecommendedDrops(payload.drops);
      })
      .catch((err) => {
        // Keep the canonical drop feed fallback when recommendations are unavailable.
        reportClientIssue({
          channel: "runtime",
          severity: "warn",
          message: "Recommendations fetch failed, using canonical feed fallback",
          error: err,
          consoleLabel: "[LiveDrops] Recommendations fetch failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
              src={resolvePublicDropCoverSrc(drop.imageUrl)}
              alt={drop.title}
              fill
              loading={imagePolicy.loading}
              preload={imagePolicy.preload}
              fetchPriority={imagePolicy.fetchPriority}
              quality={imagePolicy.quality}
              sizes={imagePolicy.sizes}
              className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
              {...getImagePolicyDataAttributes(imagePolicy)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

            <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <Images className="mr-1 inline h-3.5 w-3.5 text-brand-purple" />
              {(drop.mediaCounts?.images ?? 0) + (drop.mediaCounts?.videos ?? 0)} files
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3">
              <TitleMarquee
                title={drop.title}
                delaySeed={drop.id.charCodeAt(0) % 6}
                className="text-sm font-extrabold leading-5 text-white"
              />
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                Unwrap
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
