"use client";

import { useDrops } from "@/hooks/useDrops";
import { DropCard } from "./DropCard";
import { PromoCard } from "./PromoCard";
import { Drop } from "@/types/db";
import { Loader2 } from "lucide-react";

interface DropGridProps {
    drops?: Drop[];
    loading?: boolean;
    isSearching?: boolean;
}

export function DropGrid({ drops: propDrops, loading: propLoading, isSearching }: DropGridProps) {
    const { drops: hookDrops, loading: hookLoading, error } = useDrops();

    // Use props if available, otherwise use hook
    const drops = propDrops || hookDrops;
    const loading = propLoading !== undefined ? propLoading : hookLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-pink animate-spin" />
            </div>
        );
    }

    if (error && !propDrops) {
        return <div className="text-center text-red-400 mt-12 mb-20">{error}</div>;
    }

    if (drops.length === 0) {
        return (
            <div
                className="text-center mt-12 py-20 px-4 glass-panel rounded-3xl max-w-2xl mx-auto border border-white/5"
            >
                <div
                    className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(236,72,153,0.1)]"
                >
                    <span className="text-5xl">🍬</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    {isSearching ? "No matching drops found" : "The Candy Shop is Empty"}
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                    {isSearching
                        ? "Try adjusting your search terms or browsing our featured collections."
                        : "All drops have been claimed or expired. Check back soon for fresh content!"}
                </p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pb-20 md:pb-0">
            {drops.map((drop, index) => (
                <div
                    key={drop.id}
                >
                    {(drop.type === 'promo' || drop.type === 'external') ? (
                        <PromoCard drop={drop} />
                    ) : (
                        <DropCard drop={drop} priority={index < 4} />
                    )}
                </div>
            ))}
        </div>
    );
}
