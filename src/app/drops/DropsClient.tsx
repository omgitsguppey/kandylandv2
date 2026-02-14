"use client";

import { useState, useMemo } from "react";
import { DropGrid } from "@/components/DropGrid";
import StickyFilterBar from "@/components/StickyFilterBar";
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
                result = [...result].sort((a, b) => a.validUntil - b.validUntil);
            }
        }

        return result;
    }, [initialDrops, searchQuery, selectedCategory]);

    return (
        <main className="min-h-screen bg-black selection:bg-brand-pink/30 pt-24 md:pt-32 px-4 md:px-8 max-w-7xl mx-auto pb-24">

            {/* Sticky Filter Bar */}
            <StickyFilterBar
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Drops Grid */}
            <div className="mt-8 min-h-[500px]">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {searchQuery ? `Search Results: "${searchQuery}"` : selectedCategory === "All" ? "All Collections" : `${selectedCategory} Drops`}
                    </h2>
                    <span className="text-gray-500 text-sm font-mono">{filteredDrops.length} items</span>
                </div>

                {/* We pass 'false' for loading because data is already here from server */}
                <DropGrid drops={filteredDrops} loading={false} isSearching={!!searchQuery} />
            </div>

        </main>
    );
}
