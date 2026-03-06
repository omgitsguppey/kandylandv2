"use client";

import NextImage from "next/image";
import { Drop } from "@/types/db";
import { cn } from "@/lib/utils";
import { getAspectRatioCssValue, getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { Lock, Unlock, Image as ImageIcon, Film } from "lucide-react";
import { useMemo } from "react";

interface OwnedDropGalleryCardProps {
    drop: Drop;
    isUnlocked: boolean;
    onOpen?: () => void;
}

export function OwnedDropGalleryCard({ drop, isUnlocked, onOpen }: OwnedDropGalleryCardProps) {
    const ratio = getSupportedDropAspectRatio(drop);
    const ratioStyle = { aspectRatio: getAspectRatioCssValue(ratio) };

    const fileCounts = useMemo(() => {
        if (drop.mediaCounts) return drop.mediaCounts;
        let images = 0;
        let videos = 0;
        const urls = drop.contentUrls || [];
        if (urls.length > 0) {
            urls.forEach(url => {
                const lowerUrl = url.toLowerCase();
                if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/)) videos++;
                else images++;
            });
        } else if (drop.contentUrl) {
            const lowerUrl = drop.contentUrl.toLowerCase();
            if (lowerUrl.match(/\.(mp4|webm|ogg|mov)$/)) videos++;
            else images++;
        }
        return { images, videos };
    }, [drop.contentUrls, drop.contentUrl, drop.mediaCounts]);

    return (
        <button
            type="button"
            onClick={onOpen}
            className="group relative text-left w-full"
            disabled={!onOpen}
        >
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/10 bg-black/40",
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
                        sizes="(max-width: 768px) 50vw, 25vw"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-3xl">🍬</div>
                )}

                {/* File Count Chip */}
                {(fileCounts.images > 0 || fileCounts.videos > 0) && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white border border-white/10">
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

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-xs font-bold text-white line-clamp-1">{drop.title}</p>
                    <span className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                        isUnlocked
                            ? "bg-brand-purple/20 text-brand-purple border-brand-purple/30"
                            : "bg-white/10 text-gray-300 border-white/20"
                    )}>
                        {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {isUnlocked ? "Owned" : "Locked"}
                    </span>
                </div>
            </div>
        </button>
    );
}
