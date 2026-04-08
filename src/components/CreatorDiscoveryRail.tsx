"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles, Users } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { buildCreatorDiscoveryNavigationParams } from "@/lib/creator-public-pages";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";
import { TitleMarquee } from "@/components/ui/TitleMarquee";

type CreatorCard = {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string | null;
    bio?: string;
    isVerified?: boolean;
    followerCount?: number;
    favoriteCount?: number;
    activeDropCount?: number;
    following?: boolean;
    favorited?: boolean;
    notificationsEnabled?: boolean;
};

interface CreatorDiscoveryRailProps {
    surface: "dashboard" | "drops" | "experiences";
    title?: string;
    compact?: boolean;
}

function initialsFor(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "C";
}

export function CreatorDiscoveryRail({ surface, title, compact = false }: CreatorDiscoveryRailProps) {
    const { user } = useAuth();
    const { openAuthModal } = useUI();
    const [recommendedCreators, setRecommendedCreators] = useState<CreatorCard[]>([]);
    const [followedCreators, setFollowedCreators] = useState<CreatorCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingCreatorId, setPendingCreatorId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadCreators() {
            try {
                const discoveryPromise = fetch(`/api/creator/discovery?surface=${surface}`, { cache: "no-store" });
                const relationshipPromise = user ? authFetch("/api/creator/relationships") : null;
                const [discoveryResponse, relationshipResponse] = await Promise.all([
                    discoveryPromise,
                    relationshipPromise,
                ]);
                const discoveryResult = await discoveryResponse.json() as { creators?: CreatorCard[] };

                let nextRecommended = discoveryResult.creators || [];
                let nextFollowed: CreatorCard[] = [];

                if (user && relationshipResponse) {
                    const relationshipResult = await relationshipResponse.json() as {
                        relationships?: Array<Record<string, unknown>>;
                        recommendedCreators?: CreatorCard[];
                        followedCreators?: CreatorCard[];
                    };
                    const relationshipMap = new Map(
                        (relationshipResult.relationships || [])
                            .filter((entry) => typeof entry.creatorId === "string")
                            .map((entry) => [String(entry.creatorId), entry]),
                    );

                    const relationshipRecommended = Array.isArray(relationshipResult.recommendedCreators) && relationshipResult.recommendedCreators.length > 0
                        ? relationshipResult.recommendedCreators
                        : nextRecommended;

                    nextRecommended = relationshipRecommended.map((creator) => {
                        const relationship = relationshipMap.get(creator.uid);
                        return {
                            ...creator,
                            following: relationship?.following === true,
                            notificationsEnabled: relationship?.notificationsEnabled === true,
                        };
                    });
                    nextFollowed = relationshipResult.followedCreators || (relationshipResult.relationships || [])
                        .filter((entry) => entry.following === true && typeof entry.creatorId === "string")
                        .map((entry) => ({
                            uid: String(entry.creatorId),
                            displayName: typeof entry.creatorDisplayName === "string" ? entry.creatorDisplayName : "Creator",
                            username: typeof entry.creatorUsername === "string" ? entry.creatorUsername : "",
                            photoURL: typeof entry.creatorPhotoURL === "string" ? entry.creatorPhotoURL : null,
                            following: entry.following === true,
                            favorited: entry.favorited === true,
                            notificationsEnabled: entry.notificationsEnabled === true,
                            followerCount: typeof entry.followerCount === "number" ? entry.followerCount : 0,
                            isVerified: entry.isVerified === true,
                        }));
                }

                if (!cancelled) {
                    setRecommendedCreators(nextRecommended);
                    setFollowedCreators(nextFollowed);
                    setLoading(false);
                }
            } catch (error) {
                reportClientIssue({
                    channel: "ui",
                    severity: "warn",
                    message: "Creator discovery rail failed to load",
                    error,
                    detail: {
                        surface,
                        signedIn: Boolean(user),
                    },
                    consoleLabel: "[CreatorDiscoveryRail] load failed",
                });
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadCreators();
        return () => {
            cancelled = true;
        };
    }, [surface, user]);

    const primaryCreators = useMemo(
        () => followedCreators.length > 0 ? followedCreators : recommendedCreators,
        [followedCreators, recommendedCreators],
    );
    const followerFormatter = useMemo(() => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }), []);

    const handleFollowToggle = async (creator: CreatorCard) => {
        if (!user) {
            openAuthModal("signup");
            return;
        }

        if (pendingCreatorId) {
            return;
        }

        const action = creator.following ? "unfollow" : "follow";
        setPendingCreatorId(creator.uid);

        try {
            const response = await authFetch("/api/creator/relationships", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    action,
                }),
            });
            const result = await response.json() as {
                error?: string;
                relationship?: {
                    creatorId?: string;
                    following?: boolean;
                    followerCount?: number | null;
                };
            };
            if (!response.ok || !result.relationship) {
                throw new Error(result.error || "Could not update creator follow state.");
            }

            const nextFollowing = result.relationship.following === true;
            const nextFollowerCount = typeof result.relationship.followerCount === "number"
                ? result.relationship.followerCount
                : creator.followerCount;

            setRecommendedCreators((current) => {
                const updated = current.map((entry) => (
                    entry.uid === creator.uid
                        ? { ...entry, following: nextFollowing, followerCount: nextFollowerCount }
                        : entry
                ));
                if (!nextFollowing && !updated.some((entry) => entry.uid === creator.uid)) {
                    return [{ ...creator, following: false, followerCount: nextFollowerCount }, ...updated];
                }
                return updated;
            });
            setFollowedCreators((current) => {
                const existingIndex = current.findIndex((entry) => entry.uid === creator.uid);
                if (nextFollowing) {
                    if (existingIndex >= 0) {
                        return current.map((entry) => (
                            entry.uid === creator.uid
                                ? { ...entry, following: true, followerCount: nextFollowerCount }
                                : entry
                        ));
                    }
                    return [{ ...creator, following: true, followerCount: nextFollowerCount }, ...current];
                }
                return current.filter((entry) => entry.uid !== creator.uid);
            });
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "Creator discovery follow toggle failed",
                error,
                detail: {
                    surface,
                    creatorId: creator.uid,
                    action,
                },
                consoleLabel: "[CreatorDiscoveryRail] follow toggle failed",
            });
        } finally {
            setPendingCreatorId(null);
        }
    };

    if (loading) {
        return null;
    }

    const header = title || (followedCreators.length > 0 ? "Creators you follow" : "Recommended creators");
    const support = followedCreators.length > 0
        ? "Jump back into your creator loop."
        : "Follow creators to unlock drops and private requests.";
    const emptyTitle = surface === "dashboard"
        ? "Creator spotlight opens as creators go live"
        : surface === "drops"
            ? "No creator spotlights are active here yet"
            : "No creator experiences are ready here yet";
    const emptySupport = surface === "dashboard"
        ? "As approved creator profiles come online, the dashboard will pin the ones you follow first and then recommend the rest."
        : surface === "drops"
            ? "As creator drops go live, this rail will surface the creators behind them without mixing admin tooling into fan discovery."
            : "Creator experiences only appear here once the underlying profile and fan actions are ready.";

    if (primaryCreators.length === 0) {
        return (
            <section className={cn(
                "glass-panel rounded-[2rem] border border-white/10 p-3 sm:p-4",
                compact ? "space-y-2" : "space-y-3",
            )}>
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Creator spotlight
                </div>
                <div className="rounded-[1.7rem] border border-dashed border-white/10 bg-black/25 px-4 py-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400">
                        <Users className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">{emptyTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{emptySupport}</p>
                </div>
            </section>
        );
    }

    return (
        <section className={cn(
            "glass-panel rounded-[2rem] border border-white/10 p-3 sm:p-4",
            compact ? "space-y-2" : "space-y-3",
        )}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                        Creator spotlight
                    </div>
                    <h3 className="mt-2 text-balance text-lg font-black text-white sm:text-xl">{header}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">{support}</p>
                </div>
                <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-right sm:block">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Surface</p>
                    <p className="mt-1 text-sm font-semibold text-white">{surface}</p>
                </div>
            </div>

            <div className="overflow-x-auto pb-1">
                <div className={cn("flex min-w-max gap-3", compact ? "pr-2" : "pr-4")}>
                    {primaryCreators.map((creator) => (
                        <div
                            key={creator.uid}
                            className="group flex w-[6.8rem] shrink-0 flex-col items-center gap-2.5 rounded-[1.75rem] border border-white/5 bg-white/[0.03] px-2.5 py-3 text-center"
                        >
                            <Link
                                href={creator.username ? `/creators/${creator.username}` : "#"}
                                onClick={() => {
                                    trackEvent("navigation_click", buildCreatorDiscoveryNavigationParams({
                                        creatorId: creator.uid,
                                        creatorUsername: creator.username,
                                        surface,
                                    }));
                                }}
                                className="flex w-full flex-col items-center gap-2"
                            >
                                <div className={cn(
                                    "rounded-full p-[2px] transition-transform group-hover:scale-105",
                                    creator.following ? "bg-white/10" : "bg-gradient-to-tr from-brand-purple to-pink-500"
                                )}>
                                    <div className="flex h-[4.4rem] w-[4.4rem] items-center justify-center overflow-hidden rounded-full border-[3px] border-black bg-zinc-900">
                                        {creator.photoURL ? (
                                            <Image src={creator.photoURL} alt={creator.displayName} width={72} height={72} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-black text-white">{initialsFor(creator.displayName)}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex w-full flex-col items-center">
                                    <div className="flex max-w-full items-center justify-center gap-1">
                                        <TitleMarquee
                                            title={creator.displayName}
                                            delaySeed={creator.uid.charCodeAt(0) % 6}
                                            className="max-w-full text-[11px] font-bold text-white tracking-tight"
                                        />
                                        {creator.isVerified ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-purple" /> : null}
                                    </div>
                                    {creator.username ? (
                                        <TitleMarquee
                                            title={creator.username.replace(/^@+/, "")}
                                            delaySeed={(creator.uid.charCodeAt(0) + 2) % 6}
                                            className="mt-0.5 max-w-full text-[10px] font-medium text-gray-300"
                                        />
                                    ) : null}
                                    <p className="mt-1 text-[10px] text-gray-500">
                                        {followerFormatter.format(Math.max(creator.followerCount ?? 0, 0))} followers
                                    </p>
                                </div>
                            </Link>

                            <button
                                type="button"
                                onClick={() => void handleFollowToggle(creator)}
                                disabled={pendingCreatorId === creator.uid}
                                className={cn(
                                    "inline-flex min-h-7 items-center justify-center rounded-full border px-3 py-1 text-[10px] font-bold transition-colors",
                                    creator.following
                                        ? "border-brand-purple/60 bg-black text-brand-purple"
                                        : "border-brand-purple/30 bg-brand-purple/15 text-white",
                                )}
                            >
                                {pendingCreatorId === creator.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : creator.following ? "following" : "Follow"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
