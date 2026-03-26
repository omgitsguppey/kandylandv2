"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DropGrid } from "@/components/DropGrid";
import StickyFilterBar from "@/components/StickyFilterBar";
import { Drop } from "@/types/db";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useDrops } from "@/hooks/useDrops";
import { useDeferredClientReady } from "@/hooks/useDeferredClientReady";
import { useNetworkConditions } from "@/hooks/useNetworkConditions";
import { KandyDropsAccountOverview, AccountOverviewState } from "@/components/KandyDropsAccountOverview";
import dynamic from "next/dynamic";
import { trackEvent } from "@/lib/telemetry";

const CreatorDiscoveryRail = dynamic(
    () => import("@/components/CreatorDiscoveryRail").then((mod) => mod.CreatorDiscoveryRail),
);

const FeaturedCarousel = dynamic(() => import("@/components/FeaturedCarousel").then(mod => mod.FeaturedCarousel), {
    ssr: false,
    loading: () => <div className="h-64 sm:h-80 md:h-[400px] w-full rounded-[2.5rem] bg-zinc-900/50 animate-pulse border border-white/10" />
});

const DropPreviewModal = dynamic(() => import("@/components/DropPreviewModal").then(mod => mod.DropPreviewModal), {
    ssr: false
});

const CATEGORIES = ["All", "New", "Ending Soon", "Hottest", "Sweet", "Spicy", "RAW"];

interface DropsClientProps {
    initialDrops: Drop[];
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
            avatarFallback: "…",
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

export function DropsClient({ initialDrops }: DropsClientProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, userProfile, loading: authLoading } = useAuth();
    const { openAuthModal, openPurchaseModal, openProfileSidebar } = useUI();
    const { drops: liveDrops, size, setSize, isLoadingMore, isReachingEnd } = useDrops(["active", "scheduled"], initialDrops);
    const { isConstrained, isVerySlow } = useNetworkConditions();
    const creatorRailReady = useDeferredClientReady({
        delayMs: isVerySlow ? 1_500 : isConstrained ? 1_000 : 250,
        idle: true,
    });
    const featuredReady = useDeferredClientReady({
        delayMs: isVerySlow ? 1_900 : isConstrained ? 1_100 : 200,
        idle: true,
    });
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

    useEffect(() => {
        trackEvent("drops_page_viewed");
    }, []);

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

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
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
    }, [sourceDrops, searchQuery, selectedCategory]);

    const syncDropQuery = (dropId: string | null) => {
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
    };

    const previewDrop = useMemo(() => {
        const activePreviewDropId = previewDropId || urlPreviewDropId;
        if (!activePreviewDropId) {
            return null;
        }

        return liveDrops.find((drop) => drop.id === activePreviewDropId) ?? null;
    }, [liveDrops, previewDropId, urlPreviewDropId]);

    const handleSelectDrop = (drop: Drop) => {
        setPreviewDropId(drop.id);
        syncDropQuery(drop.id);
    };

    const handleClosePreview = () => {
        setPreviewDropId(null);
        if (urlPreviewDropId) {
            syncDropQuery(null);
        }
    };

    return (
        <div
            className="mx-auto w-full max-w-7xl px-4 pt-[calc(var(--kandy-cookie-offset,0px)+3.5rem)] pb-[calc(7.75rem+env(safe-area-inset-bottom))] selection:bg-brand-purple/30 md:px-8 md:pt-0 md:pb-8"
            data-onboarding-page="drops"
        >
            <div className="mb-4 md:mb-6">
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

            {creatorRailReady ? <CreatorDiscoveryRail surface="drops" compact /> : null}

            <StickyFilterBar
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {!searchQuery && selectedCategory === "All" && featuredReady && (
                <div className="mt-6">
                    <FeaturedCarousel drops={sourceDrops} onSelectDrop={handleSelectDrop} />
                </div>
            )}

            <div id="live-drops" className="mt-8 min-h-[500px]">
                <div className="flex items-center justify-between mb-8 px-4 md:px-0 gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {searchQuery ? `Search Results: "${searchQuery}"` : selectedCategory === "All" ? "All KandyDrops" : `${selectedCategory} Drops`}
                    </h2>
                    <span className="text-gray-500 text-xs md:text-sm font-mono px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">
                        {filteredDrops.length} items
                    </span>
                </div>

                <div className="mb-5 px-4 md:px-0">
                    <p className="text-sm text-gray-400">Live KandyDrops can disappear when the timer ends. Unwrap while they&apos;re active to keep them in your library.</p>
                </div>

                <div className="relative border border-white/5 bg-white/[0.01] rounded-[2.5rem] p-2 md:p-6">
                    <DropGrid
                        drops={filteredDrops}
                        loading={false}
                        isSearching={!!searchQuery}
                        onSelectDrop={handleSelectDrop}
                        impressionTrackingSurface="drops_page"
                        impressionTrackingSessionId={impressionTrackingSessionId}
                    />

                    {/* Sentinel for infinite scrolling */}
                    <div ref={observerRef} className="h-10 mt-8 flex items-center justify-center">
                        {isLoadingMore && (
                            <div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
                        )}
                        {isReachingEnd && filteredDrops.length > 0 && (
                            <p className="text-gray-500 text-sm font-medium">You&apos;ve reached the end of the line.</p>
                        )}
                    </div>
                </div>
            </div>

            {previewDrop ? <DropPreviewModal drop={previewDrop} onClose={handleClosePreview} /> : null}
        </div>
    );
}
