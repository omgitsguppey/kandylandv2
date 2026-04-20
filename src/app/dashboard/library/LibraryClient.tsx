"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import StickyFilterBar from '@/components/StickyFilterBar';
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Drop } from "@/types/db";
import { OwnedDropGalleryCard } from "@/components/Dashboard/OwnedDropGalleryCard";
import { trackEvent } from "@/lib/telemetry";

type Ratio = "1:1" | "16:9" | "9:16";

function getRatio(drop: Drop): Ratio {
    const raw = drop.fileMetadata?.dimensions;
    if (raw === "16:9" || raw === "9:16" || raw === "1:1") {
        return raw;
    }
    return "1:1";
}

function getItemSpanClass(drop: Drop): string {
    const ratio = getRatio(drop);
    if (ratio === "16:9") return "col-span-4";
    if (ratio === "9:16") return "col-span-2";
    return "col-span-3";
}

interface LibraryClientProps {
    drops: Drop[];
}

export function LibraryClient({ drops }: LibraryClientProps) {
    const { userProfile, loading: authLoading } = useAuth();
    const unlockedIds = useMemo(() => {
        const source = userProfile?.unlockedContent;
        return Array.isArray(source) ? new Set(source) : new Set<string>();
    }, [userProfile?.unlockedContent]);

    const unlockedDrops = useMemo(() => drops.filter((drop) => unlockedIds.has(drop.id)), [drops, unlockedIds]);
    const router = useRouter();

    useEffect(() => {
        if (!userProfile) {
            return;
        }

        trackEvent("library_viewed");
    }, [userProfile]);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [gridCols, setGridCols] = useState<2 | 3>(2);

if (authLoading) {
        return (
            <div className="animate-pulse">
                <div className="mb-6">
                    <div className="h-10 w-64 bg-white/10 rounded mb-2" />
                    <div className="h-5 w-72 bg-white/5 rounded" />
                </div>
                <div className="grid grid-cols-6 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="col-span-3 aspect-square bg-white/5 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    const filteredDrops = useMemo(() => {
        let res = unlockedDrops;
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            res = res.filter(d => 
                d.title.toLowerCase().includes(lower) || 
                (d.creatorId && d.creatorId.toLowerCase().includes(lower))
            );
        }
        if (selectedCategory !== "All") {
            res = res.filter(d => d.creatorId === selectedCategory);
        }
        return res;
    }, [unlockedDrops, searchQuery, selectedCategory]);

    const categories = useMemo(() => {
        const base = ["All"];
        const creators = new Set<string>();
        unlockedDrops.forEach(d => {
            if (d.creatorId) {
                creators.add(d.creatorId);
            }
        });
        return [...base, ...Array.from(creators).sort()];
    }, [unlockedDrops]);

    return (
        <div className="flex flex-col min-h-screen px-2 md:px-0">
            <header className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-purple mb-1">
                        My KandyDrops
                    </h1>
                    <p className="text-gray-400 text-xs md:text-sm">Your unwrapped library. ({unlockedDrops.length} total)</p>
                </div>
            </header>

            {unlockedDrops.length === 0 ? (
                <div className="glass-panel p-8 md:p-12 rounded-3xl text-center border border-white/5">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-6 h-6 md:w-8 md:h-8 text-gray-500" />
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-white mb-2">No Unwrapped Drops</h2>
                    <p className="text-gray-400 text-sm md:text-base mb-6 md:mb-8 max-w-sm md:max-w-md mx-auto">
                        You haven&apos;t unwrapped any drops yet. Browse live drops to start building your collection.
                    </p>
                    <Link href="/drops">
                        <Button variant="brand" className="px-6 py-2.5 rounded-full text-base font-bold">
                            Browse Drops
                        </Button>
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mb-4 md:mb-6">
                        <StickyFilterBar
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            searchQuery={searchQuery}
                            onSearchChange={(q: string) => {
                                // Analytics readiness: log search query explicitly here for later integration
                                if (q.length > 2) trackEvent("library_search", { query: q });
                                setSearchQuery(q);
                            }}
                        />
                        <div className="flex items-center justify-end mt-2 md:mt-3 px-2">
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-1">
                                <button
                                    onClick={() => setGridCols(2)}
                                    className={`p-1.5 rounded-full transition-colors ${gridCols === 2 ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"}`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                                        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setGridCols(3)}
                                    className={`p-1.5 rounded-full transition-colors ${gridCols === 3 ? "bg-white/20 text-white" : "text-gray-500 hover:text-white"}`}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="4" height="4"/><rect x="10" y="3" width="4" height="4"/><rect x="17" y="3" width="4" height="4"/>
                                        <rect x="3" y="10" width="4" height="4"/><rect x="10" y="10" width="4" height="4"/><rect x="17" y="10" width="4" height="4"/>
                                        <rect x="3" y="17" width="4" height="4"/><rect x="10" y="17" width="4" height="4"/><rect x="17" y="17" width="4" height="4"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="library-grid" className="grid grid-cols-6 gap-2 md:gap-4 pb-20">
                        {filteredDrops.map((drop) => (
                            <div key={drop.id} className={gridCols === 3 ? "col-span-2" : getItemSpanClass(drop)}>
                                <OwnedDropGalleryCard
                                    drop={drop}
                                    isUnlocked
                                    onOpen={() => {
                                        router.push(`/dashboard/viewer?id=${drop.id}`);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    {filteredDrops.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-gray-500">No items match your search or filter.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}




