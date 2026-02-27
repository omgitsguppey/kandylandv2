"use client";

import { useState, useMemo } from "react";
import { DropGrid } from "@/components/DropGrid";
import StickyFilterBar from "@/components/StickyFilterBar";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { Drop } from "@/types/db";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { Lock } from "lucide-react";

const CATEGORIES = ["All", "New", "Ending Soon", "Hottest", "Sweet", "Spicy", "RAW"];

interface DropsClientProps {
    initialDrops: Drop[];
}

export function DropsClient({ initialDrops }: DropsClientProps) {
    const { user, loading: authLoading } = useAuth();
    const { openAuthModal } = useUI();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Filtering Logic
    const filteredDrops = useMemo(() => {
        if (!initialDrops) return [];

        let result = initialDrops;

        // Search Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(drop =>
                drop.title.toLowerCase().includes(lowerQuery) ||
                drop.description.toLowerCase().includes(lowerQuery)
            );
        }

        // Category Filter
        if (selectedCategory !== "All") {
            if (selectedCategory === "New") {
                result = [...result].sort((a, b) => b.validFrom - a.validFrom);
            } else if (selectedCategory === "Ending Soon") {
                result = [...result].sort((a, b) => {
                    const timeA = a.validUntil || Number.MAX_SAFE_INTEGER;
                    const timeB = b.validUntil || Number.MAX_SAFE_INTEGER;
                    return timeA - timeB;
                });
            } else if (selectedCategory === "Hottest") {
                result = [...result].sort((a, b) => (b.totalUnlocks || 0) - (a.totalUnlocks || 0));
            } else {
                result = result.filter((drop) => Array.isArray(drop.tags) && drop.tags.includes(selectedCategory));
            }
        }

        return result;
    }, [initialDrops, searchQuery, selectedCategory]);

    return (
        <main className="min-h-screen bg-black selection:bg-brand-pink/30 pt-24 md:pt-32 px-4 md:px-8 max-w-7xl mx-auto pb-24">

            {/* Page Header */}
            <div className="mb-12 md:mb-16 flex flex-col items-center text-center">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white/90 mb-3 drop-shadow-xl">
                    KandyDrops by iKandy
                </h1>
                <p className="text-base md:text-lg text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
                    Unwrap your favorite flavors before they’re gone!
                </p>
            </div>

            {/* Sticky Filter Bar */}
            <StickyFilterBar
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Featured Section (Only show if no search/filter active for cleaner UX, or always? Prompt says "Page structure... Featured... All". imply constant structure. Let's show it unless searching) */}
            {!searchQuery && selectedCategory === "All" && (
                <div className="mt-8">
                    <FeaturedCarousel drops={initialDrops} />
                </div>
            )}

            {/* Drops Grid */}
            <div className="mt-8 min-h-[500px]">
                <div className="flex items-center justify-between mb-8 px-4 md:px-0 gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {searchQuery ? `Search Results: "${searchQuery}"` : selectedCategory === "All" ? "All KandyDrops" : `${selectedCategory} Drops`}
                    </h2>
                    <span className="text-gray-500 text-xs md:text-sm font-mono px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">
                        {filteredDrops.length} items
                    </span>
                </div>

                {/* Conditional Auth Blur Gate */}
                <div className="relative">
                    {!authLoading && !user && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pt-20 pb-40 glass-panel !bg-black/60 backdrop-blur-md rounded-3xl m-2 border border-white/5">
                            <div className="flex flex-col items-center text-center p-8 max-w-md animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 rounded-full bg-brand-pink/20 flex items-center justify-center mb-6 border border-brand-pink/30 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                                    <Lock className="w-10 h-10 text-brand-pink" />
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Members Only</h3>
                                <p className="text-gray-400 font-medium mb-8 leading-relaxed">
                                    Sign in or create an account to preview, unwrap, and collect exclusive KandyDrops from your favorite creators.
                                </p>
                                <button
                                    onClick={openAuthModal}
                                    className="px-8 py-4 w-full rounded-xl bg-white text-black font-black text-lg transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                                >
                                    Sign Up / Sign In
                                </button>
                            </div>
                        </div>
                    )}

                    <div className={!authLoading && !user ? "opacity-30 pointer-events-none select-none grayscale transition-opacity duration-500" : ""}>
                        {/* We pass 'false' for loading because data is already here from server */}
                        <DropGrid drops={filteredDrops} loading={false} isSearching={!!searchQuery} />
                    </div>
                </div>
            </div>

        </main>
    );
}
