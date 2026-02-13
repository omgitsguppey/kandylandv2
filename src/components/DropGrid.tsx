"use client";

import { useDrops } from "@/hooks/useDrops";
import { DropCard } from "./DropCard";
import { PromoCard } from "./PromoCard";
import { Drop } from "@/types/db";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center mt-12 py-20 px-4 glass-panel rounded-3xl max-w-2xl mx-auto border border-white/5"
            >
                <motion.div
                    animate={{
                        y: [0, -10, 0],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(236,72,153,0.1)]"
                >
                    <span className="text-5xl">🍬</span>
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    {isSearching ? "No matching drops found" : "The Candy Shop is Empty"}
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                    {isSearching
                        ? "Try adjusting your search terms or browsing our featured collections."
                        : "All drops have been claimed or expired. Check back soon for fresh content!"}
                </p>
            </motion.div>
        )
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pb-20 md:pb-0">
            {drops.map((drop, index) => (
                <div
                    key={drop.id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
                    style={{ animationDelay: `${index * 50}ms` }}
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
