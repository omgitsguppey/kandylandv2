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
import { getMobileModuleClassNames } from "@/lib/frontend-hardening/ui/mobile-scale-contract";
import { getMobileSkeletonClass } from "@/lib/frontend-hardening/ui/loading-state-contract";

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
        const filtered: Drop[] = [];
        const lowerSearch = searchQuery ? searchQuery.toLowerCase() : "";
        const filteringCategory = selectedCategory !== "All";

        for (const drop of unlockedDrops) {
            if (filteringCategory && drop.creatorId !== selectedCategory) {
                continue;
            }
            if (lowerSearch) {
                const titleMatches = drop.title.toLowerCase().includes(lowerSearch);
                const creatorMatches = Boolean(drop.creatorId?.toLowerCase().includes(lowerSearch));
                if (!titleMatches && !creatorMatches) {
                    continue;
                }
            }
            filtered.push(drop);
        }

        return filtered;
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
                className="animate-pulse rounded-[1.75rem] border border-white/8 bg-[linear-gradient(135deg,rgba(39,9,68,0.7),rgba(9,5,22,0.76))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.2)] md:p-6"
                data-mobile-density="compact"
                data-mobile-sprawl-guard="true"
                data-mobile-skeleton="user-library-route"
                data-mobile-organization="summary-first"
                data-mobile-drilldown="true"
                data-user-library-surface="my-kandydrops"
                data-user-library-loading-stable="true"
            >
                <div className="mb-5">
                    <div className="mb-2 h-3 w-20 rounded-full bg-brand-purple/20" />
                    <div className="mb-2 h-8 w-48 rounded-xl bg-white/10" />
                    <div className="h-4 w-56 max-w-full rounded-full bg-white/5" />
                </div>
                <div className="grid grid-cols-6 gap-2.5 md:gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`col-span-3 ${userLibrarySkeletonClassName}`} />
                    ))}
                </div>
            </div>
        );
    }


    return (
        <div
            className="relative flex min-h-[calc(100dvh-var(--root-shell-top-spacing,6rem))] flex-col overflow-hidden px-2 pb-4 md:px-0"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
            data-mobile-organization="summary-first"
            data-mobile-drilldown="true"
            data-user-library-surface="my-kandydrops"
        >
            <header className="relative mb-4 overflow-hidden rounded-[1.65rem] border border-brand-purple/20 bg-[linear-gradient(135deg,rgba(44,10,77,0.64),rgba(12,7,29,0.85)_58%,rgba(74,16,104,0.42))] px-4 py-5 shadow-[0_20px_60px_rgba(12,3,29,0.26)] md:mb-6 md:px-6 md:py-6">
                <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-brand-purple/20 blur-3xl" aria-hidden="true" />
                <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-brand-purple">Your collection</p>
                        <h1 className="mb-1 bg-gradient-to-r from-white via-purple-100 to-brand-purple bg-clip-text text-2xl font-black text-transparent md:text-3xl">
                        My KandyDrops
                        </h1>
                        <p className="text-xs text-purple-100/65 md:text-sm">Your unwrapped library. ({unlockedDrops.length} total)</p>
                    </div>
                    <div className="inline-flex w-fit items-center rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-xs font-bold text-white shadow-inner shadow-white/5">
                        {unlockedDrops.length} collected
                    </div>
                </div>
            </header>

            {unlockedDrops.length === 0 ? (
                <div className={`${userLibraryModuleClassName} relative overflow-hidden border border-brand-purple/20 bg-[radial-gradient(circle_at_top,rgba(143,55,255,0.18),transparent_42%),linear-gradient(145deg,rgba(27,10,48,0.86),rgba(8,5,20,0.94))] text-center shadow-[0_24px_70px_rgba(0,0,0,0.26)]`} data-mobile-density="compact" data-mobile-sprawl-guard="true">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] shadow-inner shadow-white/10 md:h-14 md:w-14">
                        <Lock className="h-6 w-6 text-brand-purple md:h-8 md:w-8" />
                    </div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-purple">Start your collection</p>
                    <h2 className="mb-2 text-lg font-black text-white md:text-xl">No Unwrapped Drops</h2>
                    <p className="mx-auto mb-5 max-w-sm text-sm text-purple-100/65 md:max-w-md md:text-base">
                        You haven&apos;t unwrapped any drops yet. Browse live drops to start building your collection.
                    </p>
                    <Link href="/drops">
                        <Button variant="brand" className="min-h-11 rounded-full px-5 py-2.5 text-sm font-bold shadow-[0_12px_28px_rgba(124,58,237,0.3)]">
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
                        <div className="mt-2 flex items-center justify-end px-2 md:mt-3">
                            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/30 p-1.5 shadow-inner shadow-white/5">
                                <button
                                    type="button"
                                    onClick={() => setGridCols(2)}
                                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${gridCols === 2 ? "bg-brand-purple/25 text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)]" : "text-gray-500 hover:bg-white/[0.07] hover:text-white"}`}
                                    aria-label="Use comfortable library grid"
                                    aria-pressed={gridCols === 2}
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                                        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGridCols(3)}
                                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${gridCols === 3 ? "bg-brand-purple/25 text-white shadow-[0_8px_18px_rgba(124,58,237,0.22)]" : "text-gray-500 hover:bg-white/[0.07] hover:text-white"}`}
                                    aria-label="Use compact library grid"
                                    aria-pressed={gridCols === 3}
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

                    <div id="library-grid" className="grid grid-cols-6 gap-2.5 pb-20 md:gap-4">
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
                        <div className="rounded-2xl border border-white/8 bg-white/[0.035] py-7 text-center" data-mobile-density="compact" data-mobile-sprawl-guard="true">
                            <p className="text-sm text-purple-100/60">No items match your search or filter.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}




