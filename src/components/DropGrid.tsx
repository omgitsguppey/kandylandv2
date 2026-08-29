"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { DropCard } from "@/components/DropCard";
import { PromoCard } from "@/components/PromoCard";
import { KandyEditorialPromotionInterlude, KandyEditorialReleaseCollection } from "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection";
import { useAuth } from "@/context/AuthContext";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";
import { resolveDropLifecycleStatus } from "@/lib/drop-status";
import { hasUnwrappedDrop } from "@/lib/drop-view-access";
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
    const drops = useMemo(
        () =>
            (propDrops ?? EMPTY_DROPS).filter((drop) =>
                resolveDropLifecycleStatus(drop, { audience: "public" }).publicVisible,
            ),
        [propDrops],
    );

    const dropEntries = useMemo(
        () =>
            drops.map((drop) => ({
                drop,
                aspectRatio: getSupportedDropAspectRatio(drop),
            })),
        [drops],
    );
    const getGridSpanClass = (_ratio: "1:1" | "16:9" | "9:16") => "min-w-0";

    if (loading) {
        return (
            <div
                className="grid grid-cols-2 gap-3 pb-6 sm:gap-4 md:grid-cols-3 md:gap-5 md:pb-0 lg:grid-cols-4 lg:gap-6"
                data-drops-grid-density="compact-mobile"
            >
                {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="relative min-h-[220px] overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121214] md:min-h-[280px]"
                    >
                        <div className="absolute inset-x-3 top-3 h-[58%] animate-pulse rounded-[1.1rem] bg-white/[0.07] md:inset-x-4 md:top-4 md:rounded-[1.4rem]" />
                        <div className="absolute bottom-7 left-3 h-3 w-2/3 animate-pulse rounded-full bg-white/[0.08] md:left-4" />
                        <div className="absolute bottom-3 left-3 h-10 w-[calc(100%_-_1.5rem)] animate-pulse rounded-[0.85rem] bg-brand-purple/10 md:bottom-4 md:left-4 md:w-[calc(100%_-_2rem)]" />
                    </div>
                ))}
            </div>
        );
    }

    if (drops.length === 0) {
        return (
            <div className="w-full py-4 md:py-8" data-drops-grid-density="compact-mobile">
                <section className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#121214] px-5 py-8 text-center md:px-10 md:py-10">
                    <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-purple/35 bg-brand-purple/10 text-brand-purple">
                            <Sparkles className="h-5 w-5" aria-hidden="true" />
                        </div>

                        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">KandyDrop shelf</p>
                        <h3 className="mt-3 text-xl font-black tracking-[-0.035em] text-white md:text-3xl">
                            {isSearching ? "Nothing matches that flavor yet." : "The shelf is being restocked."}
                        </h3>

                        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-400 md:text-base md:leading-7">
                            {isSearching
                                ? "Try a shorter search or choose another collection filter."
                                : "There are no public Drops available right now. Explore what else is happening while the next release lands."}
                        </p>

                        {!isSearching ? (
                            <Link
                                href="/experiences"
                            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-purple/45 bg-brand-purple/15 px-5 text-sm font-black text-white transition-colors hover:bg-brand-purple/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/70"
                            >
                                Browse Experiences
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        ) : null}
                    </div>
                </section>
            </div>
        );
    }

    return (
        <KandyEditorialReleaseCollection>
        <div
            className="contents"
            data-drops-grid-density="compact-mobile"
        >
            {dropEntries.map(({ drop, aspectRatio }, index) => {
                const isUnlocked = hasUnwrappedDrop(userProfile, drop.id);

                return (
                    <div key={drop.id} id={`drop-${drop.id}`} className={cn("h-full scroll-mt-32", getGridSpanClass(aspectRatio))}>
                        {drop.type === "promo" || drop.type === "external" ? (
                            <KandyEditorialPromotionInterlude>
                                <PromoCard drop={drop} />
                            </KandyEditorialPromotionInterlude>
                        ) : (
                            <DropCard
                                drop={drop}
                                presentation="shelf"
                                user={user}
                                isUnlocked={isUnlocked}
                                onPreview={onSelectDrop}
                                aspectRatio={aspectRatio}
                                impressionTrackingSurface={impressionTrackingSurface}
                                impressionTrackingSessionId={impressionTrackingSessionId}
                                impressionTrackingPosition={index + 1}
                            />
                        )}
                    </div>
                );
            })}
        </div>
        </KandyEditorialReleaseCollection>
    );
});
