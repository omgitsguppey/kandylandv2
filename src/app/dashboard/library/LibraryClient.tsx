"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import StickyFilterBar from '@/components/StickyFilterBar';
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Drop } from "@/types/db";
import { OwnedDropGalleryCard } from "@/components/Dashboard/OwnedDropGalleryCard";
import { trackEvent } from "@/lib/telemetry";
import { getMobileModuleClassNames } from "@/lib/ui/mobile-scale-contract";
import { getMobileSkeletonClass } from "@/lib/ui/loading-state-contract";

type Ratio = "1:1" | "16:9" | "9:16";

const userLibraryModuleClassName = getMobileModuleClassNames("user", "list");
const userLibrarySkeletonClassName = getMobileSkeletonClass("user", "list");

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
    const searchParams = useSearchParams();
    const targetDropId = searchParams.get("drop")?.trim() || "";
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

    useEffect(() => {
        if (authLoading || !targetDropId || !unlockedIds.has(targetDropId)) {
            return;
        }

        router.replace(`/dashboard/viewer?id=${encodeURIComponent(targetDropId)}`);
    }, [authLoading, router, targetDropId, unlockedIds]);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [gridCols, setGridCols] = useState<2 | 3>(2);

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

    if (authLoading) {
        return (
            <div
                className="animate-pulse"
                data-mobile-density="compact"
                data-mobile-sprawl-guard="true"
                data-mobile-skeleton="user-library-route"
                data-mobile-organization="summary-first"
                data-mobile-drilldown="true"
                data-user-library-surface="my-kandydrops"
            >
                <div className="mb-4">
                    <div className="h-10 w-64 bg-white/10 rounded mb-2" />
                    <div className="h-5 w-72 bg-white/5 rounded" />
                </div>
                <div className="grid grid-cols-6 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`col-span-3 ${userLibrarySkeletonClassName}`} />
                    ))}
                </div>
            </div>
        );
    }


    return (
        <div
            className="flex min-h-[calc(100dvh-var(--root-shell-top-spacing,6rem))] flex-col px-2 md:px-0"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-user-library-surface="my-kandydrops"
        >
            <header className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-purple mb-1">
                        My KandyDrops
                    </h1>
                    <p className="text-gray-400 text-xs md:text-sm">Your unwrapped library. ({unlockedDrops.length} total)</p>
                </div>
            </header>

            {unlockedDrops.length === 0 ? (
                <div className={`${userLibraryModuleClassName} text-center`} data-mobile-density="compact" data-mobile-sprawl-guard="true">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 md:h-14 md:w-14">
                        <Lock className="w-6 h-6 md:w-8 md:h-8 text-gray-500" />
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-white mb-2">No Unwrapped Drops</h2>
                    <p className="mx-auto mb-4 max-w-sm text-sm text-gray-400 md:max-w-md md:text-base">
                        You haven&apos;t unwrapped any drops yet. Browse live drops to start building your collection.
                    </p>
                    <Link href="/drops">
                        <Button variant="brand" className="rounded-full px-5 py-2.5 text-sm font-bold">
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
                        <div className="py-6 text-center" data-mobile-density="compact" data-mobile-sprawl-guard="true">
                            <p className="text-gray-500">No items match your search or filter.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}




