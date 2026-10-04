"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/Button";

import { DropCard } from "@/components/DropCard";
import { PromoCard } from "@/components/PromoCard";
import { KandyEditorialPromotionInterlude, KandyEditorialReleaseCollection, KandyEditorialReleaseSkeleton } from "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection";
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
    error?: string | null;
    onClearFilters?: () => void;
    onSelectDrop: (drop: Drop, sourceComponent?: string) => void;
    impressionTrackingSurface?: string;
    impressionTrackingSessionId?: string;
}

export const DropGrid = memo(function DropGrid({
    drops: propDrops,
    loading: propLoading,
    isSearching,
    error,
    onClearFilters,
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

    if (loading && drops.length === 0) {
        return <KandyEditorialReleaseSkeleton itemCount={8} embedded />;
    }

    const sourceNotice = error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm leading-relaxed text-destructive">
            {drops.length > 0
                ? "The collection couldn’t refresh. You can keep browsing the loaded Drops."
                : "The collection couldn’t load. You can return to Drops to try again."}
        </p>
    ) : null;

    if (drops.length === 0) {
        return (
            <div className="min-w-0 space-y-4" data-drops-grid-density="compact-mobile">
                {sourceNotice}
                <section className="min-w-0 space-y-4">
                        <h3 className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">{isSearching ? "No loaded Drops match these filters." : "No loaded releases."}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{isSearching ? "Clear the filters or try another search." : "Explore Experiences while there are no releases displayed here."}</p>
                        <div className="flex min-w-0 flex-wrap gap-2">
                            {isSearching && onClearFilters ? <Button type="button" variant="brand" className="max-w-full whitespace-normal" onClick={onClearFilters}>Clear filters</Button> : null}
                            <Link href="/experiences" className={cn(buttonVariants({ variant: "ghost" }), "max-w-full flex-wrap px-1 whitespace-normal [overflow-wrap:anywhere]")}>Browse Experiences</Link>
                        </div>
                </section>
            </div>
        );
    }

    return (
        <div className="min-w-0 space-y-4">
        {sourceNotice}
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
        </div>
    );
});
