"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Heart, Sparkles, Users } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { buildCreatorDiscoveryNavigationParams } from "@/lib/creator-public-pages";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";

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
    const [recommendedCreators, setRecommendedCreators] = useState<CreatorCard[]>([]);
    const [followedCreators, setFollowedCreators] = useState<CreatorCard[]>([]);
    const [loading, setLoading] = useState(true);

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
                    };

                    nextRecommended = relationshipResult.recommendedCreators || nextRecommended;
                    nextFollowed = (relationshipResult.relationships || [])
                        .filter((entry) => entry.following === true && typeof entry.creatorId === "string")
                        .map((entry) => ({
                            uid: String(entry.creatorId),
                            displayName: typeof entry.creatorDisplayName === "string" ? entry.creatorDisplayName : "Creator",
                            username: typeof entry.creatorUsername === "string" ? entry.creatorUsername : "",
                            photoURL: typeof entry.creatorPhotoURL === "string" ? entry.creatorPhotoURL : null,
                            following: entry.following === true,
                            favorited: entry.favorited === true,
                            notificationsEnabled: entry.notificationsEnabled === true,
                        }));
                }

                if (!cancelled) {
                    setRecommendedCreators(nextRecommended);
                    setFollowedCreators(nextFollowed);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to load creator discovery", error);
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

    if (loading) {
        return null;
    }

    const header = title || (followedCreators.length > 0 ? "Creators you follow" : "Recommended creators");
    const support = followedCreators.length > 0
        ? "Jump back into the approved creator profiles already in your fan loop."
        : "Start following creators to unlock drops, private requests, and live creator experiences.";
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
                "glass-panel rounded-[2rem] border border-white/10 p-4 sm:p-5",
                compact ? "space-y-3" : "space-y-4",
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
            "glass-panel rounded-[2rem] border border-white/10 p-4 sm:p-5",
            compact ? "space-y-3" : "space-y-4",
        )}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                        Creator spotlight
                    </div>
                    <h3 className="mt-3 text-lg font-black text-white sm:text-xl">{header}</h3>
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
                        <Link
                            key={creator.uid}
                            href={creator.username ? `/creators/${creator.username}` : "#"}
                            onClick={() => {
                                trackEvent("navigation_click", buildCreatorDiscoveryNavigationParams({
                                    creatorId: creator.uid,
                                    creatorUsername: creator.username,
                                    surface,
                                }));
                            }}
                            className="group w-[10rem] shrink-0"
                        >
                            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-3 transition-all group-hover:border-brand-purple/30 group-hover:bg-white/[0.07]">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-purple/25 bg-black/40 shadow-[0_0_0_4px_rgba(255,255,255,0.02)] transition-transform group-hover:scale-[1.03]">
                                        {creator.photoURL ? (
                                            <Image src={creator.photoURL} alt={creator.displayName} width={56} height={56} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-black text-white">{initialsFor(creator.displayName)}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="truncate text-sm font-bold text-white">{creator.displayName}</p>
                                            {creator.isVerified ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-purple" /> : null}
                                        </div>
                                        <p className="truncate text-xs text-gray-500">{creator.username ? `@${creator.username}` : "creator"}</p>
                                        {creator.bio ? (
                                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">{creator.bio}</p>
                                        ) : (
                                            <p className="mt-2 text-xs leading-5 text-gray-500">
                                                Approved creator profile with live fan experiences.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-gray-300">
                                    {creator.following ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2 py-1 font-bold text-brand-purple">
                                            <Users className="h-3 w-3" />
                                            Following
                                        </span>
                                    ) : null}
                                    {creator.followerCount ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 font-bold">
                                            <Users className="h-3 w-3" />
                                            {creator.followerCount} fans
                                        </span>
                                    ) : null}
                                    {creator.activeDropCount ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 font-bold">
                                            <Sparkles className="h-3 w-3" />
                                            {creator.activeDropCount} live
                                        </span>
                                    ) : null}
                                    {!creator.following && !creator.followerCount && creator.favoriteCount ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 font-bold">
                                            <Heart className="h-3 w-3" />
                                            {creator.favoriteCount} saved
                                        </span>
                                    ) : null}
                                    {!creator.following && !creator.followerCount && !creator.activeDropCount && !creator.favoriteCount ? (
                                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 font-bold text-gray-400">
                                            Profile ready
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
