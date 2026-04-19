"use client";

import NextImage from "next/image";
import { Drop } from "@/types/db";
import { cn } from "@/lib/utils";
import { getAspectRatioCssValue, getDropMediaSummary, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { Lock, Unlock, Image as ImageIcon, Film } from "lucide-react";
import { useMemo } from "react";
import { trackEvent } from "@/lib/telemetry";

interface OwnedDropGalleryCardProps {
    drop: Drop;
    isUnlocked: boolean;
    onOpen?: () => void;
}

export function OwnedDropGalleryCard({ drop, isUnlocked, onOpen }: OwnedDropGalleryCardProps) {
    const ratio = getSupportedDropAspectRatio(drop);
    const ratioStyle = { aspectRatio: getAspectRatioCssValue(ratio) };

    const fileCounts = useMemo(() => {
        const summary = getDropMediaSummary(drop);
        return {
            images: summary.imageCount,
            videos: summary.videoCount,
        };
    }, [drop]);

    return (
        <button
            type="button"
            onClick={() => {
                trackEvent("owned_drop_clicked", { drop_id: drop.id, drop_category: drop.type });
                if (onOpen) onOpen();
            }}
            className="group relative text-left w-full"
            disabled={!onOpen}
        >
            <div
                className={cn(
                    "relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-black/40",
                    ratio === "16:9" ? "col-span-4" : ratio === "9:16" ? "col-span-2" : "col-span-3"
                )}
                style={ratioStyle}
            >
                {drop.imageUrl ? (
                    <NextImage
                        src={drop.imageUrl}
                        alt={drop.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-3xl">🍬</div>
                )}

                {/* File Count Chip */}
                {(fileCounts.images > 0 || fileCounts.videos > 0) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-bold text-white border border-white/20 z-30 shadow-xl">
                        {fileCounts.images > 0 && (
                            <div className="flex items-center gap-0.5">
                                <ImageIcon className="w-2.5 h-2.5" />
                                <span>{fileCounts.images}</span>
                            </div>
                        )}
                        {fileCounts.videos > 0 && (
                            <div className="flex items-center gap-0.5">
                                <Film className="w-2.5 h-2.5" />
                                <span>{fileCounts.videos}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2.5 sm:p-3">
                    <div className="relative overflow-hidden group">
                        <p className="text-[11px] sm:text-xs font-bold text-white leading-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate">
                            {drop.title}
                        </p>
                    </div>
                    <span className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold border shadow-sm",
                        isUnlocked
                            ? "bg-white/20 text-white border-white/30"
                            : "bg-white/10 text-gray-300 border-white/20"
                    )}>
                        {isUnlocked ? <Unlock className="w-3 h-3 drop-shadow-md" /> : <Lock className="w-3 h-3" />}
                        {isUnlocked ? "Unwrapped" : "Locked"}
                    </span>
                </div>
            </div>
        </button>
    );
}
