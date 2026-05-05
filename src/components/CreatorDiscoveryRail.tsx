"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Loader2, Sparkles, Users } from "lucide-react";

import { useAuthIdentity, useAuthLoading } from "@/context/AuthContext";
import { useUIActions } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    buildCreatorDiscoveryNavigationParams,
    buildCreatorProfileLinkTelemetryPayload,
    buildCreatorPublicHref,
    explainCreatorProfileRouteMissing,
    type CreatorDiscoveryProfile,
} from "@/lib/creator-public-pages";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";
import { TitleMarquee } from "@/components/ui/TitleMarquee";
import { CompactNumber } from "@/components/ui/CompactNumber";
import { getImageLoadingPolicy, getImagePolicyDataAttributes } from "@/lib/image-loading-policy";
import {
    buildDiscoveryImpressionKey,
    createDiscoveryTrackingSessionId,
    DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD,
} from "@/lib/discovery-telemetry";

type CreatorCard = CreatorDiscoveryProfile & {
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
    surface: "dashboard" | "drops" | "experiences" | "home";
    title?: string;
    compact?: boolean;
    initialCreators?: CreatorDiscoveryProfile[];
}

const EMPTY_CREATORS: CreatorCard[] = [];
const HOME_RELATIONSHIP_IDLE_DELAY_MS = 650;

function initialsFor(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "C";
}

function CreatorDiscoveryRailSkeleton({ compact, surface }: { compact: boolean; surface: CreatorDiscoveryRailProps["surface"] }) {
    return (
        <section
            data-home-section={surface === "home" ? "creator-spotlight" : undefined}
            className={cn(
                "glass-panel rounded-[1.7rem] border border-white/10 p-2.5 [content-visibility:auto] [contain-intrinsic-size:260px] sm:rounded-[2rem] sm:p-4",
                compact ? "space-y-2" : "space-y-3",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                        Creator spotlight
                    </div>
                    <div className="mt-3 h-4 w-48 animate-pulse rounded bg-white/10" />
                </div>
            </div>

            <div className="mt-2 overflow-x-auto pb-1">
                <div className={cn("flex min-w-max gap-3", compact ? "pr-2" : "pr-4")}>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                "flex flex-col items-center justify-between rounded-[1.45rem] border border-white/5 bg-white/5 animate-pulse motion-reduce:animate-none",
                                compact
                                    ? "aspect-square w-[7.25rem] px-2.5 py-4"
                                    : "aspect-square w-[8.75rem] px-3 py-5",
                            )}
                        >
                            <div className={cn("rounded-full bg-white/10", compact ? "h-[3.65rem] w-[3.65rem]" : "h-[4.15rem] w-[4.15rem]")} />
                            <div className="mt-auto flex w-full flex-col items-center gap-2">
                                <div className="h-3 w-16 rounded bg-white/10" />
                                <div className="h-2 w-12 rounded bg-white/10" />
                            </div>
                            <div className="mt-2 h-7 w-16 rounded-full bg-white/10" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CreatorDiscoveryRailEmpty({
    compact,
    surface,
    title,
}: {
    compact: boolean;
    surface: CreatorDiscoveryRailProps["surface"];
    title?: string;
}) {
    const emptyTitle = surface === "dashboard"
        ? "Creator spotlight opens as creators go live"
        : surface === "drops"
            ? "No creator spotlights are active here yet"
            : surface === "home"
                ? "Creator spotlight"
                : "No creator experiences are ready here yet";
    const emptySupport = surface === "dashboard"
        ? "As approved creator profiles come online, the dashboard will pin the ones you follow first and then recommend the rest."
        : surface === "drops"
            ? "As creator drops go live, this rail will surface the creators behind them without mixing admin tooling into fan discovery."
            : surface === "home"
                ? "Discover top creators and their exclusive experiences right here."
                : "Creator experiences only appear here once the underlying profile and fan actions are ready.";

    return (
        <section
            data-home-section={surface === "home" ? "creator-spotlight" : undefined}
            className={cn(
                "glass-panel rounded-[1.7rem] border border-white/10 p-2.5 [content-visibility:auto] [contain-intrinsic-size:260px] sm:rounded-[2rem] sm:p-4",
                compact ? "space-y-2" : "space-y-3",
            )}
        >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                <Sparkles className="h-3.5 w-3.5" />
                {title || "Creator spotlight"}
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

function CreatorDiscoveryRailView({
    compact,
    creators,
    pendingCreatorId,
    surface,
    support,
    title,
    userId,
    trackingSessionId,
    onFollowToggle,
}: {
    compact: boolean;
    creators: CreatorCard[];
    pendingCreatorId: string | null;
    surface: CreatorDiscoveryRailProps["surface"];
    support: string | null;
    title?: string;
    userId?: string;
    trackingSessionId: string;
    onFollowToggle: (creator: CreatorCard) => void;
}) {
    const actor = useMemo(() => ({
        uid: userId ?? "",
        role: userId ? "user" : "guest",
    }), [userId]);
    const currentRoute = surface === "home" ? "/" : `/${surface}`;
    const imagePolicy = useMemo(() => getImageLoadingPolicy("home_creator_rail"), []);
    const creatorCardRefs = useRef(new Map<string, HTMLElement>());
    const trackedCreatorImpressionKeysRef = useRef(new Set<string>());
    const setCreatorCardRef = useCallback((creatorId: string, node: HTMLElement | null) => {
        if (node) {
            creatorCardRefs.current.set(creatorId, node);
            return;
        }

        creatorCardRefs.current.delete(creatorId);
    }, []);

    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const target = entry.target as HTMLElement;
                const creatorId = target.dataset.creatorId || "";
                const position = Number(target.dataset.creatorRailPosition || 0);
                const isVisibleEnough = entry.isIntersecting && entry.intersectionRatio >= DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD;
                if (!creatorId || !isVisibleEnough) {
                    return;
                }

                const impressionKey = buildDiscoveryImpressionKey({
                    sessionId: trackingSessionId,
                    entityId: creatorId,
                    surface: `creator_rail:${surface}`,
                });
                if (trackedCreatorImpressionKeysRef.current.has(impressionKey)) {
                    return;
                }

                trackedCreatorImpressionKeysRef.current.add(impressionKey);
                trackEvent("creator_rail_impression", {
                    source_component: "creator_discovery_rail",
                    surface,
                    route: currentRoute,
                    auth_state: userId ? "authenticated" : "guest",
                    creator_id: creatorId,
                    target_creator_id: creatorId,
                    entity_type: "creator",
                    entity_id: creatorId,
                    position,
                    impression_session_id: trackingSessionId,
                    viewport_threshold: DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD,
                });
            });
        }, { threshold: [DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD] });

        creators.forEach((creator) => {
            const node = creatorCardRefs.current.get(creator.uid);
            if (node) {
                observer.observe(node);
            }
        });

        return () => observer.disconnect();
    }, [creators, currentRoute, surface, trackingSessionId, userId]);

    return (
        <section
            data-home-section={surface === "home" ? "creator-spotlight" : undefined}
            className={cn(
                "glass-panel rounded-[1.7rem] border border-white/10 p-2.5 [content-visibility:auto] [contain-intrinsic-size:300px] sm:rounded-[2rem] sm:p-4",
                compact ? "space-y-2" : "space-y-3",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                        {title || "Creator spotlight"}
                    </div>
                    {support ? (
                        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-400">{support}</p>
                    ) : null}
                </div>
                <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-right sm:block">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Surface</p>
                    <p className="mt-1 text-sm font-semibold text-white">{surface}</p>
                </div>
            </div>

            <div className="overflow-x-auto pb-1">
                <div className={cn("flex min-w-max gap-3", compact ? "pr-2" : "pr-4")}>
                    {creators.map((creator, index) => {
                        const creatorRouteInput = {
                            uid: creator.uid,
                            creatorId: creator.uid,
                            username: creator.username,
                            creatorUsername: creator.username,
                        };
                        const creatorProfileHref = buildCreatorPublicHref(creatorRouteInput);
                        const missingProfileReason = creatorProfileHref ? "" : explainCreatorProfileRouteMissing(creatorRouteInput);
                        const profileContent = (
                            <>
                                <div
                                    className={cn(
                                        "rounded-full p-[2px] transition-transform group-hover:scale-105",
                                        creator.following ? "bg-white/10" : "bg-gradient-to-tr from-brand-purple to-pink-500",
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "flex items-center justify-center overflow-hidden rounded-full border-[3px] border-black bg-zinc-900",
                                            compact ? "h-[3.65rem] w-[3.65rem]" : "h-[4.15rem] w-[4.15rem]",
                                        )}
                                    >
                                        {creator.photoURL ? (
                                            <Image
                                                src={creator.photoURL}
                                                alt={creator.username || creator.displayName}
                                                width={72}
                                                height={72}
                                                loading={imagePolicy.loading}
                                                preload={imagePolicy.preload}
                                                fetchPriority={imagePolicy.fetchPriority}
                                                quality={imagePolicy.quality}
                                                sizes={imagePolicy.sizes}
                                                decoding="async"
                                                className="h-full w-full object-cover"
                                                {...getImagePolicyDataAttributes(imagePolicy)}
                                            />
                                        ) : (
                                            <span className="text-sm font-black text-white">
                                                {initialsFor(creator.username || creator.displayName)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex w-full flex-col items-center">
                                    <div className="flex max-w-full items-center justify-center gap-1">
                                        <TitleMarquee
                                            title={creator.username ? `@${creator.username.replace(/^@+/, "")}` : creator.displayName}
                                            delaySeed={creator.uid.charCodeAt(0) % 6}
                                            className={cn(
                                                "max-w-full font-bold tracking-tight text-white",
                                                compact ? "text-[11px]" : "text-[12px]",
                                            )}
                                        />
                                        {creator.isVerified ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-purple" /> : null}
                                    </div>
                                    <p className={cn("mt-1 text-gray-400", compact ? "text-[10px]" : "text-[11px]")}>
                                        <CompactNumber value={Math.max(creator.followerCount ?? 0, 0)} /> followers
                                    </p>
                                </div>
                            </>
                        );

                        return (
                            <article
                                key={creator.uid}
                                ref={(node) => setCreatorCardRef(creator.uid, node)}
                                data-creator-id={creator.uid}
                                data-creator-rail-position={index + 1}
                                className={cn(
                                    "group flex shrink-0 flex-col justify-between rounded-[1.45rem] border border-white/5 bg-white/[0.03] text-center",
                                    compact
                                        ? "aspect-square w-[7.25rem] gap-2 px-2.5 py-2.5"
                                        : "aspect-square w-[8.75rem] gap-2.5 px-3 py-3",
                                )}
                            >
                                {creatorProfileHref ? (
                                    <Link
                                        href={creatorProfileHref}
                                        onClick={() => {
                                            trackEvent("creator_profile_link_clicked", buildCreatorProfileLinkTelemetryPayload({
                                                actor,
                                                creator: creatorRouteInput,
                                                href: creatorProfileHref,
                                                routeSource: "creator_discovery",
                                                currentRoute,
                                            }));
                                            trackEvent("navigation_click", buildCreatorDiscoveryNavigationParams({
                                                creatorId: creator.uid,
                                                creatorUsername: creator.username,
                                                surface,
                                            }));
                                        }}
                                        className="flex w-full flex-col items-center gap-2"
                                        data-creator-profile-route-source="canonical-builder"
                                    >
                                        {profileContent}
                                    </Link>
                                ) : (
                                    <div
                                        className="flex w-full flex-col items-center gap-2"
                                        aria-disabled="true"
                                        title={missingProfileReason || "Creator profile unavailable"}
                                        data-creator-profile-missing-reason={missingProfileReason || "unknown"}
                                    >
                                        {profileContent}
                                    </div>
                                )}

                                {userId === creator.uid ? null : (
                                    <button
                                        type="button"
                                        onClick={() => onFollowToggle(creator)}
                                        disabled={pendingCreatorId === creator.uid}
                                        className={cn(
                                            "inline-flex items-center justify-center rounded-full border font-bold transition-colors",
                                            compact ? "min-h-7 px-3 py-1.5 text-[10px]" : "min-h-8 px-3.5 py-1.5 text-[11px]",
                                            creator.following
                                                ? "border-brand-purple/60 bg-black text-brand-purple"
                                                : "border-brand-purple/30 bg-brand-purple/15 text-white",
                                        )}
                                    >
                                        {pendingCreatorId === creator.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : creator.following ? "following" : "Follow"}
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export function CreatorDiscoveryRail({
    surface,
    title,
    compact = false,
    initialCreators = EMPTY_CREATORS,
}: CreatorDiscoveryRailProps) {
    const { user } = useAuthIdentity();
    const { loading: authLoading } = useAuthLoading();
    const { openAuthModal } = useUIActions();
    const [recommendedCreators, setRecommendedCreators] = useState<CreatorCard[]>(() => initialCreators);
    const [followedCreators, setFollowedCreators] = useState<CreatorCard[]>(EMPTY_CREATORS);
    const [railLoading, setRailLoading] = useState(initialCreators.length === 0);
    const [pendingCreatorId, setPendingCreatorId] = useState<string | null>(null);
    const [, startCreatorsTransition] = useTransition();
    const missingProfileRouteTelemetryKeyRef = useRef("");
    const authSettled = !authLoading;
    const [railTrackingSessionId] = useState(() => createDiscoveryTrackingSessionId("creator_rail"));
    const initialCreatorKey = useMemo(
        () => initialCreators.map((creator) => creator.uid).join("|"),
        [initialCreators],
    );

    useEffect(() => {
        startCreatorsTransition(() => {
            setRecommendedCreators(initialCreators);
            setRailLoading(initialCreators.length === 0);
        });
    }, [initialCreatorKey, initialCreators]);

    useEffect(() => {
        let cancelled = false;
        const abortController = new AbortController();
        let idleCleanup: (() => void) | null = null;
        const hasSeededCreators = initialCreators.length > 0;

        async function loadCreators() {
            if (!authSettled) {
                return;
            }

            try {
                let nextRecommended = initialCreators;
                let nextFollowed: CreatorCard[] = [];

                if (!user) {
                    if (hasSeededCreators) {
                        if (!cancelled) {
                            startCreatorsTransition(() => {
                                setFollowedCreators(EMPTY_CREATORS);
                                setRailLoading(false);
                            });
                        }
                        return;
                    }

                    setRailLoading(true);
                    const discoveryResponse = await fetch(`/api/creator/discovery?surface=${surface}`, {
                        cache: "no-store",
                        signal: abortController.signal,
                    });
                    const discoveryResult = await discoveryResponse.json() as { creators?: CreatorCard[] };
                    nextRecommended = discoveryResult.creators || [];
                } else {
                    if (!hasSeededCreators) {
                        setRailLoading(true);
                    }

                    const relationshipResponse = await authFetch("/api/creator/relationships");
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
                            bio: "",
                            following: entry.following === true,
                            favorited: entry.favorited === true,
                            notificationsEnabled: entry.notificationsEnabled === true,
                            followerCount: typeof entry.followerCount === "number" ? entry.followerCount : 0,
                            activeDropCount: 0,
                            notificationsEnabledCount: 0,
                            isVerified: entry.isVerified === true,
                        }));
                }

                if (!cancelled) {
                    startCreatorsTransition(() => {
                        setRecommendedCreators(nextRecommended);
                        setFollowedCreators(nextFollowed);
                        setRailLoading(false);
                    });
                }
            } catch (error) {
                if (abortController.signal.aborted) {
                    return;
                }

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
                    startCreatorsTransition(() => {
                        setRecommendedCreators(initialCreators);
                        setRailLoading(false);
                    });
                }
            }
        }

        if (surface === "home" && user) {
            if (typeof window !== "undefined" && "requestIdleCallback" in window) {
                const idleId = window.requestIdleCallback(() => void loadCreators(), { timeout: HOME_RELATIONSHIP_IDLE_DELAY_MS * 2 });
                idleCleanup = () => window.cancelIdleCallback(idleId);
            } else {
                const timeoutId = globalThis.setTimeout(() => void loadCreators(), HOME_RELATIONSHIP_IDLE_DELAY_MS);
                idleCleanup = () => globalThis.clearTimeout(timeoutId);
            }
        } else {
            void loadCreators();
        }

        return () => {
            cancelled = true;
            abortController.abort();
            idleCleanup?.();
        };
    }, [authSettled, initialCreatorKey, initialCreators, surface, user]);

    const primaryCreators = useMemo(() => {
        const combined = [...followedCreators];
        const followedIds = new Set(followedCreators.map((creator) => creator.uid));

        for (const creator of recommendedCreators) {
            if (!followedIds.has(creator.uid)) {
                combined.push(creator);
            }
        }

        return combined.filter((creator) => creator.uid !== user?.uid);
    }, [followedCreators, recommendedCreators, user?.uid]);

    useEffect(() => {
        const missingCreators = primaryCreators
            .map((creator) => {
                const routeInput = {
                    uid: creator.uid,
                    creatorId: creator.uid,
                    username: creator.username,
                    creatorUsername: creator.username,
                };
                const href = buildCreatorPublicHref(routeInput);
                const missingReason = href ? "" : explainCreatorProfileRouteMissing(routeInput);
                return missingReason ? { creator, routeInput, missingReason } : null;
            })
            .filter(Boolean) as Array<{
                creator: CreatorCard;
                routeInput: { uid: string; creatorId: string; username: string; creatorUsername: string };
                missingReason: string;
            }>;

        const telemetryKey = missingCreators.map((entry) => `${entry.creator.uid}:${entry.missingReason}`).join("|");
        if (!telemetryKey || missingProfileRouteTelemetryKeyRef.current === telemetryKey) {
            return;
        }

        missingProfileRouteTelemetryKeyRef.current = telemetryKey;
        const currentRoute = surface === "home" ? "/" : `/${surface}`;
        missingCreators.forEach((entry) => {
            trackEvent("creator_profile_link_missing", buildCreatorProfileLinkTelemetryPayload({
                actor: {
                    uid: user?.uid ?? "",
                    role: user ? "user" : "guest",
                },
                creator: entry.routeInput,
                href: null,
                routeSource: "creator_discovery",
                currentRoute,
                missingReason: entry.missingReason,
            }));
        });
    }, [primaryCreators, surface, user]);

    const handleFollowToggle = useCallback(async (creator: CreatorCard) => {
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

            setRecommendedCreators((current) => current.map((entry) => (
                entry.uid === creator.uid
                    ? { ...entry, following: nextFollowing, followerCount: nextFollowerCount }
                    : entry
            )));
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
    }, [openAuthModal, pendingCreatorId, surface, user]);

    if (railLoading) {
        return <CreatorDiscoveryRailSkeleton compact={compact} surface={surface} />;
    }

    if (primaryCreators.length === 0) {
        return <CreatorDiscoveryRailEmpty compact={compact} surface={surface} title={title} />;
    }

    const support = title || (followedCreators.length > 0
        ? null
        : "Follow creators to unlock drops and private requests.");

    return (
        <CreatorDiscoveryRailView
            compact={compact}
            creators={primaryCreators}
            pendingCreatorId={pendingCreatorId}
            surface={surface}
            support={support}
            title={title}
            userId={user?.uid}
            trackingSessionId={railTrackingSessionId}
            onFollowToggle={handleFollowToggle}
        />
    );
}
