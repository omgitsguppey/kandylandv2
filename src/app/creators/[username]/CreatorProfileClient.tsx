"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Ghost,
    Loader2,
    Lock,
} from "lucide-react";
import { toast } from "sonner";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { DropGrid } from "@/components/DropGrid";
import { CreatorExperiencesPanel } from "@/components/Creators/CreatorExperiencesPanel";
import { CreatorProfileHeader } from "@/components/Creators/CreatorProfileHeader";
import { CreatorUpdatesFeed } from "@/components/Creators/CreatorUpdatesFeed";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    CREATOR_BOOKING_MIN_MINUTES,
} from "@/lib/creator-experiences";
import { resolveCreatorPublicExperienceState } from "@/lib/creator-public-pages";
import { storage } from "@/lib/firebase-data";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { Drop, UserProfile } from "@/types/db";

type CreatorExperienceView = "subscriptions" | "messages" | "requests" | "bookings";

export default function CreatorProfileClient() {
    const params = useParams();
    const { user: currentUser, userProfile: currentUserProfile, setUserProfile, loading: authLoading } = useAuth();
    const { openAuthModal } = useUI();
    const username = params.username as string;

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
    const [messageText, setMessageText] = useState("");
    const [messageKind, setMessageKind] = useState<"text" | "image" | "video">("text");
    const [messageFile, setMessageFile] = useState<File | null>(null);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
    const [requestCategoryId, setRequestCategoryId] = useState("");
    const [requestDetails, setRequestDetails] = useState("");
    const [creatingRequest, setCreatingRequest] = useState(false);
    const [bookings, setBookings] = useState<Array<Record<string, unknown>>>([]);
    const [broadcasts, setBroadcasts] = useState<Array<Record<string, unknown>>>([]);
    const [bookingStartAt, setBookingStartAt] = useState("");
    const [bookingDurationMinutes, setBookingDurationMinutes] = useState(CREATOR_BOOKING_MIN_MINUTES);
    const [bookingServiceType, setBookingServiceType] = useState<"phone" | "video">("phone");
    const [creatingBooking, setCreatingBooking] = useState(false);
    const lastTrackedBroadcastKeyRef = useRef<string>("");

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
                };

                if (!response.ok || !result.success || !result.creator) {
                    setLoading(false);
                    return;
                }

                setCreator(result.creator);
                setDrops(result.drops || []);
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

        trackEvent("creator_profile_viewed", {
            creator_id: creator.uid,
            creator_username: creator.username || username,
            page_path: `/creators/${username}`,
        });
    }, [creator, username]);

    useEffect(() => {
        if (!currentUser || !creator) {
            setFollowing(false);
            setNotificationsEnabled(false);
            setMessages([]);
            setBookings([]);
            setBroadcasts([]);
            setSubscriptionActive(false);
            return;
        }

        let cancelled = false;
        const creatorId = creator.uid;

        async function hydrateCreatorRelationshipState() {
            try {
                const [relationshipResponse, messageResponse, bookingResponse, broadcastResponse] = await Promise.all([
                    authFetch(`/api/creator/relationships?creatorId=${encodeURIComponent(creatorId)}`),
                    authFetch(`/api/creator/messages?creatorId=${encodeURIComponent(creatorId)}`),
                    authFetch(`/api/creator/bookings?creatorId=${encodeURIComponent(creatorId)}`),
                    authFetch(`/api/creator/broadcasts?creatorId=${encodeURIComponent(creatorId)}`),
                ]);
                const relationshipResult = await relationshipResponse.json() as {
                    relationship?: Record<string, unknown> | null;
                    subscription?: Record<string, unknown> | null;
                };
                const messageResult = await messageResponse.json() as {
                    messages?: Array<Record<string, unknown>>;
                };
                const bookingResult = await bookingResponse.json() as {
                    bookings?: Array<Record<string, unknown>>;
                    subscriptionActive?: boolean;
                };
                const broadcastResult = await broadcastResponse.json() as {
                    broadcasts?: Array<Record<string, unknown>>;
                };

                if (cancelled) {
                    return;
                }

                if (relationshipResult.relationship) {
                    setFollowing(relationshipResult.relationship.following === true);
                    setNotificationsEnabled(relationshipResult.relationship.notificationsEnabled === true);
                }
                setSubscriptionActive(relationshipResult.subscription?.status === "active" || bookingResult.subscriptionActive === true);
                setMessages(Array.isArray(messageResult.messages) ? messageResult.messages : []);
                setBookings(Array.isArray(bookingResult.bookings) ? bookingResult.bookings : []);
                setBroadcasts(Array.isArray(broadcastResult.broadcasts) ? broadcastResult.broadcasts : []);
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
            page_path: `/creators/${username}`,
        });
    }, [activeTab, broadcasts, creator, username]);

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

        setFollowLoading(true);

        try {
            const action = following ? "unfollow" : "follow";
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
                throw new Error(result.error);
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
            } else if (!subscriptionActive) {
                setBroadcasts([]);
            }
            toast.success(nextFollowing ? `Following ${creator.displayName}!` : `Unfollowed ${creator.displayName}`);
        } catch (error: any) {
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
            toast.error(error.message || "Action failed.");
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
                throw new Error(typeof result.error === "string" ? result.error : "Action failed.");
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
            toast.error(error.message || "Action failed.");
        } finally {
            setRelationshipLoading(false);
        }
    };

    const handleSubscription = async () => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to subscribe.");
            return;
        }

        setSubscribeLoading(true);
        try {
            const response = await authFetch("/api/creator/subscriptions", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    action: subscriptionActive ? "cancel" : "subscribe",
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Subscription update failed.");
            }

            const nextActive = !subscriptionActive;
            setSubscriptionActive(nextActive);
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
                    action: subscriptionActive ? "cancel" : "subscribe",
                },
                consoleLabel: "[CreatorProfile] subscription action failed",
            });
            toast.error(error.message || "Subscription update failed.");
        } finally {
            setSubscribeLoading(false);
        }
    };

    const uploadMessageAttachment = async () => {
        if (!messageFile || !currentUser) {
            return null;
        }

        const storageRef = ref(storage, `creator/messages/${currentUser.uid}/${Date.now()}_${messageFile.name}`);
        await uploadBytes(storageRef, messageFile, {
            contentType: messageFile.type || "application/octet-stream",
        });
        const downloadUrl = await getDownloadURL(storageRef);
        return {
            assetUrl: downloadUrl,
            assetName: messageFile.name,
            assetMimeType: messageFile.type || "application/octet-stream",
        };
    };

    const handleSendMessage = async () => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to message creators.");
            return;
        }

        if (!messageText.trim() && !messageFile) {
            toast.error("Add a message or attachment first.");
            return;
        }

        setSendingMessage(true);
        try {
            const attachment = await uploadMessageAttachment();
            const response = await authFetch("/api/creator/messages", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    text: messageText.trim(),
                    messageKind: messageFile
                        ? (messageFile.type.startsWith("video/") ? "video" : "image")
                        : messageKind,
                    ...attachment,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Message failed.");
            }

            setMessageText("");
            setMessageFile(null);
            const refreshResponse = await authFetch(`/api/creator/messages?creatorId=${encodeURIComponent(creator.uid)}`);
            const refreshResult = await refreshResponse.json() as { messages?: Array<Record<string, unknown>> };
            setMessages(Array.isArray(refreshResult.messages) ? refreshResult.messages : []);
            toast.success("Message sent.");
        } catch (error: any) {
            reportClientIssue({
                channel: "ui",
                message: "Creator message send failed",
                error,
                detail: {
                    creatorId: creator.uid,
                    messageKind,
                    hasAttachment: Boolean(messageFile),
                },
                consoleLabel: "[CreatorProfile] send message failed",
            });
            toast.error(error.message || "Message failed.");
        } finally {
            setSendingMessage(false);
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
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Request failed.");
            }

            setRequestDetails("");
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
            toast.error(error.message || "Request failed.");
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
            toast.error("Choose a booking start time.");
            return;
        }

        setCreatingBooking(true);
        try {
            const response = await authFetch("/api/creator/bookings", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    serviceType: bookingServiceType,
                    startAt: new Date(bookingStartAt).getTime(),
                    durationMinutes: bookingDurationMinutes,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Booking failed.");
            }

            const refreshResponse = await authFetch(`/api/creator/bookings?creatorId=${encodeURIComponent(creator.uid)}`);
            const refreshResult = await refreshResponse.json() as { bookings?: Array<Record<string, unknown>> };
            setBookings(Array.isArray(refreshResult.bookings) ? refreshResult.bookings : []);
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
                },
                consoleLabel: "[CreatorProfile] booking failed",
            });
            toast.error(error.message || "Booking failed.");
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
            <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-brand-purple">
                    <Ghost className="h-10 w-10" />
                </div>
                <h1 className="mb-2 text-2xl font-bold text-white">Creator Not Found</h1>
                <p className="text-gray-400">The user @{username} does not exist or has been removed.</p>
            </div>
        );
    }

    const latestBooking = bookings[0] ?? null;
    const visibleBroadcasts = broadcasts.slice(0, 4);

    return (
        <div className="min-h-screen bg-black pb-20 pt-8 sm:pt-10">
            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
                <CreatorProfileHeader
                    canMessageCreator={canMessageCreator}
                    creator={creator}
                    dropsCount={drops.length}
                    followLoading={followLoading}
                    following={following}
                    hasGlobalAlerts={hasGlobalAlerts}
                    notificationsEnabled={notificationsEnabled}
                    onFollow={handleFollow}
                    onMessage={() => openExperienceView("messages")}
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
                            currentUser={currentUser}
                            latestBooking={latestBooking}
                            messageKind={messageKind}
                            messageText={messageText}
                            messages={messages}
                            onBookingDurationMinutesChange={setBookingDurationMinutes}
                            onBookingServiceTypeChange={setBookingServiceType}
                            onBookingStartAtChange={setBookingStartAt}
                            onCreateBooking={() => void handleCreateBooking()}
                            onCreateRequest={() => void handleCreateRequest()}
                            onMessageFileChange={setMessageFile}
                            onMessageKindChange={setMessageKind}
                            onMessageTextChange={setMessageText}
                            onOpenAuth={() => openAuthModal("signup")}
                            onSelectedExperienceChange={setSelectedExperience}
                            onSendMessage={() => void handleSendMessage()}
                            onStartSubscription={() => void handleSubscription()}
                            requestCategories={requestCategories}
                            requestCategoryId={requestCategoryId}
                            requestDetails={requestDetails}
                            selectedExperience={selectedExperience}
                            sendingMessage={sendingMessage}
                            settings={creatorSettings}
                            setRequestCategoryId={setRequestCategoryId}
                            setRequestDetails={setRequestDetails}
                            subscriptionActive={subscriptionActive}
                            subscribeLoading={subscribeLoading}
                        />
                    ) : null}

                    {activeTab === "drops" ? (
                        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                            <CreatorUpdatesFeed broadcasts={visibleBroadcasts} />

                            <section>
                                {drops.length > 0 ? (
                                    <div className="relative">
                                        {!authLoading && !currentUser ? (
                                            <div className="glass-panel absolute inset-0 z-50 m-2 flex items-center justify-center border border-white/5 !bg-black/70 px-4 py-8 backdrop-blur-md">
                                                <div className="flex max-w-sm flex-col items-center text-center">
                                                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/20">
                                                        <Lock className="h-7 w-7 text-brand-purple" />
                                                    </div>
                                                    <h3 className="mb-2 text-xl font-black tracking-tight text-white">Members only</h3>
                                                    <p className="mb-5 text-sm leading-6 text-gray-400">
                                                        Sign in to browse drops and unlock this creator&apos;s private fan experiences.
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
                                            className={
                                                !authLoading && !currentUser
                                                    ? "pointer-events-none select-none grayscale opacity-30 transition-all duration-500"
                                                    : ""
                                            }
                                        >
                                            <DropGrid drops={drops} onSelectDrop={() => {}} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 py-14 text-center">
                                        <p className="text-gray-300">This creator profile is live, but the first drop has not landed yet.</p>
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


