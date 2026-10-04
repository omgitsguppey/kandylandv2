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
import { KandyEditorialReleaseSkeleton } from "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection";
import { DropsDiscoveryExperience } from "@/components/creative-tim/kandydrops/drops/DropsDiscoveryExperience";

const FeaturedCarousel = dynamic(() => import("@/components/FeaturedCarousel").then(mod => mod.FeaturedCarousel), {
    ssr: false,
    loading: () => <KandyEditorialReleaseSkeleton itemCount={1} embedded />
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
    const { drops: liveDrops, loading: dropsLoading, error: dropsError, size, setSize, isLoadingMore, isReachingEnd } = useDrops(["active", "scheduled"], initialDrops);
    const profileReady = !authLoading && Boolean(user?.uid && userProfile?.uid === user.uid);
    const activeProfile = profileReady ? userProfile : null;
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
        if (!activeProfile?.unlockedContent || !Array.isArray(activeProfile.unlockedContent)) {
            return liveDrops;
        }
        return liveDrops.filter(drop => !activeProfile.unlockedContent!.includes(drop.id));
    }, [liveDrops, activeProfile]);

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
        authLoading: authLoading || Boolean(user && !profileReady),
        isAuthenticated: Boolean(user),
        userDisplayName: user?.displayName ?? null,
        userEmail: user?.email ?? null,
        userPhotoURL: user?.photoURL ?? null,
        profileBalance: typeof activeProfile?.gumDropsBalance === "number" ? activeProfile.gumDropsBalance : null,
    }), [authLoading, user, profileReady, activeProfile]);

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
        <DropsDiscoveryExperience
            activeDropCount={sourceDrops.length}
            visibleDropCount={filteredDrops.length}
            selectedCategory={selectedCategory}
            deferredSearchQuery={deferredSearchQuery}
            accountOverview={(
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
            )}
            featuredRelease={(!searchQuery && selectedCategory === "All" && sourceDrops.length > 0) ? (
                <FeaturedCarousel drops={sourceDrops} onSelectDrop={handleSelectDrop} />
            ) : null}
            creatorRail={<CreatorDiscoveryRail surface="drops" compact initialCreators={creatorRailProfiles} />}
            filters={(
                <StickyFilterBar
                    categories={CATEGORIES}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSelectCategory}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchFocus={trackSearchFocus}
                />
            )}
            collection={(
                <DropGrid
                    drops={filteredDrops}
                    loading={dropsLoading}
                    error={dropsError}
                    isSearching={Boolean(deferredSearchQuery.trim()) || selectedCategory !== "All"}
                    onClearFilters={() => { setSearchQuery(""); handleSelectCategory("All"); }}
                    onSelectDrop={handleSelectDrop}
                    impressionTrackingSurface="drops_page"
                    impressionTrackingSessionId={impressionTrackingSessionId}
                />
            )}
            pagination={(
                <div ref={observerRef} className="flex min-h-11 min-w-0 items-center justify-center">
                    {isLoadingMore && (
                        <div role="status" aria-label="Loading more Drops" className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" />
                    )}
                    {isReachingEnd && filteredDrops.length > 0 && (
                        <p className="text-sm text-muted-foreground">You&apos;ve reached the end.</p>
                    )}
                </div>
            )}
        />
    );
}
