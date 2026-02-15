"use client";

import { useState, useMemo } from "react";
import { DropGrid } from "@/components/DropGrid";
import StickyFilterBar from "@/components/StickyFilterBar";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { Drop } from "@/types/db";

const CATEGORIES = ["All", "New", "Ending Soon", "Hottest", "Rare"];

interface DropsClientProps {
    initialDrops: Drop[];
}

export function DropsClient({ initialDrops }: DropsClientProps) {
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
            }
        }

        return result;
    }, [initialDrops, searchQuery, selectedCategory]);

    return (
        <main className="min-h-screen bg-black selection:bg-brand-pink/30 pt-24 md:pt-32 px-4 md:px-8 max-w-7xl mx-auto pb-24">

            {/* Page Header */}
            <div className="mb-12 md:mb-16 flex flex-col items-center text-center">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white/90 mb-3 drop-shadow-xl">
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
                <div className="flex items-center justify-between mb-8 px-4 md:px-0">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {searchQuery ? `Search Results: "${searchQuery}"` : selectedCategory === "All" ? "All KandyDrops" : `${selectedCategory} Drops`}
                    </h2>
                    <span className="text-gray-500 text-sm font-mono">{filteredDrops.length} items</span>
                </div>

                {/* We pass 'false' for loading because data is already here from server */}
                <DropGrid drops={filteredDrops} loading={false} isSearching={!!searchQuery} />
            </div>

        </main>
    );
}
