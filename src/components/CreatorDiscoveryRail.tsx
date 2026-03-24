"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Sparkles, Users } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
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
                const discoveryResponse = await fetch(`/api/creator/discovery?surface=${surface}`, { cache: "no-store" });
                const discoveryResult = await discoveryResponse.json() as { creators?: CreatorCard[] };

                let nextRecommended = discoveryResult.creators || [];
                let nextFollowed: CreatorCard[] = [];

                if (user) {
                    const relationshipResponse = await authFetch("/api/creator/relationships");
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
        ? "Jump back into the creator experiences already in your loop."
        : "Start following creators to unlock their adjacent experience layer.";
    const emptyTitle = surface === "dashboard"
        ? "Creator experiences are warming up"
        : surface === "drops"
            ? "No creators are live here yet"
            : "Creator discovery will land here soon";
    const emptySupport = surface === "dashboard"
        ? "Once creators are live, the dashboard will surface the ones you follow first and recommend the rest."
        : surface === "drops"
            ? "As creator drops come online, this rail will surface them here without mixing admins into discovery."
            : "This space will start routing fans into real creator pages as creator experiences roll out.";

    if (primaryCreators.length === 0) {
        return (
            <section className={cn(
                "glass-panel rounded-[2rem] border border-white/10 p-4 sm:p-5",
                compact ? "space-y-3" : "space-y-4",
            )}>
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Kreator Experiences
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
                        Kreator Experiences
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
                                trackEvent("creator_profile_viewed", {
                                    creator_id: creator.uid,
                                    creator_username: creator.username,
                                    discovery_surface: surface,
                                });
                            }}
                            className="group w-[6.5rem] shrink-0 text-center sm:w-[7.5rem]"
                        >
                            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-brand-purple/25 bg-black/40 shadow-[0_0_0_6px_rgba(255,255,255,0.02)] transition-transform group-hover:scale-[1.03]">
                                {creator.photoURL ? (
                                    <Image src={creator.photoURL} alt={creator.displayName} width={80} height={80} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-lg font-black text-white">{initialsFor(creator.displayName)}</span>
                                )}
                            </div>
                            <p className="mt-3 truncate text-sm font-bold text-white">{creator.displayName}</p>
                            <p className="truncate text-xs text-gray-500">{creator.username ? `@${creator.username}` : "creator"}</p>
                            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-gray-400">
                                {creator.following ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-purple/25 bg-brand-purple/10 px-2 py-0.5 font-bold text-brand-purple">
                                        <Users className="h-3 w-3" />
                                        Following
                                    </span>
                                ) : creator.favoriteCount ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-bold text-gray-300">
                                        <Heart className="h-3 w-3" />
                                        {creator.favoriteCount}
                                    </span>
                                ) : creator.activeDropCount ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-bold text-gray-300">
                                        {creator.activeDropCount} live
                                    </span>
                                ) : null}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
