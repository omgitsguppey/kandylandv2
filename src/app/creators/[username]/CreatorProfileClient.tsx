"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Loader2,
    Lock,
} from "lucide-react";
import { toast } from "sonner";

import { DropGrid } from "@/components/DropGrid";
import { CreatorExperiencesPanel } from "@/components/Creators/CreatorExperiencesPanel";
import { CreatorProfileHeader } from "@/components/Creators/CreatorProfileHeader";
import { CreatorProfileTimelineFeed } from "@/components/Creators/CreatorProfileTimelineFeed";
import { NotFoundSurface } from "@/components/ui/NotFoundSurface";
import { UiContinuityNotice } from "@/components/ui/UiContinuityNotice";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { dispatchActivitySync } from "@/lib/activity-sync";
import {
    CREATOR_BOOKING_MIN_MINUTES,
} from "@/lib/creator-experiences";
import { getCreatorBookingProblemCopy, getCreatorRequestProblemCopy, getCreatorSubscriptionProblemCopy } from "@/lib/problem-state-copy";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import {
    buildCreatorRelationshipTelemetryPayload,
    classifyCreatorRelationshipState,
} from "@/lib/discovery/creator-relationship-contract";
import type { CreatorProfileTimelineItem } from "@/lib/creator-profile/timeline-contract";
import { resolveCreatorPublicExperienceState } from "@/lib/creator-public-pages";
import { trackEvent } from "@/lib/telemetry";
import { loadUiContinuityModules, readUiJson, type UiContinuityModuleState } from "@/lib/ui-continuity";
import { cn } from "@/lib/utils";
import { Drop, UserProfile } from "@/types/db";
import { CreatorPaidGdGuidanceCard, type CreatorPaidGdGuidanceReason } from "@/components/Creators/CreatorPaidGdGuidanceCard";

type CreatorExperienceView = "subscriptions" | "messages" | "requests" | "bookings";
type ExperienceModuleKey = "relationship" | "subscriptions" | "messages" | "bookings" | "broadcasts";
type MonetizationGuidanceState = {
    reason: CreatorPaidGdGuidanceReason;
    requiredPaidGd: number;
    currentPaidGd: number;
};

function readFirstName(value: string | null | undefined) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
        return "";
    }

    return normalized.split(/\s+/u)[0] || normalized;
}

const DEFAULT_MODULE_STATE: Record<ExperienceModuleKey, UiContinuityModuleState> = {
    relationship: { key: "relationship", label: "relationship", critical: false, status: "success", warning: null, fallbackActive: false, responseOk: true },
    subscriptions: { key: "subscriptions", label: "subscriptions", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    messages: { key: "messages", label: "messages", critical: false, status: "success", warning: null, fallbackActive: false, responseOk: true },
    bookings: { key: "bookings", label: "bookings", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    broadcasts: { key: "broadcasts", label: "broadcasts", critical: false, status: "success", warning: null, fallbackActive: false, responseOk: true },
};

function buildCreatorExperienceClientIdempotencyKey(action: string, creatorId: string) {
    let random = globalThis.crypto?.randomUUID?.() ?? "";
    if (!random && globalThis.crypto?.getRandomValues) {
        const buffer = new Uint32Array(2);
        globalThis.crypto.getRandomValues(buffer);
        random = Array.from(buffer).map((value) => value.toString(36)).join("-");
    }
    if (!random) {
        random = `${Date.now()}`;
    }
    return `creator-experience:${action}:${creatorId}:${random}`;
}

export default function CreatorProfileClient() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, userProfile: currentUserProfile, setUserProfile, loading: authLoading } = useAuth();
    const { openAuthModal, openPurchaseModal } = useUI();
    const username = params.username as string;
    const profileRoute = useMemo(() => buildCreatorPublicHref({ username }) ?? "/creators", [username]);

    const [activeTab, setActiveTab] = useState<"drops" | "experiences">("drops");
    const [creator, setCreator] = useState<(UserProfile & { followerCount?: number }) | null>(null);
    const [drops, setDrops] = useState<Drop[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [relationshipLoading, setRelationshipLoading] = useState(false);
    const [subscriptionActive, setSubscriptionActive] = useState(false);
    const [subscribeLoading, setSubscribeLoading] = useState(false);
    const [selectedExperience, setSelectedExperience] = useState<CreatorExperienceView | null>(null);
    const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
    const [requestCategoryId, setRequestCategoryId] = useState("");
    const [requestDetails, setRequestDetails] = useState("");
    const [creatingRequest, setCreatingRequest] = useState(false);
    const [bookings, setBookings] = useState<Array<Record<string, unknown>>>([]);
    const [broadcasts, setBroadcasts] = useState<Array<Record<string, unknown>>>([]);
    const [timelineItems, setTimelineItems] = useState<CreatorProfileTimelineItem[]>([]);
    const [bookingStartAt, setBookingStartAt] = useState("");
    const [bookingDurationMinutes, setBookingDurationMinutes] = useState(CREATOR_BOOKING_MIN_MINUTES);
    const [bookingServiceType, setBookingServiceType] = useState<"phone" | "video">("phone");
    const [creatingBooking, setCreatingBooking] = useState(false);
    const [moduleState, setModuleState] = useState<Record<ExperienceModuleKey, UiContinuityModuleState>>(DEFAULT_MODULE_STATE);
    const [monetizationGuidance, setMonetizationGuidance] = useState<MonetizationGuidanceState | null>(null);
    const creatorFirstName = useMemo(() => readFirstName(creator?.displayName), [creator?.displayName]);
    const lastTrackedBroadcastKeyRef = useRef<string>("");
    const profileOpenTelemetryKeyRef = useRef<string>("");
    const handleCreatorDropPreview = useCallback((drop: Drop) => {
        router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=creator_profile_drop_grid`);
    }, [router]);
    const handleCreatorTimelineDrop = useCallback((drop: Drop) => {
        router.push(`/drops/${encodeURIComponent(drop.id)}/preview?source_component=creator_profile_timeline`);
    }, [router]);

    useEffect(() => {
        if (!username) {
            return;
        }

        async function fetchData() {
            try {
                const response = await fetch(`/api/creators/${encodeURIComponent(username)}`, {
                    cache: "no-store",
                });
                const result = await response.json() as {
                    success?: boolean;
                    creator?: UserProfile & { followerCount?: number };
                    drops?: Drop[];
                    timeline?: {
                        items?: CreatorProfileTimelineItem[];
                        sourceTruth?: string;
                        state?: string;
                    };
                };

                if (!response.ok || !result.success || !result.creator) {
                    setLoading(false);
                    return;
                }

                setCreator(result.creator);
                setDrops(result.drops || []);
                setTimelineItems(Array.isArray(result.timeline?.items) ? result.timeline.items : []);
            } catch (error) {
                reportClientIssue({
                    channel: "network",
                    message: "Creator profile fetch failed",
                    error,
                    detail: {
                        username,
                    },
                    consoleLabel: "[CreatorProfile] fetch failed",
                });
                toast.error("Failed to load profile.");
            } finally {
                setLoading(false);
            }
        }

        void fetchData();
    }, [username]);

    useEffect(() => {
        if (!creator) {
            return;
        }
        const telemetryKey = `${currentUser?.uid ?? "guest"}:${creator.uid}:${profileRoute}`;
        if (profileOpenTelemetryKeyRef.current === telemetryKey) {
            return;
        }
        profileOpenTelemetryKeyRef.current = telemetryKey;

        trackEvent("creator_profile_viewed", {
            viewer_actor_type: currentUser ? "user" : "guest",
            viewer_actor_uid: currentUser?.uid ?? "",
            target_creator_id: creator.uid,
            target_creator_username: creator.username || username,
            creator_id: creator.uid,
            creator_username: creator.username || username,
            page_path: profileRoute,
            source_component: "creator_profile_page",
        });
        trackEvent("creator_profile_opened", buildCreatorRelationshipTelemetryPayload({
            eventName: "creator_profile_opened",
            viewerUserId: currentUser?.uid,
            creatorId: creator.uid,
            surface: "creator_profile",
            sourceComponent: "creator_profile_page",
            relationshipState: classifyCreatorRelationshipState({
                viewerUserId: currentUser?.uid,
                creatorId: creator.uid,
                following,
            }),
            recommendationSource: "creator_profile",
            route: profileRoute,
            action: "view",
        }));
    }, [creator, currentUser, following, profileRoute, username]);

    useEffect(() => {
        if (!currentUser || !creator) {
            setFollowing(false);
            setNotificationsEnabled(false);
            setMessages([]);
            setBookings([]);
            setBroadcasts([]);
            setSubscriptionActive(false);
            setModuleState(DEFAULT_MODULE_STATE);
            return;
        }

        let cancelled = false;
        const creatorId = creator.uid;

        async function hydrateCreatorRelationshipState() {
            try {
                const results = await loadUiContinuityModules({
                    surface: "creator_public_profile",
                    diagnosticsChannel: "ui",
                    modules: [
                        {
                            key: "relationship",
                            label: "creator relationship",
                            load: async () => readUiJson<{
                                relationship?: Record<string, unknown> | null;
                            }>(
                                await authFetch(`/api/creator/relationships?creatorId=${encodeURIComponent(creatorId)}`),
                                { moduleLabel: "creator relationship", url: "/api/creator/relationships" },
                            ),
                        },
                        {
                            key: "subscriptions",
                            label: "creator subscriptions",
                            critical: true,
                            load: async () => readUiJson<{
                                subscription?: Record<string, unknown> | null;
                            }>(
                                await authFetch(`/api/creator/subscriptions?creatorId=${encodeURIComponent(creatorId)}`),
                                { moduleLabel: "creator subscriptions", url: "/api/creator/subscriptions" },
                            ),
                        },
                        {
                            key: "messages",
                            label: "creator messages",
                            load: async () => readUiJson<{
                                messages?: Array<Record<string, unknown>>;
                            }>(
                                await authFetch(`/api/creator/messages?creatorId=${encodeURIComponent(creatorId)}`),
                                { moduleLabel: "creator messages", url: "/api/creator/messages" },
                            ),
                            fallbackValue: { messages: [] },
                        },
                        {
                            key: "bookings",
                            label: "creator bookings",
                            critical: true,
                            load: async () => readUiJson<{
                                bookings?: Array<Record<string, unknown>>;
                            }>(
                                await authFetch(`/api/creator/bookings?creatorId=${encodeURIComponent(creatorId)}`),
                                { moduleLabel: "creator bookings", url: "/api/creator/bookings" },
                            ),
                            fallbackValue: { bookings: [] },
                        },
                        {
                            key: "broadcasts",
                            label: "creator broadcasts",
                            load: async () => readUiJson<{
                                broadcasts?: Array<Record<string, unknown>>;
                            }>(
                                await authFetch(`/api/creator/broadcasts?creatorId=${encodeURIComponent(creatorId)}`),
                                { moduleLabel: "creator broadcasts", url: "/api/creator/broadcasts" },
                            ),
                            fallbackValue: { broadcasts: [] },
                        },
                    ],
                });

                if (cancelled) {
                    return;
                }

                const nextModuleState = { ...DEFAULT_MODULE_STATE };
                for (const result of results) {
                    nextModuleState[result.state.key as ExperienceModuleKey] = result.state;

                    if (result.state.key === "relationship" && result.value && typeof result.value === "object") {
                        const relationshipResult = result.value as { relationship?: Record<string, unknown> | null };
                        if (relationshipResult.relationship) {
                            setFollowing(relationshipResult.relationship.following === true);
                            setNotificationsEnabled(relationshipResult.relationship.notificationsEnabled === true);
                        }
                    }

                    if (result.state.key === "subscriptions" && result.value && typeof result.value === "object") {
                        const subscriptionResult = result.value as { subscription?: Record<string, unknown> | null };
                        setSubscriptionActive(subscriptionResult.subscription?.status === "active");
                    }

                    if (result.state.key === "messages" && result.value && typeof result.value === "object") {
                        const messageResult = result.value as { messages?: Array<Record<string, unknown>> };
                        setMessages(Array.isArray(messageResult.messages) ? messageResult.messages : []);
                    }

                    if (result.state.key === "bookings" && result.value && typeof result.value === "object") {
                        const bookingResult = result.value as { bookings?: Array<Record<string, unknown>> };
                        setBookings(Array.isArray(bookingResult.bookings) ? bookingResult.bookings : []);
                    }

                    if (result.state.key === "broadcasts" && result.value && typeof result.value === "object") {
                        const broadcastResult = result.value as { broadcasts?: Array<Record<string, unknown>> };
                        setBroadcasts(Array.isArray(broadcastResult.broadcasts) ? broadcastResult.broadcasts : []);
                    }
                }
                setModuleState(nextModuleState);
            } catch (error) {
                reportClientIssue({
                    channel: "runtime",
                    severity: "warn",
                    message: "Creator experience hydration failed",
                    error,
                    detail: {
                        creatorId,
                    },
                    consoleLabel: "[CreatorProfile] hydrate experience state failed",
                });
            }
        }

        void hydrateCreatorRelationshipState();
        return () => {
            cancelled = true;
        };
    }, [creator, currentUser]);

    useEffect(() => {
        if (!creator || activeTab !== "drops" || broadcasts.length === 0) {
            return;
        }

        const latestBroadcastId = typeof broadcasts[0]?.id === "string" ? broadcasts[0].id : "unknown";
        const broadcastKey = `${creator.uid}:${latestBroadcastId}:${broadcasts.length}`;
        if (lastTrackedBroadcastKeyRef.current === broadcastKey) {
            return;
        }

        lastTrackedBroadcastKeyRef.current = broadcastKey;
        trackEvent("creator_broadcast_opened", {
            creator_id: creator.uid,
            creator_username: creator.username || username,
            broadcast_count: broadcasts.length,
            latest_broadcast_id: latestBroadcastId,
            page_path: profileRoute,
            source_component: "creator_profile_page",
        });
    }, [activeTab, broadcasts, creator, profileRoute, username]);

    const creatorPublicState = useMemo(
        () => resolveCreatorPublicExperienceState(creator?.creatorSettings, drops.length),
        [creator?.creatorSettings, drops.length],
    );
    const creatorSettings = creatorPublicState.settings;
    const hasGlobalAlerts = Boolean(currentUserProfile?.notificationSettings?.newDropAlerts);
    const requestCategories = creatorPublicState.enabledRequestCategories;
    const availableExperienceViews = useMemo(() => {
        const views: CreatorExperienceView[] = [];
        if (creatorSettings.subscriptionsEnabled) {
            views.push("subscriptions");
        }
        if (creatorSettings.messagingEnabled) {
            views.push("messages");
        }
        if (creatorSettings.customRequestsEnabled && requestCategories.length > 0) {
            views.push("requests");
        }
        if (creatorSettings.bookingsEnabled) {
            views.push("bookings");
        }
        return views;
    }, [
        creatorSettings.bookingsEnabled,
        creatorSettings.customRequestsEnabled,
        creatorSettings.messagingEnabled,
        creatorSettings.subscriptionsEnabled,
        requestCategories.length,
    ]);
    const hasExperiences = availableExperienceViews.length > 0;
    const canMessageCreator = availableExperienceViews.includes("messages");
    const purchasedBalanceGd = currentUserProfile?.gumDropsPurchasedBalance ?? 0;
    const chatCostGd = creatorPublicState.userFacingMonetization.chat.subscriberFreeChatEnabled && subscriptionActive
        ? 0
        : creatorPublicState.userFacingMonetization.chat.textPriceGd;
    const creatorDisplayName = creatorFirstName || creator?.displayName || "this creator";
    const messageHint = currentUser
        ? !following
            ? `Follow ${creatorDisplayName} to open chat, then keep paid GumDrops ready.`
            : chatCostGd > 0 && purchasedBalanceGd < chatCostGd
                ? `You need ${chatCostGd - purchasedBalanceGd} more paid GD to message ${creatorDisplayName}.`
                : creatorSettings.chatFreeForSubscribers && subscriptionActive
                    ? `Fan Pass makes chat free with ${creatorDisplayName}.`
                    : `Paid GumDrops are required to message ${creatorDisplayName}.`
        : `Sign in, follow ${creatorDisplayName}, and keep paid GumDrops ready to chat.`;

    useEffect(() => {
        if (!hasExperiences) {
            setSelectedExperience(null);
            if (activeTab === "experiences") {
                setActiveTab("drops");
            }
            return;
        }

        if (!selectedExperience || !availableExperienceViews.includes(selectedExperience)) {
            setSelectedExperience(availableExperienceViews[0]);
        }
    }, [activeTab, availableExperienceViews, hasExperiences, selectedExperience]);

    const refreshCreatorBroadcasts = async (creatorId: string) => {
        try {
            const response = await authFetch(`/api/creator/broadcasts?creatorId=${encodeURIComponent(creatorId)}`);
            const result = await response.json() as { broadcasts?: Array<Record<string, unknown>> };
            setBroadcasts(Array.isArray(result.broadcasts) ? result.broadcasts : []);
        } catch (error) {
            reportClientIssue({
                channel: "notifications",
                severity: "warn",
                message: "Creator broadcasts refresh failed",
                error,
                detail: {
                    creatorId,
                },
                consoleLabel: "[CreatorProfile] refresh broadcasts failed",
            });
        }
    };

    const openExperienceView = (experience: CreatorExperienceView) => {
        if (!availableExperienceViews.includes(experience)) {
            return;
        }

        setActiveTab("experiences");
        setSelectedExperience(experience);
    };

    const openChatExperience = () => {
        if (!creator || !canMessageCreator) {
            return;
        }

        if (!currentUser) {
            openAuthModal("signup");
            return;
        }

        if (!following) {
            toast.error(`Follow ${creatorDisplayName} to start chatting.`);
            return;
        }

        if (chatCostGd > 0 && purchasedBalanceGd < chatCostGd) {
            setMonetizationGuidance({
                reason: "chat",
                requiredPaidGd: chatCostGd,
                currentPaidGd: purchasedBalanceGd,
            });
            return;
        }

        trackEvent("navigation_click", {
            destination: `/dashboard/chat?creator=${creator.uid}`,
            source: "creator_profile_message_cta",
            source_component: "creator_profile_page",
        });
        setMonetizationGuidance(null);
        router.push(`/dashboard/chat?creator=${encodeURIComponent(creator.uid)}`);
    };

    const handleFollow = async () => {
        if (!creator) {
            return;
        }

        if (!currentUser) {
            openAuthModal("signup");
            return;
        }
        if (currentUser.uid === creator.uid) {
            toast.error("You cannot follow yourself!");
            return;
        }

        const action = following ? "unfollow" : "follow";
        setFollowLoading(true);
        trackEvent(action === "follow" ? "creator_follow_attempted" : "creator_unfollow_attempted", buildCreatorRelationshipTelemetryPayload({
            eventName: action === "follow" ? "creator_follow_attempted" : "creator_unfollow_attempted",
            viewerUserId: currentUser.uid,
            creatorId: creator.uid,
            surface: "creator_profile",
            sourceComponent: "creator_profile_page",
            relationshipState: classifyCreatorRelationshipState({
                viewerUserId: currentUser.uid,
                creatorId: creator.uid,
                following,
            }),
            recommendationSource: "creator_profile",
            route: profileRoute,
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
                relationship?: {
                    following?: boolean;
                    followerCount?: number | null;
                };
                error?: string;
            };
            if (!response.ok) {
                throw result;
            }

            const nextFollowing = result.relationship?.following === true;
            setFollowing(nextFollowing);
            setCreator((currentCreator) => {
                if (!currentCreator) {
                    return currentCreator;
                }

                return {
                    ...currentCreator,
                    followerCount: typeof result.relationship?.followerCount === "number"
                        ? result.relationship.followerCount
                        : currentCreator.followerCount,
                };
            });
            setUserProfile((currentProfile) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                const existingFollowing = Array.isArray(currentProfile.following) ? currentProfile.following : [];
                const nextFollowingList = nextFollowing
                    ? Array.from(new Set([...existingFollowing, creator.uid]))
                    : existingFollowing.filter((entry) => entry !== creator.uid);

                return {
                    ...currentProfile,
                    following: nextFollowingList,
                };
            });

            if (nextFollowing) {
                await refreshCreatorBroadcasts(creator.uid);
                trackEvent("creator_followed", {
                    creator_id: creator.uid,
                    target_creator_id: creator.uid,
                    creator_username: creator.username,
                    creator_first_name: creatorFirstName,
                    route: profileRoute,
                    source_component: "creator_profile_page",
                });
                trackEvent("creator_follow_succeeded", buildCreatorRelationshipTelemetryPayload({
                    eventName: "creator_follow_succeeded",
                    viewerUserId: currentUser.uid,
                    creatorId: creator.uid,
                    surface: "creator_profile",
                    sourceComponent: "creator_profile_page",
                    relationshipState: "following",
                    recommendationSource: "creator_profile",
                    route: profileRoute,
                    followerCount: result.relationship?.followerCount ?? null,
                    action,
                }));
            } else if (!subscriptionActive) {
                setBroadcasts([]);
                trackEvent("creator_unfollowed", {
                    creator_id: creator.uid,
                    target_creator_id: creator.uid,
                    creator_username: creator.username,
                    creator_first_name: creatorFirstName,
                    route: profileRoute,
                    source_component: "creator_profile_page",
                });
                trackEvent("creator_unfollow_succeeded", buildCreatorRelationshipTelemetryPayload({
                    eventName: "creator_unfollow_succeeded",
                    viewerUserId: currentUser.uid,
                    creatorId: creator.uid,
                    surface: "creator_profile",
                    sourceComponent: "creator_profile_page",
                    relationshipState: "not_following",
                    recommendationSource: "creator_profile",
                    route: profileRoute,
                    followerCount: result.relationship?.followerCount ?? null,
                    action,
                }));
            }
            if (!nextFollowing && subscriptionActive) {
                trackEvent("creator_unfollow_succeeded", buildCreatorRelationshipTelemetryPayload({
                    eventName: "creator_unfollow_succeeded",
                    viewerUserId: currentUser.uid,
                    creatorId: creator.uid,
                    surface: "creator_profile",
                    sourceComponent: "creator_profile_page",
                    relationshipState: "not_following",
                    recommendationSource: "creator_profile",
                    route: profileRoute,
                    followerCount: result.relationship?.followerCount ?? null,
                    action,
                }));
            }
            toast.success(nextFollowing ? `Following ${creator.displayName}!` : `Unfollowed ${creator.displayName}`);
            dispatchActivitySync();
        } catch (error: any) {
            trackEvent("creator_follow_failed", buildCreatorRelationshipTelemetryPayload({
                eventName: "creator_follow_failed",
                viewerUserId: currentUser.uid,
                creatorId: creator.uid,
                surface: "creator_profile",
                sourceComponent: "creator_profile_page",
                relationshipState: classifyCreatorRelationshipState({
                    viewerUserId: currentUser.uid,
                    creatorId: creator.uid,
                    following,
                }),
                recommendationSource: "creator_profile",
                failureReason: "creator_profile_follow_failed",
                route: profileRoute,
                action,
            }));
            reportClientIssue({
                channel: "ui",
                message: "Creator follow action failed",
                error,
                detail: {
                    creatorId: creator.uid,
                    action: following ? "unfollow" : "follow",
                },
                consoleLabel: "[CreatorProfile] follow action failed",
            });
            toast.error("Could not update following right now.");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleRelationshipAction = async (action: "enable_notifications" | "disable_notifications") => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to manage creator relationships.");
            return;
        }

        if (relationshipLoading) {
            return;
        }

        setRelationshipLoading(true);

        try {
            const response = await authFetch("/api/creator/relationships", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    action,
                }),
            });
            const result = await response.json() as {
                relationship?: {
                    notificationsEnabled?: boolean;
                };
                error?: string;
            };
            if (!response.ok) {
                throw result;
            }

            const nextNotificationsEnabled = result.relationship?.notificationsEnabled === true;
            setNotificationsEnabled(nextNotificationsEnabled);
            setUserProfile((currentProfile) => {
                if (!currentProfile) {
                    return currentProfile;
                }

                return {
                    ...currentProfile,
                    creatorNotificationPreferences: {
                        ...(currentProfile.creatorNotificationPreferences || {}),
                        [creator.uid]: nextNotificationsEnabled,
                    },
                };
            });
            trackEvent(nextNotificationsEnabled ? "creator_notifications_enabled" : "creator_notifications_disabled", {
                creator_id: creator.uid,
                target_creator_id: creator.uid,
                creator_username: creator.username,
                route: profileRoute,
                source_component: "creator_profile_page",
            });
        } catch (error: any) {
            reportClientIssue({
                channel: action.includes("notification") ? "notifications" : "ui",
                message: "Creator relationship action failed",
                error,
                detail: {
                    creatorId: creator.uid,
                    action,
                },
                consoleLabel: "[CreatorProfile] relationship action failed",
            });
            toast.error("Could not update creator alerts right now.");
        } finally {
            setRelationshipLoading(false);
        }
    };

    const handleSubscription = async () => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to subscribe.");
            return;
        }

        const action = subscriptionActive ? "cancel" : "subscribe";
        setSubscribeLoading(true);
        try {
            const response = await authFetch("/api/creator/subscriptions", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    action,
                    idempotencyKey: buildCreatorExperienceClientIdempotencyKey(
                        subscriptionActive ? "fan-pass-cancel" : "fan-pass-start",
                        creator.uid,
                    ),
                }),
            });
            const result = await response.json() as {
                action?: "subscribe" | "cancel";
                code?: string;
                error?: string;
                message?: string;
                shortfallGd?: number;
                priceGd?: number;
                paidBalanceGd?: number;
            };
            if (!response.ok) {
                const message = getCreatorSubscriptionProblemCopy(result);
                if (result.code === "insufficient_paid_gumdrops") {
                    const preferredDrops = typeof result.shortfallGd === "number" && Number.isFinite(result.shortfallGd)
                        ? result.shortfallGd
                        : typeof result.priceGd === "number" && Number.isFinite(result.priceGd)
                            ? result.priceGd
                            : undefined;
                    setMonetizationGuidance({
                        reason: "fan_pass",
                        requiredPaidGd: Math.max(1, preferredDrops ?? 0),
                        currentPaidGd: typeof result.paidBalanceGd === "number" && Number.isFinite(result.paidBalanceGd)
                            ? result.paidBalanceGd
                            : purchasedBalanceGd,
                    });
                    return;
                }
                reportClientIssue({
                    channel: "payments",
                    message: "Creator subscription action failed",
                    error: new Error(message),
                    detail: {
                        code: result.code ?? "unknown",
                        creatorId: creator.uid,
                        action,
                        selectedExperience: "subscriptions",
                        route: "/api/creator/subscriptions",
                    },
                    consoleLabel: "[CreatorProfile] subscription action failed",
                });
                toast.error(message);
                return;
            }

            const nextActive = result.action === "subscribe";
            setSubscriptionActive(nextActive);
            setMonetizationGuidance(null);
            if (nextActive) {
                await refreshCreatorBroadcasts(creator.uid);
            } else if (!following) {
                setBroadcasts([]);
            }
            toast.success(nextActive ? "Subscription started." : "Subscription canceled.");
        } catch (error: any) {
            reportClientIssue({
                channel: "payments",
                message: "Creator subscription action failed",
                error,
                detail: {
                    creatorId: creator.uid,
                    action,
                    selectedExperience: "subscriptions",
                    route: "/api/creator/subscriptions",
                },
                consoleLabel: "[CreatorProfile] subscription action failed",
            });
            toast.error(getCreatorSubscriptionProblemCopy(error));
        } finally {
            setSubscribeLoading(false);
        }
    };

    const handleCreateRequest = async () => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to request custom content.");
            return;
        }

        if (!requestCategoryId || requestDetails.trim().length < 8) {
            toast.error("Choose a request type and add a few details.");
            return;
        }

        setCreatingRequest(true);
        try {
            const response = await authFetch("/api/creator/requests", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    categoryId: requestCategoryId,
                    details: requestDetails.trim(),
                    idempotencyKey: buildCreatorExperienceClientIdempotencyKey("custom-request", creator.uid),
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                const message = getCreatorRequestProblemCopy(result);
                if (result.code === "insufficient_paid_gumdrops") {
                    const preferredDrops = typeof result.shortfallGd === "number" && Number.isFinite(result.shortfallGd)
                        ? result.shortfallGd
                        : typeof result.priceGd === "number" && Number.isFinite(result.priceGd)
                            ? result.priceGd
                            : undefined;
                    setMonetizationGuidance({
                        reason: "request",
                        requiredPaidGd: Math.max(1, preferredDrops ?? 0),
                        currentPaidGd: purchasedBalanceGd,
                    });
                    return;
                }
                throw new Error(message);
            }

            setRequestDetails("");
            setMonetizationGuidance(null);
            toast.success("Custom request submitted.");
        } catch (error: any) {
            reportClientIssue({
                channel: "payments",
                message: "Creator custom request failed",
                error,
                detail: {
                    creatorId: creator.uid,
                    requestCategoryId,
                },
                consoleLabel: "[CreatorProfile] custom request failed",
            });
            toast.error(getCreatorRequestProblemCopy(error));
        } finally {
            setCreatingRequest(false);
        }
    };

    const handleCreateBooking = async () => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to book a creator experience.");
            return;
        }

        if (!bookingStartAt) {
            toast.error("Choose an available booking slot.");
            return;
        }

        const startAt = new Date(bookingStartAt).getTime();
        setCreatingBooking(true);
        try {
            const response = await authFetch("/api/creator/bookings", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    serviceType: bookingServiceType,
                    startAt,
                    durationMinutes: bookingDurationMinutes,
                    idempotencyKey: buildCreatorExperienceClientIdempotencyKey("live-time", creator.uid),
                }),
            });
            const result = await response.json() as {
                code?: string;
                error?: string;
                message?: string;
                shortfallGd?: number;
                priceGd?: number;
                requiredPaidGd?: number;
            };
            if (!response.ok) {
                const message = getCreatorBookingProblemCopy(result);
                if (result.code === "insufficient_paid_gumdrops") {
                    const preferredDrops = typeof result.shortfallGd === "number" && Number.isFinite(result.shortfallGd)
                        ? result.shortfallGd
                        : typeof result.requiredPaidGd === "number" && Number.isFinite(result.requiredPaidGd)
                            ? result.requiredPaidGd
                            : typeof result.priceGd === "number" && Number.isFinite(result.priceGd)
                                ? result.priceGd
                                : undefined;
                    setMonetizationGuidance({
                        reason: "booking",
                        requiredPaidGd: Math.max(1, preferredDrops ?? 0),
                        currentPaidGd: purchasedBalanceGd,
                    });
                    return;
                }
                reportClientIssue({
                    channel: "payments",
                    message: "Creator booking failed",
                    error: new Error(message),
                    detail: {
                        code: result.code ?? "unknown",
                        creatorId: creator.uid,
                        serviceType: bookingServiceType,
                        durationMinutes: bookingDurationMinutes,
                        startAt,
                        selectedExperience: "bookings",
                        route: "/api/creator/bookings",
                    },
                    consoleLabel: "[CreatorProfile] booking failed",
                });
                toast.error(message);
                return;
            }

            const refreshResponse = await authFetch(`/api/creator/bookings?creatorId=${encodeURIComponent(creator.uid)}`);
            const refreshResult = await refreshResponse.json() as { bookings?: Array<Record<string, unknown>> };
            setBookings(Array.isArray(refreshResult.bookings) ? refreshResult.bookings : []);
            setMonetizationGuidance(null);
            toast.success("Creator booking confirmed.");
        } catch (error: any) {
            reportClientIssue({
                channel: "payments",
                message: "Creator booking failed",
                error,
                detail: {
                    creatorId: creator.uid,
                    serviceType: bookingServiceType,
                    durationMinutes: bookingDurationMinutes,
                    startAt,
                    selectedExperience: "bookings",
                    route: "/api/creator/bookings",
                },
                consoleLabel: "[CreatorProfile] booking failed",
            });
            toast.error(getCreatorBookingProblemCopy(error));
        } finally {
            setCreatingBooking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            </div>
        );
    }

    if (!creator) {
        return (
            <NotFoundSurface
                eyebrow="Creator"
                title="Creator not available"
                detail={`@${username} is not available right now.`}
                className="min-h-[50vh]"
            />
        );
    }

    const latestBooking = bookings[0] ?? null;
    const profileTimelineVisible = creatorSettings.profileTimelineEnabled !== false;
    const profileDropsVisible = profileTimelineVisible && creatorSettings.showApprovedDropsOnTimeline !== false;
    const profileBroadcastsVisible = profileTimelineVisible && creatorSettings.showBroadcastsOnTimeline !== false;
    const visibleTimelineItems = profileTimelineVisible
        ? timelineItems.filter((item) => {
            if (item.type === "drop") {
                return profileDropsVisible;
            }
            if (item.type === "broadcast") {
                return profileBroadcastsVisible;
            }
            return false;
        })
        : [];
    const experienceWarnings = [
        moduleState.subscriptions.warning ? { key: "subscriptions", label: "Subscriptions", message: moduleState.subscriptions.warning } : null,
        moduleState.bookings.warning ? { key: "bookings", label: "Bookings", message: moduleState.bookings.warning } : null,
        moduleState.broadcasts.warning ? { key: "broadcasts", label: "Broadcasts", message: moduleState.broadcasts.warning } : null,
    ].filter((entry): entry is { key: string; label: string; message: string } => Boolean(entry));

    return (
        <div className="min-h-screen bg-black pb-6 pt-8 sm:pt-10" data-testid="creator-profile-shell">
            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
                <CreatorProfileHeader
                    canMessageCreator={canMessageCreator}
                    creator={creator}
                    dropsCount={drops.length}
                    followLoading={followLoading}
                    following={following}
                    hasGlobalAlerts={hasGlobalAlerts}
                    messageHint={messageHint}
                    notificationsEnabled={notificationsEnabled}
                    onFollow={handleFollow}
                    onMessage={openChatExperience}
                    onToggleAlerts={() => {
                        if (hasGlobalAlerts) {
                            return;
                        }
                        if (!currentUser) {
                            openAuthModal("signup");
                            return;
                        }
                        void handleRelationshipAction(
                            notificationsEnabled ? "disable_notifications" : "enable_notifications",
                        );
                    }}
                    relationshipLoading={relationshipLoading}
                    subscribeLoading={subscribeLoading}
                />

                {monetizationGuidance ? (
                    <div className="mt-4">
                        <CreatorPaidGdGuidanceCard
                            creatorName={creatorDisplayName}
                            currentPaidGd={monetizationGuidance.currentPaidGd}
                            requiredPaidGd={monetizationGuidance.requiredPaidGd}
                            reason={monetizationGuidance.reason}
                            onOpenWallet={() => openPurchaseModal(monetizationGuidance.requiredPaidGd)}
                            onOpenDrops={() => router.push("/drops")}
                            onClose={() => setMonetizationGuidance(null)}
                        />
                    </div>
                ) : null}

                <div className="mb-6 mt-5 flex items-center gap-6 border-b border-white/10 px-1 sm:px-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("drops")}
                        className={cn(
                            "pb-4 text-sm font-bold uppercase tracking-widest transition-colors",
                            activeTab === "drops"
                                ? "border-b-2 border-brand-purple text-white"
                                : "border-b-2 border-transparent text-gray-500 hover:text-white",
                        )}
                    >
                        Drops
                    </button>
                    {hasExperiences ? (
                        <button
                            type="button"
                            onClick={() => setActiveTab("experiences")}
                            className={cn(
                                "pb-4 text-sm font-bold uppercase tracking-widest transition-colors",
                                activeTab === "experiences"
                                    ? "border-b-2 border-brand-purple text-white"
                                    : "border-b-2 border-transparent text-gray-500 hover:text-white",
                            )}
                        >
                            Experiences
                        </button>
                    ) : null}
                </div>

                <div className="space-y-4">
                    {activeTab === "experiences" && hasExperiences ? (
                        <CreatorExperiencesPanel
                            bookingDurationMinutes={bookingDurationMinutes}
                            bookingServiceType={bookingServiceType}
                            bookingStartAt={bookingStartAt}
                            creatingBooking={creatingBooking}
                            creatingRequest={creatingRequest}
                            creatorId={creator.uid}
                            creatorFirstName={creatorFirstName}
                            creatorUsername={creator.username || username}
                            currentUser={currentUserProfile ?? currentUser}
                            existingBookings={bookings}
                            experienceWarnings={experienceWarnings}
                            latestBooking={latestBooking}
                            messages={messages}
                            onBookingDurationMinutesChange={setBookingDurationMinutes}
                            onBookingServiceTypeChange={setBookingServiceType}
                            onBookingStartAtChange={setBookingStartAt}
                            onCreateBooking={() => void handleCreateBooking()}
                            onCreateRequest={() => void handleCreateRequest()}
                            onOpenAuth={() => openAuthModal("signup")}
                            onOpenChat={openChatExperience}
                            onSelectedExperienceChange={setSelectedExperience}
                            onStartSubscription={() => void handleSubscription()}
                            requestCategories={requestCategories}
                            requestCategoryId={requestCategoryId}
                            requestDetails={requestDetails}
                            selectedExperience={selectedExperience}
                            settings={creatorSettings}
                            setRequestCategoryId={setRequestCategoryId}
                            setRequestDetails={setRequestDetails}
                            subscriptionActive={subscriptionActive}
                            subscriptionHydrated={!moduleState.subscriptions.warning}
                            subscribeLoading={subscribeLoading}
                        />
                    ) : null}

                    {activeTab === "drops" ? (
                        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                            {experienceWarnings.length > 0 ? (
                                <UiContinuityNotice
                                    title="Some creator features are loading slowly"
                                    body="Follow, chat, request, and booking actions may need a moment to refresh."
                                    tone="warning"
                                    data-testid="creator-profile-module-warning"
                                />
                            ) : null}
                            <CreatorProfileTimelineFeed
                                drops={drops}
                                items={visibleTimelineItems}
                                onOpenDrop={handleCreatorTimelineDrop}
                            />

                            <section
                                data-drop-visibility-scope="creator_profile"
                                data-creator-profile-timeline-enabled={String(profileTimelineVisible)}
                                data-creator-profile-approved-drops-visible={String(profileDropsVisible)}
                                data-creator-profile-broadcasts-visible={String(profileBroadcastsVisible)}
                            >
                                {profileDropsVisible && drops.length > 0 ? (
                                    <div className="relative">
                                        {!authLoading && !currentUser ? (
                                            <div className="glass-panel absolute inset-0 z-50 m-2 flex items-center justify-center border border-white/5 !bg-black/70 px-4 py-8 backdrop-blur-md">
                                                <div className="flex max-w-sm flex-col items-center text-center">
                                                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/20">
                                                        <Lock className="h-7 w-7 text-brand-purple" />
                                                    </div>
                                                    <h3 className="mb-2 text-xl font-black tracking-tight text-white">Sign in to browse drops</h3>
                                                    <p className="mb-5 text-sm leading-6 text-gray-400">
                                                        Sign in to browse drops, follow this creator, and unlock private fan experiences.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAuthModal("signup")}
                                                        className="w-full rounded-xl bg-brand-purple px-6 py-3 text-sm font-black text-white transition-opacity hover:opacity-90"
                                                    >
                                                        Sign Up / Sign In
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        <div
                                            data-drop-visibility-scope="own_creator_drops"
                                            className={
                                                !authLoading && !currentUser
                                                    ? "pointer-events-none select-none grayscale opacity-30 transition-all duration-500"
                                                    : ""
                                            }
                                        >
                                            <DropGrid drops={drops} onSelectDrop={handleCreatorDropPreview} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-8 text-center sm:py-10" data-mobile-residual-cleanup="score-impact">
                                        <p className="text-gray-300">{profileDropsVisible ? "This creator is live, but the first drop has not landed yet." : "Drops are hidden on this creator profile right now."}</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}


