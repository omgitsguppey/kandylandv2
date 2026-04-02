"use client";

import { Drop } from "@/types/db";
import { memo, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DropCard } from "./DropCard";
import { PromoCard } from "./PromoCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";

const EMPTY_DROPS: Drop[] = [];

interface DropGridProps {
    drops: Drop[];
    loading?: boolean;
    isSearching?: boolean;
    onSelectDrop: (drop: Drop) => void;
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
    const [notified, setNotified] = useState(false);

    const loading = propLoading ?? false;
    const drops = useMemo(() => propDrops ?? EMPTY_DROPS, [propDrops]);
    // O(1) unlocked lookups avoid repeated linear scans while rendering large drop grids.
    const unlockedDropIds = useMemo(() => new Set(userProfile?.unlockedContent ?? []), [userProfile?.unlockedContent]);

    useEffect(() => {
        if (notified) {
            const timer = setTimeout(() => setNotified(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [notified]);

    const dropEntries = useMemo(
        () =>
            drops.map((drop) => ({
                drop,
                aspectRatio: getSupportedDropAspectRatio(drop),
            })),
        [drops]
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 pb-20 md:pb-0">
                {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="col-span-1 h-[240px] md:h-[360px] rounded-2xl bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    if (drops.length === 0) {
        return (
            <div className="w-full py-16 md:py-24">
                <div className="relative max-w-2xl mx-auto text-center px-6 py-12 md:py-16 rounded-[2rem] glass-panel border border-white/10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-purple/10 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                    <div className="w-28 h-28 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner transition-transform duration-500 ease-out">
                        <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">🍬</span>
                    </div>

                    <h3 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
                        {isSearching ? "No matching drops found" : "The Candy Shop is Empty"}
                    </h3>

                    <p className="text-gray-400 text-lg max-w-md mx-auto mb-10 leading-relaxed">
                        {isSearching
                            ? "Try adjusting your search terms or browsing our featured collections."
                            : "All drops have been claimed or expired. Check back soon for fresh content!"}
                    </p>

                    {!isSearching && (
                        <div className="flex flex-col items-center gap-4">
                            {notified ? (
                                <div className="flex items-center gap-2 bg-brand-purple/10 border border-brand-purple/20 text-brand-purple px-8 py-4 rounded-2xl font-bold animate-in zoom-in duration-300">
                                    <span className="text-xl">✅</span>
                                    <span>You&apos;ll be notified on-site!</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setNotified(true);
                                        toast.success("Notify preference saved!", {
                                            description: "We'll alert you here when new drops land.",
                                        });
                                    }}
                                    className="rounded-2xl bg-brand-purple px-10 py-5 text-lg font-black text-white shadow-[0_10px_30px_rgba(164,118,255,0.18)] transition-all active:scale-95"
                                >
                                    Notify Me
                                </button>
                            )}
                            <p className="text-zinc-500 text-xs uppercase font-bold tracking-[0.2em] mt-2">Internal Site Alerts Only</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 pb-20 md:pb-0 items-start">
            {dropEntries.map(({ drop, aspectRatio }, index) => {
                const isUnlocked = unlockedDropIds.has(drop.id);
                const canAfford = (userProfile?.gumDropsBalance || 0) >= drop.unlockCost;

                return (
                    <div key={drop.id} id={`drop-${drop.id}`} className={cn("scroll-mt-32 h-full", getGridSpanClass(aspectRatio))}>
                        {drop.type === "promo" || drop.type === "external" ? (
                            <PromoCard drop={drop} />
                        ) : (
                            <DropCard
                                drop={drop}
                                priority={index < 4}
                                user={user}
                                isUnlocked={isUnlocked}
                                canAfford={canAfford}
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
