"use client";



import { useState } from "react";
import { DropCard } from "./DropCard";
import { PromoCard } from "./PromoCard";
import { Drop } from "@/types/db";
import { Loader2 } from "lucide-react";

import { useAuthIdentity, useUserProfile } from "@/context/AuthContext";
import { toast } from "sonner";

interface DropGridProps {
    drops?: Drop[];
    loading?: boolean;
    isSearching?: boolean;
}

export function DropGrid({ drops: propDrops, loading: propLoading, isSearching }: DropGridProps) {
    const { user } = useAuthIdentity();
    const { userProfile } = useUserProfile();

    const drops = propDrops || [];
    const loading = propLoading || false;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-pink animate-spin" />
            </div>
        );
    }



    if (drops.length === 0) {
        const [notified, setNotified] = useState(false);

        return (
            <div className="relative isolate">
                {/* Decorative background blur */}
                <div className="absolute inset-0 -z-10 bg-brand-pink/5 blur-[120px] rounded-full scale-75" />

                <div className="text-center py-24 px-6 glass-panel rounded-[2rem] max-w-2xl mx-auto border border-white/10 shadow-2xl relative overflow-hidden group">
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
                                            description: "We'll alert you here when new drops land."
                                        });
                                    }}
                                    className="px-10 py-5 bg-white text-black rounded-2xl font-black text-lg transition-all transform active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                                >
                                    Notify Me
                                </button>
                            )}
                            <p className="text-zinc-500 text-xs uppercase font-bold tracking-[0.2em] mt-2">
                                Internal Site Alerts Only
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )
    }


    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pb-20 md:pb-0">
            {drops.map((drop, index) => {
                const isUnlocked = userProfile?.unlockedContent?.includes(drop.id);
                const canAfford = (userProfile?.gumDropsBalance || 0) >= drop.unlockCost;

                return (
                    <div
                        key={drop.id}
                    >
                        {(drop.type === 'promo' || drop.type === 'external') ? (
                            <PromoCard drop={drop} />
                        ) : (
                            <DropCard
                                drop={drop}
                                priority={index < 4}
                                user={user}
                                isUnlocked={isUnlocked}
                                canAfford={canAfford}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
