"use client";

import { Drop } from "@/types/db";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/context/AuthContext";
import { DropCard } from "./DropCard";
import { PromoCard } from "./PromoCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSupportedDropAspectRatio } from "@/lib/drop-presentation";

interface DropGridProps {
    drops: Drop[];
    loading?: boolean;
    isSearching?: boolean;
    onSelectDrop: (drop: Drop) => void;
}

export function DropGrid({ drops: propDrops, loading: propLoading, isSearching, onSelectDrop }: DropGridProps) {
    const { user } = useAuth();
    const { userProfile } = useUserProfile();
    const [notified, setNotified] = useState(false);

    const loading = propLoading ?? false;
    const drops = propDrops ?? [];

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
            return "col-span-4";
        }

        if (ratio === "9:16") {
            return "col-span-1";
        }

        return "col-span-2";
    };

    if (loading) {
        return (
            <div className="grid grid-cols-4 gap-3 md:gap-5 pb-20 md:pb-0">
                {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="col-span-2 h-[240px] md:h-[360px] rounded-2xl bg-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    if (drops.length === 0) {
        return (
            <div className="w-full py-16 md:py-24">
                <div className="relative max-w-2xl mx-auto text-center px-6 py-12 md:py-16 rounded-[2rem] glass-panel border border-white/10 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/10 via-transparent to-brand-cyan/10 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                    <div className="w-28 h-28 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner transition-transform duration-500 ease-out">
                        <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(236,72,153,0.4)]">🍬</span>
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
                                <div className="flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 text-brand-green px-8 py-4 rounded-2xl font-bold animate-in zoom-in duration-300">
                                    <span className="text-xl">✅</span>
                                    <span>You'll be notified on-site!</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setNotified(true);
                                        toast.success("Notify preference saved!", {
                                            description: "We'll alert you here when new drops land.",
                                        });
                                    }}
                                    className="px-10 py-5 bg-white text-black rounded-2xl font-black text-lg transition-all transform active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
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
        <div className="grid grid-cols-4 gap-3 md:gap-5 pb-20 md:pb-0 items-start">
            {dropEntries.map(({ drop, aspectRatio }, index) => {
                const isUnlocked = userProfile?.unlockedContent?.includes(drop.id);
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
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
