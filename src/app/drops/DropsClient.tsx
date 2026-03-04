"use client";

import { useState, useMemo } from "react";
import { DropGrid } from "@/components/DropGrid";
import StickyFilterBar from "@/components/StickyFilterBar";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { Drop } from "@/types/db";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { Lock } from "lucide-react";
import { DropPreviewModal } from "@/components/DropPreviewModal";
import { useDrops } from "@/hooks/useDrops";
import { KandyDropsAccountOverview, AccountOverviewState } from "@/components/KandyDropsAccountOverview";
import { GuestBlurOverlay } from "@/components/Auth/GuestBlurOverlay";
import { useEffect, useRef } from "react";

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
            subtitle: "Sign in to manage your stash",
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
    const { user, userProfile, loading: authLoading } = useAuth();
    const { openAuthModal, openPurchaseModal, openProfileSidebar } = useUI();
    const { drops: liveDrops, size, setSize, isLoadingMore, isReachingEnd } = useDrops(["active", "scheduled"], initialDrops);

    const observerRef = useRef<HTMLDivElement>(null);

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
    const [previewDrop, setPreviewDrop] = useState<Drop | null>(null);

    const sourceDrops = liveDrops.length > 0 ? liveDrops : initialDrops;

    const accountOverview = useMemo(() => buildAccountOverviewViewModel({
        authLoading,
        userDisplayName: user?.displayName ?? null,
        userEmail: user?.email ?? null,
        userPhotoURL: user?.photoURL ?? null,
        profileBalance: typeof userProfile?.gumDropsBalance === "number" ? userProfile.gumDropsBalance : null,
    }), [authLoading, user?.displayName, user?.email, user?.photoURL, userProfile?.gumDropsBalance]);

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

    return (
        <div className="w-full selection:bg-brand-purple/30 px-4 md:px-8 max-w-7xl mx-auto">
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
                            openAuthModal();
                            return;
                        }
                        openProfileSidebar();
                    }}
                    onWalletPress={() => {
                        openPurchaseModal();
                    }}
                />
            </div>

            <StickyFilterBar
                categories={CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {!searchQuery && selectedCategory === "All" && (
                <div className="mt-6">
                    <FeaturedCarousel drops={sourceDrops} onSelectDrop={setPreviewDrop} />
                </div>
            )}

            <div className="mt-8 min-h-[500px]">
                <div className="flex items-center justify-between mb-8 px-4 md:px-0 gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        {searchQuery ? `Search Results: "${searchQuery}"` : selectedCategory === "All" ? "All KandyDrops" : `${selectedCategory} Drops`}
                    </h2>
                    <span className="text-gray-500 text-xs md:text-sm font-mono px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">
                        {filteredDrops.length} items
                    </span>
                </div>

                <div className="mb-5 px-4 md:px-0">
                    <p className="text-sm text-gray-400">The fastest unwrappers usually return daily. New content can sell out quickly.</p>
                </div>

                <div className="relative">
                    <GuestBlurOverlay>
                        <DropGrid drops={filteredDrops} loading={false} isSearching={!!searchQuery} onSelectDrop={setPreviewDrop} />

                        {/* Sentinel for infinite scrolling */}
                        <div ref={observerRef} className="h-10 mt-8 flex items-center justify-center">
                            {isLoadingMore && (
                                <div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
                            )}
                            {isReachingEnd && filteredDrops.length > 0 && (
                                <p className="text-gray-500 text-sm font-medium">You've reached the end of the line.</p>
                            )}
                        </div>
                    </GuestBlurOverlay>
                </div>
            </div>

            <DropPreviewModal drop={previewDrop} onClose={() => setPreviewDrop(null)} />
        </div>
    );
}
