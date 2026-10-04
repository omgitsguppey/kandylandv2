"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useAuthIdentity, useAuthLoading } from "@/context/AuthContext";
import { useUIActions } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { createAutoHealingObserver } from "@/lib/self-healing";
import { USER_RUNTIME_COLLECTION } from "@/lib/platform-config";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase-data";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    buildCreatorDiscoveryNavigationParams,
    buildCreatorProfileLinkTelemetryPayload,
    buildCreatorPublicHref,
    explainCreatorProfileRouteMissing,
    type CreatorDiscoveryProfile,
} from "@/lib/creator-public-pages";
import { trackEvent } from "@/lib/telemetry";
import { dispatchActivitySync } from "@/lib/activity-sync";
import { KandyCreatorDiscoveryCard, KandyCreatorDiscoveryEmpty, KandyCreatorDiscoverySkeleton, KandyCreatorDiscoveryView } from "@/components/creative-tim/kandydrops/creator-discovery/CreatorDiscoveryPresentation";
import {
    buildDiscoveryImpressionKey,
    createDiscoveryTrackingSessionId,
    DISCOVERY_IMPRESSION_VISIBILITY_THRESHOLD,
} from "@/lib/discovery-telemetry";
import {
    buildCreatorRelationshipTelemetryPayload,
    classifyCreatorRelationshipState,
} from "@/lib/discovery/creator-relationship-contract";

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
const HOME_CREATOR_SPOTLIGHT_TITLE = "CREATOR SPOTLIGHT";
const HOME_CREATOR_SPOTLIGHT_SUPPORT = "Follow creators to unwrap drops and exclusive experiences.";

function CreatorDiscoveryRailSkeleton({ compact, surface }: { compact: boolean; surface: CreatorDiscoveryRailProps["surface"] }) {
    return <KandyCreatorDiscoverySkeleton compact={compact} surface={surface} />;
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
    return <KandyCreatorDiscoveryEmpty compact={compact} surface={surface} title={title} />;
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
                const creator = creators.find((entry) => entry.uid === creatorId);
                const relationshipState = classifyCreatorRelationshipState({
                    viewerUserId: userId,
                    creatorId,
                    following: creator?.following === true,
                });
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
                trackEvent("creator_card_viewed", buildCreatorRelationshipTelemetryPayload({
                    eventName: "creator_card_viewed",
                    viewerUserId: userId,
                    creatorId,
                    surface,
                    sourceComponent: "creator_discovery_rail",
                    relationshipState,
                    recommendationSource: creator?.following ? "relationship_route" : "deterministic_recommendation",
                    route: currentRoute,
                    position,
                    impressionSessionId: trackingSessionId,
                }));
                if (!creator?.following) {
                    trackEvent("creator_recommendation_viewed", buildCreatorRelationshipTelemetryPayload({
                        eventName: "creator_recommendation_viewed",
                        viewerUserId: userId,
                        creatorId,
                        surface,
                        sourceComponent: "creator_discovery_rail",
                        relationshipState,
                        recommendationSource: "deterministic_recommendation",
                        route: currentRoute,
                        position,
                        impressionSessionId: trackingSessionId,
                    }));
                }
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
        <KandyCreatorDiscoveryView
            compact={compact}
            surface={surface}
            support={support}
            title={title}
        >
            {creators.map((creator, index) => {
                const creatorRouteInput = {
                    uid: creator.uid,
                    creatorId: creator.uid,
                    username: creator.username,
                    creatorUsername: creator.username,
                };
                const creatorProfileHref = buildCreatorPublicHref(creatorRouteInput);
                const missingProfileReason = creatorProfileHref ? "" : explainCreatorProfileRouteMissing(creatorRouteInput);

                return (
                    <KandyCreatorDiscoveryCard
                        key={creator.uid}
                        creator={creator}
                        compact={compact}
                        surface={surface}
                        position={index + 1}
                        cardRef={(node) => setCreatorCardRef(creator.uid, node)}
                        profileHref={creatorProfileHref}
                        missingProfileReason={missingProfileReason}
                        isPending={pendingCreatorId === creator.uid}
                        isSelf={userId === creator.uid}
                        onFollow={() => onFollowToggle(creator)}
                        onProfileClick={() => {
                            const relationshipPayload = buildCreatorRelationshipTelemetryPayload({
                                eventName: "creator_card_clicked",
                                viewerUserId: userId,
                                creatorId: creator.uid,
                                surface,
                                sourceComponent: "creator_discovery_rail",
                                relationshipState: classifyCreatorRelationshipState({
                                    viewerUserId: userId,
                                    creatorId: creator.uid,
                                    following: creator.following === true,
                                }),
                                recommendationSource: creator.following ? "relationship_route" : "deterministic_recommendation",
                                route: currentRoute,
                                position: index + 1,
                            });
                            trackEvent("creator_profile_link_clicked", buildCreatorProfileLinkTelemetryPayload({
                                actor,
                                creator: creatorRouteInput,
                                href: creatorProfileHref,
                                routeSource: "creator_discovery",
                                currentRoute,
                            }));
                            trackEvent("creator_card_clicked", relationshipPayload);
                            if (!creator.following) {
                                trackEvent("creator_recommendation_clicked", {
                                    ...relationshipPayload,
                                    event_name: "creator_recommendation_clicked",
                                    recommendation_source: "deterministic_recommendation",
                                });
                            }
                            trackEvent("navigation_click", buildCreatorDiscoveryNavigationParams({
                                creatorId: creator.uid,
                                creatorUsername: creator.username,
                                surface,
                            }));
                        }}
                    />
                );
            })}
        </KandyCreatorDiscoveryView>
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
    const railSurfaceViewedTelemetryKeyRef = useRef("");
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

        let unsubscribeRuntime: (() => void) | undefined;
        let sawRuntimeSnapshot = false;

        if (user) {
            const observerControl = createAutoHealingObserver(() => {
                return onSnapshot(
                    doc(db, USER_RUNTIME_COLLECTION, user.uid),
                    (snapshot) => {
                        if (cancelled) return;
                        if (!sawRuntimeSnapshot) {
                            sawRuntimeSnapshot = true;
                            return;
                        }
                        const data = snapshot.data() as { profileVersion?: number; version?: number } | undefined;
                        if (typeof data?.profileVersion === "number" || typeof data?.version === "number") {
                            void loadCreators();
                        }
                    },
                    (error: unknown) => {
                        if (cancelled) return;
                        observerControl.triggerReconnect(error);
                    }
                );
            }, (error: unknown) => {
                if (cancelled) return;
                reportClientIssue({
                    channel: "ui",
                    severity: "warn",
                    message: "Creator discovery runtime subscription failed",
                    error,
                    detail: { surface, userId: user.uid },
                    consoleLabel: "[CreatorDiscoveryRail] runtime subscription failed",
                });
            });
            unsubscribeRuntime = () => observerControl.cleanup();
        }

        return () => {
            cancelled = true;
            abortController.abort();
            idleCleanup?.();
            unsubscribeRuntime?.();
        };
    }, [authSettled, initialCreatorKey, initialCreators, surface, user]);

    const primaryCreators = useMemo(() => {
        if (surface === "home") {
            const followedById = new Map(followedCreators.map((creator) => [creator.uid, creator]));
            const homeCreators = recommendedCreators.map((creator) => ({
                ...creator,
                ...followedById.get(creator.uid),
            }));
            const homeCreatorIds = new Set(homeCreators.map((creator) => creator.uid));

            for (const followedCreator of followedCreators) {
                if (!homeCreatorIds.has(followedCreator.uid)) {
                    homeCreators.push(followedCreator);
                }
            }

            return homeCreators.filter((creator) => creator.uid !== user?.uid);
        }

        const combined = [...followedCreators];
        const followedIds = new Set(followedCreators.map((creator) => creator.uid));

        for (const creator of recommendedCreators) {
            if (!followedIds.has(creator.uid)) {
                combined.push(creator);
            }
        }

        return combined.filter((creator) => creator.uid !== user?.uid);
    }, [followedCreators, recommendedCreators, surface, user?.uid]);

    useEffect(() => {
        if (railLoading) {
            return;
        }

        const telemetryKey = `${surface}:${user?.uid ?? "guest"}:${primaryCreators.length}`;
        if (railSurfaceViewedTelemetryKeyRef.current === telemetryKey) {
            return;
        }
        railSurfaceViewedTelemetryKeyRef.current = telemetryKey;
        trackEvent("creator_discovery_surface_viewed", buildCreatorRelationshipTelemetryPayload({
            eventName: "creator_discovery_surface_viewed",
            viewerUserId: user?.uid,
            surface,
            sourceComponent: "creator_discovery_rail",
            relationshipState: user ? "unknown" : "not_following",
            recommendationSource: initialCreators.length > 0 ? "seeded_surface" : "relationship_route",
            route: surface === "home" ? "/" : `/${surface}`,
            listCount: primaryCreators.length,
            recommendationCount: recommendedCreators.length,
            action: "view",
        }));
    }, [initialCreators.length, primaryCreators.length, railLoading, recommendedCreators.length, surface, user]);

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
        trackEvent(action === "follow" ? "creator_follow_attempted" : "creator_unfollow_attempted", buildCreatorRelationshipTelemetryPayload({
            eventName: action === "follow" ? "creator_follow_attempted" : "creator_unfollow_attempted",
            viewerUserId: user.uid,
            creatorId: creator.uid,
            surface,
            sourceComponent: "creator_discovery_rail",
            relationshipState: classifyCreatorRelationshipState({
                viewerUserId: user.uid,
                creatorId: creator.uid,
                following: creator.following === true,
            }),
            recommendationSource: creator.following ? "relationship_route" : "deterministic_recommendation",
            action,
        }));

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
            trackEvent(action === "follow" ? "creator_follow_succeeded" : "creator_unfollow_succeeded", buildCreatorRelationshipTelemetryPayload({
                eventName: action === "follow" ? "creator_follow_succeeded" : "creator_unfollow_succeeded",
                viewerUserId: user.uid,
                creatorId: creator.uid,
                surface,
                sourceComponent: "creator_discovery_rail",
                relationshipState: nextFollowing ? "following" : "not_following",
                recommendationSource: creator.following ? "relationship_route" : "deterministic_recommendation",
                followerCount: nextFollowerCount ?? null,
                action,
            }));
            dispatchActivitySync();
        } catch (error) {
            trackEvent("creator_follow_failed", buildCreatorRelationshipTelemetryPayload({
                eventName: "creator_follow_failed",
                viewerUserId: user.uid,
                creatorId: creator.uid,
                surface,
                sourceComponent: "creator_discovery_rail",
                relationshipState: classifyCreatorRelationshipState({
                    viewerUserId: user.uid,
                    creatorId: creator.uid,
                    following: creator.following === true,
                }),
                recommendationSource: creator.following ? "relationship_route" : "deterministic_recommendation",
                failureReason: "creator_relationship_update_failed",
                action,
            }));
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
        : HOME_CREATOR_SPOTLIGHT_SUPPORT);

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
