"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import { CreatorDiscoveryRail } from "@/components/CreatorDiscoveryRail";
import { DropGrid } from "@/components/DropGrid";
import StickyFilterBar from "@/components/StickyFilterBar";
import { Drop } from "@/types/db";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useDrops } from "@/hooks/useDrops";
import { KandyDropsAccountOverview, AccountOverviewState } from "@/components/KandyDropsAccountOverview";
import type { CreatorDiscoveryProfile } from "@/lib/creator-public-pages";
import { trackEvent } from "@/lib/telemetry";
import { DROPS_MOBILE_UI_DENSITY } from "@/hooks/useDropCardImpression";

const FeaturedCarousel = dynamic(() => import("@/components/FeaturedCarousel").then(mod => mod.FeaturedCarousel), {
    ssr: false,
    loading: () => <div className="h-44 w-full animate-pulse rounded-[1.35rem] border border-white/10 bg-zinc-900/50 sm:h-64 md:h-[320px] md:rounded-[2rem]" />
});

const DropPreviewModal = dynamic(() => import("@/components/DropPreviewModal").then(mod => mod.DropPreviewModal), {
    ssr: false
});

const CATEGORIES = ["All", "New", "Ending Soon", "Hottest", "Sweet", "Spicy", "RAW"];

interface DropsClientProps {
    initialDrops: Drop[];
    creatorRailProfiles: CreatorDiscoveryProfile[];
}

interface AccountOverviewViewModel {
    state: AccountOverviewState;
    displayName: string;
    subtitle: string;
    avatarUrl: string | null;
    avatarFallback: string;
    balanceLabel: string;
}

function toPositiveInteger(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return 0;
    }

    return Math.max(0, Math.floor(numeric));
}

function buildAccountOverviewViewModel(params: {
    authLoading: boolean;
    userDisplayName: string | null;
    userEmail: string | null;
    userPhotoURL: string | null;
    profileBalance: number | null;
}): AccountOverviewViewModel {
    if (params.authLoading) {
        return {
            state: "loading",
            displayName: "Loading profile",
            subtitle: "Loading account",
            avatarUrl: null,
            avatarFallback: "...",
            balanceLabel: "Loading GD",
        };
    }

    const normalizedName = params.userDisplayName?.trim() || "Collector";
    const normalizedEmail = params.userEmail?.trim() || "Signed in";
    const normalizedBalance = toPositiveInteger(params.profileBalance);
    const normalizedFallback = normalizedName.charAt(0).toUpperCase() || "K";

    if (!params.userDisplayName && !params.userEmail) {
        return {
            state: "guest",
            displayName: "Guest collector",
            subtitle: "Unwrap now to start your stash",
            avatarUrl: null,
            avatarFallback: "G",
            balanceLabel: "0 GD",
        };
    }

    return {
        state: "authenticated",
        displayName: normalizedName,
        subtitle: normalizedEmail,
        avatarUrl: params.userPhotoURL?.trim() || null,
        avatarFallback: normalizedFallback,
        balanceLabel: `${normalizedBalance.toLocaleString()} GD`,
    };
}

export function DropsClient({ initialDrops, creatorRailProfiles }: DropsClientProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, userProfile, loading: authLoading } = useAuth();
    const { openAuthModal, openPurchaseModal, openProfileSidebar } = useUI();
    const { drops: liveDrops, size, setSize, isLoadingMore, isReachingEnd } = useDrops(["active", "scheduled"], initialDrops);
    const [impressionTrackingSessionId] = useState(() => {
        let token = "";
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            token = crypto.randomUUID().slice(0, 8);
        } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
            const buffer = new Uint8Array(4);
            crypto.getRandomValues(buffer);
            token = Array.from(buffer)
                .map((b) => b.toString(36))
                .join("")
                .slice(0, 8);
        } else {
            throw new Error("Cryptographically secure random number generation is not available in this environment.");
        }
        return `drops_${Date.now().toString(36)}_${token}`;
    });

    const observerRef = useRef<HTMLDivElement>(null);
    const pageViewTrackedRef = useRef(false);
    const lastTrackedSearchRef = useRef("");

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
    const [previewDropId, setPreviewDropId] = useState<string | null>(null);
    const requestedPreviewDropId = searchParams.get("drop")?.trim() || "";
    const [urlPreviewDropId, setUrlPreviewDropId] = useState(requestedPreviewDropId);

    useEffect(() => {
        setUrlPreviewDropId(requestedPreviewDropId);
    }, [requestedPreviewDropId]);

    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const nextDropId = params.get("drop")?.trim() || "";
            setUrlPreviewDropId(nextDropId);
            setPreviewDropId(nextDropId || null);
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

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

    useEffect(() => {
        const normalizedQuery = deferredSearchQuery.trim();
        if (normalizedQuery.length <= 2 || normalizedQuery === lastTrackedSearchRef.current) {
            return;
        }

        lastTrackedSearchRef.current = normalizedQuery;
        trackEvent("drops_searched", {
            query: normalizedQuery,
            source_component: "compact_drops_filter_bar",
            ui_density: DROPS_MOBILE_UI_DENSITY,
            result_count: filteredDrops.length,
        });
    }, [deferredSearchQuery, filteredDrops.length]);

    const syncDropQuery = useCallback((dropId: string | null) => {
        if (typeof window === "undefined") {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        if (dropId) {
            params.set("drop", dropId);
        } else {
            params.delete("drop");
        }

        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        window.history.replaceState(window.history.state, "", nextUrl);
        setUrlPreviewDropId(dropId ?? "");
    }, [pathname]);

    const previewDrop = useMemo(() => {
        const activePreviewDropId = previewDropId || urlPreviewDropId;
        if (!activePreviewDropId) {
            return null;
        }

        return liveDrops.find((drop) => drop.id === activePreviewDropId) ?? null;
    }, [liveDrops, previewDropId, urlPreviewDropId]);

    const handleSelectDrop = useCallback((drop: Drop) => {
        setPreviewDropId(drop.id);
        syncDropQuery(drop.id);
    }, [syncDropQuery]);

    const handleClosePreview = useCallback(() => {
        setPreviewDropId(null);
        if (urlPreviewDropId) {
            syncDropQuery(null);
        }
    }, [syncDropQuery, urlPreviewDropId]);

    const handleSelectCategory = useCallback((category: string) => {
        setSelectedCategory(category);
        if (category !== selectedCategory) {
            trackEvent("drops_category_selected", {
                category,
                source_component: "compact_drops_filter_bar",
                ui_density: DROPS_MOBILE_UI_DENSITY,
                visible_drop_count: filteredDrops.length,
            });
        }
    }, [filteredDrops.length, selectedCategory]);

    return (
        <div
            className="mx-auto w-full max-w-7xl px-3 pt-[calc(var(--kandy-cookie-offset,0px)+0.75rem)] pb-4 selection:bg-brand-purple/30 sm:px-4 md:px-8 md:pt-0 md:pb-8"
            data-onboarding-page="drops"
            data-drops-page-density="compact-mobile"
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

            {previewDrop ? <DropPreviewModal drop={previewDrop} onClose={handleClosePreview} /> : null}
        </div>
    );
}
