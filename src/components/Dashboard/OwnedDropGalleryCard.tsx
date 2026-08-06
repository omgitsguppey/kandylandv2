"use client";

import NextImage from "next/image";
import { Drop } from "@/types/db";
import { cn } from "@/lib/utils";
import { getAspectRatioCssValue, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { resolvePublicDropCoverSrc } from "@/lib/drop-media-fallback";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import { Lock, Unlock, Image as ImageIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { trackEvent } from "@/lib/telemetry";
import { TitleMarquee } from "@/components/ui/TitleMarquee";

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
                if (onOpen) onOpen();
            }}
            className="group relative min-h-11 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/75 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0618] disabled:cursor-default"
            disabled={!onOpen}
        >
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0617] shadow-[0_14px_34px_rgba(0,0,0,0.28)] transition duration-300 group-hover:-translate-y-0.5 group-hover:border-brand-purple/45 group-hover:shadow-[0_20px_44px_rgba(92,34,153,0.3)] sm:rounded-[1.35rem]",
                    ratio === "16:9" ? "col-span-4" : ratio === "9:16" ? "col-span-2" : "col-span-3"
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

                {/* File Count Chip */}
                {(fileCounts.images > 0 || fileCounts.videos > 0) && (
                    <div className="absolute right-2 top-2 z-30 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2 py-1 text-[9px] font-bold text-white shadow-xl backdrop-blur-md sm:text-[10px]" aria-label={fileCountLabel} title={fileCountLabel}>
                        {fileCounts.images > 0 && (
                            <div className="flex items-center gap-0.5">
                                <ImageIcon aria-hidden="true" className="w-2.5 h-2.5" />
                                <span>{fileCounts.images}</span>
                            </div>
                        )}
                        {fileCounts.videos > 0 && (
                            <div className="flex items-center gap-0.5">
                                <span aria-hidden="true" className="text-[10px] leading-none">🎥</span>
                                <span>{fileCounts.videos}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08030f] via-[#10071d]/85 to-transparent p-2.5 sm:p-3">
                    <div className="relative overflow-hidden">
                        <TitleMarquee
                            title={drop.title}
                            delaySeed={drop.id.charCodeAt(0) % 6}
                            className="text-[11px] font-bold leading-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] sm:text-xs"
                        />
                    </div>
                    <span className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold shadow-sm sm:text-[10px]",
                        isUnlocked
                            ? "border-brand-purple/40 bg-brand-purple/25 text-white"
                            : "border-white/20 bg-white/10 text-gray-300"
                    )}>
                        {isUnlocked ? <Unlock className="w-3 h-3 drop-shadow-md" /> : <Lock className="w-3 h-3" />}
                        {isUnlocked ? "Unwrapped" : "Locked"}
                    </span>
                </div>
            </div>
        </button>
    );
}
