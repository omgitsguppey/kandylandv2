"use client";

import Link from "next/link";
import { memo, useMemo } from "react";

import { DropCard } from "@/components/DropCard";
import { PromoCard } from "@/components/PromoCard";
import { useAuth } from "@/context/AuthContext";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { cn } from "@/lib/utils";
import { Drop } from "@/types/db";

const EMPTY_DROPS: Drop[] = [];

interface DropGridProps {
    drops: Drop[];
    loading?: boolean;
    isSearching?: boolean;
    onSelectDrop: (drop: Drop, sourceComponent?: string) => void;
    impressionTrackingSurface?: string;
    impressionTrackingSessionId?: string;
}

export const DropGrid = memo(function DropGrid({
    drops: propDrops,
    loading: propLoading,
    isSearching,
    onSelectDrop,
    impressionTrackingSurface,
    impressionTrackingSessionId,
}: DropGridProps) {
    const { user, userProfile } = useAuth();

    const loading = propLoading ?? false;
    const drops = useMemo(() => propDrops ?? EMPTY_DROPS, [propDrops]);
    const unlockedDropIds = useMemo(() => new Set(userProfile?.unlockedContent ?? []), [userProfile?.unlockedContent]);

    const dropEntries = useMemo(
        () =>
            drops.map((drop) => ({
                drop,
                aspectRatio: getSupportedDropAspectRatio(drop),
            })),
        [drops],
    );

    const getGridSpanClass = (ratio: "1:1" | "16:9" | "9:16") => {
        if (ratio === "16:9") {
            return "col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-4";
        }

        if (ratio === "9:16") {
            return "col-span-1";
        }

        return "col-span-1 md:col-span-1 lg:col-span-2";
    };

    if (loading) {
        return (
            <div
                className="grid grid-cols-2 gap-2 pb-6 sm:gap-3 md:grid-cols-3 md:gap-5 md:pb-0 lg:grid-cols-4"
                data-drops-grid-density="compact-mobile"
            >
                {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="col-span-1 h-[190px] animate-pulse rounded-[1.15rem] bg-white/5 md:h-[330px] md:rounded-[1.35rem]"
                    />
                ))}
            </div>
        );
    }

    if (drops.length === 0) {
        return (
            <div className="w-full py-6 md:py-10" data-drops-grid-density="compact-mobile">
                <div className="relative mx-auto max-w-xl overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.035] px-5 py-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.18)] md:rounded-[1.6rem] md:px-6 md:py-8">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-purple/10 via-transparent to-white/[0.03]" />

                    <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/10 bg-zinc-900/80 text-sm font-black text-white/45 shadow-inner">
                        KD
                    </div>

                    <h3 className="relative mb-2 text-lg font-black tracking-tight text-white md:text-2xl">
                        {isSearching ? "No matching Drops" : "No Drops right now"}
                    </h3>

                    <p className="relative mx-auto max-w-sm text-sm leading-relaxed text-gray-400 md:text-base">
                        {isSearching
                            ? "Try a shorter search or switch filters."
                            : "Fresh drops are not available right now. Explore live experiences while the next batch lands."}
                    </p>

                    {!isSearching ? (
                        <Link
                            href="/experiences"
                            className="relative mt-5 inline-flex min-h-10 items-center justify-center rounded-[0.85rem] border border-brand-purple/40 bg-brand-purple px-4 text-sm font-bold text-white shadow-[0_8px_22px_rgba(164,118,255,0.2)] transition-transform active:scale-[0.98]"
                        >
                            Browse Experiences
                        </Link>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div
            className="grid grid-cols-2 items-start gap-2 pb-6 sm:gap-3 md:grid-cols-3 md:gap-5 md:pb-0 lg:grid-cols-4"
            data-drops-grid-density="compact-mobile"
        >
            {dropEntries.map(({ drop, aspectRatio }, index) => {
                const isUnlocked = unlockedDropIds.has(drop.id);

                return (
                    <div key={drop.id} id={`drop-${drop.id}`} className={cn("h-full scroll-mt-32", getGridSpanClass(aspectRatio))}>
                        {drop.type === "promo" || drop.type === "external" ? (
                            <PromoCard drop={drop} />
                        ) : (
                            <DropCard
                                drop={drop}
                                user={user}
                                isUnlocked={isUnlocked}
                                onPreview={onSelectDrop}
                                aspectRatio={aspectRatio}
                                impressionTrackingSurface={impressionTrackingSurface}
                                impressionTrackingSessionId={impressionTrackingSessionId}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
});
