"use client";

import NextImage from "next/image";
import { useMemo, useState } from "react";
import { Image as ImageIcon, Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { getAspectRatioCssValue, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { trackEvent } from "@/lib/telemetry";
import type { Drop } from "@/types/db";

interface OwnedDropGalleryCardProps {
  drop: Drop;
  isUnlocked: boolean;
  onOpen?: () => void | boolean;
}

export function OwnedDropGalleryCard({ drop, isUnlocked, onOpen }: OwnedDropGalleryCardProps) {
  const ratio = getSupportedDropAspectRatio(drop);
  const ratioStyle = { aspectRatio: getAspectRatioCssValue(ratio) };
  const [erroredImageUrl, setErroredImageUrl] = useState<string | null>(null);
  const coverSrc = erroredImageUrl === drop.imageUrl ? resolvePublicDropCoverSrc(null) : resolvePublicDropCoverSrc(drop.imageUrl);
  const imagePolicy = getImageLoadingPolicy("my_kandydrops_library");
  const fileCounts = useMemo(() => {
    const summary = getDropMediaSummary(drop);
    return { images: summary.imageCount, videos: summary.videoCount };
  }, [drop]);
  const fileCountLabel = [
    fileCounts.images > 0 ? `${fileCounts.images} ${fileCounts.images === 1 ? "image" : "images"}` : null,
    fileCounts.videos > 0 ? `${fileCounts.videos} ${fileCounts.videos === 1 ? "video" : "videos"}` : null,
  ].filter(Boolean).join(", ");

  return (
    <Button type="button" variant="ghost" onClick={() => {
      if (onOpen?.() === false) return;
      trackEvent("owned_drop_clicked", { drop_id: drop.id, drop_category: drop.type });
    }} className="h-full w-full min-w-0 flex-col items-stretch gap-3 rounded-2xl p-0 text-left" disabled={!onOpen}>
      <div className="relative w-full overflow-hidden rounded-2xl bg-muted" style={ratioStyle}>
        <NextImage src={coverSrc} alt={drop.title} fill loading={imagePolicy.loading} preload={imagePolicy.preload} fetchPriority={imagePolicy.fetchPriority} quality={imagePolicy.quality} className="object-cover" sizes={imagePolicy.sizes} onError={() => setErroredImageUrl(drop.imageUrl ?? null)} {...getImagePolicyDataAttributes(imagePolicy)} />
      </div>
      <div className="min-w-0 space-y-2 px-1 pb-1">
        <TitleMarquee title={drop.title} delaySeed={drop.id.charCodeAt(0) % 6} className="text-base font-semibold leading-snug text-foreground" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-relaxed text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            {isUnlocked ? <Unlock className="size-3.5 shrink-0" aria-hidden="true" /> : <Lock className="size-3.5 shrink-0" aria-hidden="true" />}
            {isUnlocked ? "Unwrapped" : "Locked"}
          </span>
          {(fileCounts.images > 0 || fileCounts.videos > 0) ? (
            <span className="inline-flex min-w-0 flex-wrap items-center gap-2" aria-label={fileCountLabel} title={fileCountLabel}>
              {fileCounts.images > 0 ? <span className="inline-flex items-center gap-1"><ImageIcon className="size-3.5 shrink-0" aria-hidden="true" /><span>{fileCounts.images}</span></span> : null}
              {fileCounts.videos > 0 ? <span className="inline-flex items-center gap-1"><span aria-hidden="true">🎥</span><span>{fileCounts.videos}</span></span> : null}
            </span>
          ) : null}
        </div>
      </div>
    </Button>
  );
}
