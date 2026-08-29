"use client";

import { Clock, Image as ImageIcon } from "lucide-react";

import { useNow } from "@/hooks/useNow";
import { LAUNCH_BADGE_CONTAINMENT_CLASSNAME, LAUNCH_STATIC_BADGE_CLASSNAME } from "@/lib/design-system";
import { formatDropCountdown } from "@/lib/drop-countdown";
import { cn } from "@/lib/utils";

interface DropCardBadgeProps {
    label: string;
    compact?: boolean;
}

interface FileCountChipProps {
    images: number;
    videos: number;
    compact?: boolean;
}

export function DropCardBadge({ label, compact = false }: DropCardBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex w-fit items-center rounded-full border font-black text-white shadow-[0_10px_22px_rgba(0,0,0,0.26)] backdrop-blur-xl",
                LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
                LAUNCH_STATIC_BADGE_CLASSNAME,
                compact ? "px-2.5 py-1 text-[9px] uppercase tracking-[0.13em]" : "px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] md:text-xs",
                "border-brand-purple/35 bg-brand-purple/18",
                label === "Sweet" && "border-brand-purple/45 bg-brand-purple/28",
                label === "Spicy" && "border-fuchsia-300/35 bg-fuchsia-500/18",
                label === "RAW" && "border-white/20 bg-zinc-900/75",
            )}
        >
            {label}
        </span>
    );
}

export function FileCountChip({ images, videos, compact = false }: FileCountChipProps) {
    if (images === 0 && videos === 0) {
        return null;
    }

    const fileCountLabel = [
        images > 0 ? `${images} ${images === 1 ? "image" : "images"}` : null,
        videos > 0 ? `${videos} ${videos === 1 ? "video" : "videos"}` : null,
    ].filter(Boolean).join(", ");

    return (
        <span
            className={cn(
                "z-30 inline-flex items-center rounded-full border border-white/18 bg-black/58 font-black text-white shadow-[0_10px_22px_rgba(0,0,0,0.28)] backdrop-blur-xl",
                LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
                LAUNCH_STATIC_BADGE_CLASSNAME,
                compact ? "gap-1.5 px-2.5 py-1 text-[9px]" : "gap-2 px-3 py-1.5 text-[10px] md:text-xs",
            )}
            aria-label={fileCountLabel}
            title={fileCountLabel}
        >
            {images > 0 ? (
                <div className="flex items-center gap-1">
                    <ImageIcon aria-hidden="true" className={compact ? "h-2.5 w-2.5" : "h-3 w-3 md:h-3.5 md:w-3.5"} />
                    <span>{images}</span>
                </div>
            ) : null}
            {videos > 0 ? (
                <div className="flex items-center gap-1">
                    <span aria-hidden="true" className={cn("leading-none", compact ? "text-[10px]" : "text-xs md:text-sm")}>🎥</span>
                    <span>{videos}</span>
                </div>
            ) : null}
        </span>
    );
}

export function DropCardTimer({ validUntil }: { validUntil?: number }) {
    const nowMs = useNow({ intervalMs: 1_000 });
    const { visibleLabel, fullLabel, urgencyState, isCountdownOnly } = formatDropCountdown(validUntil, nowMs);

    return (
        <span
            className={cn(
                "inline-flex max-w-[7.5rem] items-center justify-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black shadow-[0_10px_22px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-colors md:max-w-[8.5rem] md:px-2.5 md:text-[10px]",
                LAUNCH_BADGE_CONTAINMENT_CLASSNAME,
                isCountdownOnly && "min-w-[4.9rem] whitespace-nowrap",
                urgencyState === "critical"
                    ? "border-fuchsia-500/40 bg-fuchsia-900/25 text-fuchsia-100"
                    : urgencyState === "warm"
                        ? "border-[#b28cff]/30 bg-[#b28cff]/14 text-[#e4d4ff]"
                        : "border-white/10 bg-black/38 text-gray-300",
            )}
            aria-label={fullLabel}
            title={fullLabel}
        >
            <Clock
                aria-hidden="true"
                className={cn(
                    "h-2.5 w-2.5 shrink-0 md:h-3 md:w-3",
                    urgencyState === "critical"
                        ? "text-fuchsia-300"
                        : urgencyState === "warm"
                            ? "text-[#b28cff]"
                            : "text-gray-400",
                )}
            />
            <span aria-live="off" className={cn("truncate", isCountdownOnly && "text-center")}>{visibleLabel}</span>
        </span>
    );
}
