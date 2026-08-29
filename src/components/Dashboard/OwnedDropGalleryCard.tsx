"use client";

import NextImage from "next/image";
import { useMemo, useState } from "react";
import { Image as ImageIcon, Lock, Unlock } from "lucide-react";

import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { getAspectRatioCssValue, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import type { Drop } from "@/types/db";

interface OwnedDropGalleryCardProps {
  drop: Drop;
  isUnlocked: boolean;
  onOpen?: () => void;
}

export function OwnedDropGalleryCard({ drop, isUnlocked, onOpen }: OwnedDropGalleryCardProps) {
  const ratio = getSupportedDropAspectRatio(drop);
  const ratioStyle = { aspectRatio: getAspectRatioCssValue(ratio) };
  const [erroredImageUrl, setErroredImageUrl] = useState<string | null>(null);
  const coverSrc = erroredImageUrl === drop.imageUrl ? resolvePublicDropCoverSrc(null) : resolvePublicDropCoverSrc(drop.imageUrl);
  const imagePolicy = getImageLoadingPolicy("my_kandydrops_library");

  const fileCounts = useMemo(() => {
    const summary = getDropMediaSummary(drop);
    return {
      images: summary.imageCount,
      videos: summary.videoCount,
    };
  }, [drop]);

  const fileCountLabel = [
    fileCounts.images > 0 ? `${fileCounts.images} ${fileCounts.images === 1 ? "image" : "images"}` : null,
    fileCounts.videos > 0 ? `${fileCounts.videos} ${fileCounts.videos === 1 ? "video" : "videos"}` : null,
  ].filter(Boolean).join(", ");

  return (
    <button
      type="button"
      onClick={() => {
        trackEvent("owned_drop_clicked", { drop_id: drop.id, drop_category: drop.type });
        onOpen?.();
      }}
      className="group relative min-h-11 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/75 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-default"
      disabled={!onOpen}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-xl shadow-black/25 transition duration-300 group-hover:-translate-y-1 group-hover:border-brand-purple/60 group-hover:shadow-2xl group-hover:shadow-brand-purple/20",
        )}
        style={ratioStyle}
      >
        <NextImage
          src={coverSrc}
          alt={drop.title}
          fill
          loading={imagePolicy.loading}
          preload={imagePolicy.preload}
          fetchPriority={imagePolicy.fetchPriority}
          quality={imagePolicy.quality}
          className="object-cover transition duration-500 group-hover:scale-[1.035]"
          sizes={imagePolicy.sizes}
          onError={() => setErroredImageUrl(drop.imageUrl ?? null)}
          {...getImagePolicyDataAttributes(imagePolicy)}
        />

        {(fileCounts.images > 0 || fileCounts.videos > 0) ? (
          <div className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded-xl bg-black/55 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md" aria-label={fileCountLabel} title={fileCountLabel}>
            {fileCounts.images > 0 ? (
              <div className="flex items-center gap-1">
                <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{fileCounts.images}</span>
              </div>
            ) : null}
            {fileCounts.videos > 0 ? (
              <div className="flex items-center gap-1">
                <span aria-hidden="true" className="leading-none">🎥</span>
                <span>{fileCounts.videos}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent p-4 pt-12">
          <div className="relative overflow-hidden">
            <TitleMarquee
              title={drop.title}
              delaySeed={drop.id.charCodeAt(0) % 6}
              className="text-sm font-semibold leading-tight text-white"
            />
          </div>
          <span className={cn("mt-2 inline-flex items-center gap-1.5 text-xs font-medium", isUnlocked ? "text-fuchsia-200" : "text-slate-300")}>
            {isUnlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {isUnlocked ? "Unwrapped" : "Locked"}
          </span>
        </div>
      </div>
    </button>
  );
}
