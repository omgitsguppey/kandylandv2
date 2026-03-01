"use client";

import NextImage from "next/image";
import { Drop } from "@/types/db";
import { cn } from "@/lib/utils";
import { getAspectRatioCssValue } from "@/lib/drop-presentation";
import { Lock, Unlock } from "lucide-react";
import { getGalleryAspectRatio } from "./gallery-layout";

interface OwnedDropGalleryCardProps {
    drop: Drop;
    isUnlocked: boolean;
    onOpen?: () => void;
}

export function OwnedDropGalleryCard({ drop, isUnlocked, onOpen }: OwnedDropGalleryCardProps) {
    const ratio = getGalleryAspectRatio(drop);
    const ratioStyle = { aspectRatio: getAspectRatioCssValue(ratio) };

    return (
        <button
            type="button"
            onClick={onOpen}
            className="group relative text-left w-full"
            disabled={!onOpen}
        >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40" style={ratioStyle}>
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

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-xs font-bold text-white line-clamp-1">{drop.title}</p>
                    <span
                        className={cn(
                            "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                            isUnlocked
                                ? "bg-brand-green/20 text-brand-green border-brand-green/30"
                                : "bg-white/10 text-gray-300 border-white/20"
                        )}
                    >
                        {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {isUnlocked ? "Owned" : "Locked"}
                    </span>
                </div>
            </div>
        </button>
    );
}
