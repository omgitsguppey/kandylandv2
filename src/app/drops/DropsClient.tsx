"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { DropGrid } from "@/components/DropGrid";
import StickyFilterBar from "@/components/StickyFilterBar";
import { Drop } from "@/types/db";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useDrops } from "@/hooks/useDrops";
import { KandyDropsAccountOverview } from "@/components/KandyDropsAccountOverview";
import type { CreatorDiscoveryProfile } from "@/lib/creator-public-pages";
import { trackEvent } from "@/lib/telemetry";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";
import { buildAccountOverviewViewModel } from "@/lib/drops-account-overview-view-model";
import {
    createDiscoveryTrackingSessionId,
} from "@/lib/discovery-telemetry";
import { useDropsSearchTelemetry } from "@/hooks/useDropsSearchTelemetry";

const FeaturedCarousel = dynamic(() => import("@/components/FeaturedCarousel").then(mod => mod.FeaturedCarousel), {
    ssr: false,
    loading: () => <div className="h-44 w-full animate-pulse rounded-[1.35rem] border border-white/10 bg-zinc-900/50 sm:h-64 md:h-[320px] md:rounded-[2rem]" />
});

const CATEGORIES = ["All", "New", "Ending Soon", "Hottest", "Sweet", "Spicy", "RAW"];

interface DropsClientProps {
    initialDrops: Drop[];
    creatorRailProfiles: CreatorDiscoveryProfile[];
}

export function DropsClient({ initialDrops, creatorRailProfiles }: DropsClientProps) {
    const router = useRouter();
    const { user, userProfile, loading: authLoading } = useAuth();
    const { openAuthModal, openPurchaseModal, openProfileSidebar } = useUI();
    const { drops: liveDrops, size, setSize, isLoadingMore, isReachingEnd } = useDrops(["active", "scheduled"], initialDrops);
    const [impressionTrackingSessionId] = useState(() => createDiscoveryTrackingSessionId("drops"));

    const observerRef = useRef<HTMLDivElement>(null);
    const pageViewTrackedRef = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && !isReachingEnd) {
                    setSize(size + 1);
                }
            },
            { rootMargin: "200px" }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [isLoadingMore, isReachingEnd, size, setSize]);

    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const sourceDrops = useMemo(() => {
        if (!userProfile?.unlockedContent || !Array.isArray(userProfile.unlockedContent)) {
            return liveDrops;
        }
        return liveDrops.filter(drop => !userProfile.unlockedContent!.includes(drop.id));
    }, [liveDrops, userProfile]);

    useEffect(() => {
        if (pageViewTrackedRef.current) {
            return;
        }

        pageViewTrackedRef.current = true;
        trackEvent("drops_page_viewed", {
            source_component: "drops_compact_mobile_page",
            ui_density: DROPS_MOBILE_UI_DENSITY,
            initial_drop_count: liveDrops.length,
            initial_visible_drop_count: sourceDrops.length,
            creator_rail_count: creatorRailProfiles.length,
        });
    }, [creatorRailProfiles.length, liveDrops.length, sourceDrops.length]);

    const accountOverview = useMemo(() => buildAccountOverviewViewModel({
        authLoading,
        userDisplayName: user?.displayName ?? null,
        userEmail: user?.email ?? null,
        userPhotoURL: user?.photoURL ?? null,
        profileBalance: typeof userProfile?.gumDropsBalance === "number" ? userProfile.gumDropsBalance : null,
    }), [authLoading, user, userProfile]);

    const filteredDrops = useMemo(() => {
        if (!sourceDrops) return [];

        let result = sourceDrops;

        const normalizedSearchQuery = deferredSearchQuery.trim();

        if (normalizedSearchQuery) {
            const lowerQuery = normalizedSearchQuery.toLowerCase();
            result = result.filter(drop =>
                drop.title.toLowerCase().includes(lowerQuery) ||
                drop.description.toLowerCase().includes(lowerQuery)
            );
        }

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
    }, [sourceDrops, deferredSearchQuery, selectedCategory]);

    const {
        trackCategorySelected,
        trackSearchFocus,
        trackSearchResultClicked,
    } = useDropsSearchTelemetry({
        deferredSearchQuery,
        filteredDrops,
        selectedCategory,
    });

    const handleSelectDrop = useCallback((drop: Drop, sourceComponent = "drops_page") => {
        trackSearchResultClicked(drop.id, sourceComponent);
        router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=${encodeURIComponent(sourceComponent)}`);
    }, [router, trackSearchResultClicked]);

    const handleSelectCategory = useCallback((category: string) => {
        setSelectedCategory(category);
        if (category !== selectedCategory) {
            trackCategorySelected(category);
        }
    }, [selectedCategory, trackCategorySelected]);

    return (
        <div
            className="mx-auto w-full max-w-7xl px-3 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] pb-4 selection:bg-brand-purple/30 sm:px-4 md:px-8 md:pt-0 md:pb-8"
            data-onboarding-page="drops"
            data-drops-page-density="compact-mobile"
            data-drop-visibility-scope="public_discovery"
        >
            <div className="mb-2 md:mb-5">
                <KandyDropsAccountOverview
                    state={accountOverview.state}
                    displayName={accountOverview.displayName}
                    subtitle={accountOverview.subtitle}
                    avatarUrl={accountOverview.avatarUrl}
                    avatarFallback={accountOverview.avatarFallback}
                    balanceLabel={accountOverview.balanceLabel}
                    onProfilePress={() => {
                        if (!user) {
                            openAuthModal("signup");
                            return;
                        }
                        openProfileSidebar();
                    }}
                    onWalletPress={() => {
                        if (!user) {
                            openAuthModal("signup");
                            return;
                        }
                        openPurchaseModal();
                    }}
                />
            </div>

            <CreatorDiscoveryRail surface="drops" compact initialCreators={creatorRailProfiles} />

            {!searchQuery && selectedCategory === "All" && (
                <div className="mt-3">
                    <FeaturedCarousel drops={sourceDrops} onSelectDrop={handleSelectDrop} />
                </div>
            )}

            <div id="live-drops" className="mt-3 md:mt-6">
                <div className="mb-2 flex flex-row items-center justify-between gap-2 px-1 md:mb-4 md:px-0">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-black tracking-tight text-white md:text-2xl">
                            {deferredSearchQuery ? `Results: "${deferredSearchQuery}"` : selectedCategory === "All" ? "All KandyDrops" : `${selectedCategory} Drops`}
                        </h2>
                    </div>
                    <span className="shrink-0 rounded-[0.7rem] border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] font-bold text-gray-400 md:text-sm">
                        {filteredDrops.length}
                    </span>
                </div>
                
                <div className="mb-2 md:mb-4">
                    <StickyFilterBar
                        categories={CATEGORIES}
                        selectedCategory={selectedCategory}
                        onSelectCategory={handleSelectCategory}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onSearchFocus={trackSearchFocus}
                    />
                </div>

                <div className="relative rounded-[1.45rem] border border-white/5 bg-white/[0.01] p-1.5 md:rounded-[2rem] md:p-6">
                    <DropGrid
                        drops={filteredDrops}
                        loading={false}
                        isSearching={!!deferredSearchQuery}
                        onSelectDrop={handleSelectDrop}
                        impressionTrackingSurface="drops_page"
                        impressionTrackingSessionId={impressionTrackingSessionId}
                    />

                    <div ref={observerRef} className="mt-4 flex h-8 items-center justify-center md:mt-8 md:h-10">
                        {isLoadingMore && (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-purple border-t-transparent md:h-6 md:w-6" />
                        )}
                        {isReachingEnd && filteredDrops.length > 0 && (
                            <p className="text-xs font-medium text-gray-500 md:text-sm">You&apos;ve reached the end.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
