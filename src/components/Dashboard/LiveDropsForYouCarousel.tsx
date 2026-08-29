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
    <section className="relative isolate overflow-hidden rounded-[1.9rem] border border-pink-100/14 bg-[linear-gradient(135deg,rgba(74,18,84,0.82),rgba(13,5,24,0.98)_58%,rgba(36,10,52,0.92))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-fuchsia-300/14 blur-[64px]" aria-hidden="true" />
      <div className="relative mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-100/20 bg-white/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-pink-50">
            <Sparkles className="h-3.5 w-3.5 text-pink-200" />
            Live Drop lineup
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Pick your next unwrap.</h3>
          <p className="mt-1 text-sm leading-6 text-white/62">
            Open any live cover to explore the full Drop shelf.
          </p>
        </div>
      </div>

      <div className="relative -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
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
            className="group relative flex-[0_0_13.5rem] snap-start overflow-hidden rounded-[1.65rem] border border-white/14 bg-zinc-950 text-left shadow-[0_16px_35px_rgba(0,0,0,0.28)] transition-transform hover:-translate-y-1"
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
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.06]"
              {...getImagePolicyDataAttributes(imagePolicy)}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,2,18,0.12),rgba(10,2,18,0.18)_32%,rgba(5,2,9,0.96)_100%)]" />

            <div className="absolute left-3 top-3 rounded-full border border-pink-100/18 bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
              <Images className="mr-1 inline h-3.5 w-3.5 text-pink-200" />
              {(drop.mediaCounts?.images ?? 0) + (drop.mediaCounts?.videos ?? 0)} files
            </div>

            <span className="absolute right-3 top-3 rounded-full border border-emerald-100/18 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-50">Live</span>

            <div className="absolute inset-x-0 bottom-0 p-3">
              <TitleMarquee
                title={drop.title}
                delaySeed={drop.id.charCodeAt(0) % 6}
                className="text-sm font-extrabold leading-5 text-white"
              />
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-pink-100">
                Open lineup
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
