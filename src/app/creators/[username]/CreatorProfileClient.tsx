"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    CalendarClock,
    CheckCircle2,
    Ghost,
    Heart,
    Loader2,
    Lock,
    MessageSquare,
    Sparkles,
    UserCheck,
    UserPlus,
    Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { DropGrid } from "@/components/DropGrid";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { authFetch } from "@/lib/authFetch";
import {
    CREATOR_BOOKING_MIN_MINUTES,
    CREATOR_BOOKING_RATES,
    CREATOR_MESSAGE_COSTS,
    CREATOR_SUBSCRIPTION_MIN_GD,
    type CreatorRequestCategoryConfig,
} from "@/lib/creator-experiences";
import { resolveCreatorPublicExperienceState } from "@/lib/creator-public-pages";
import { storage } from "@/lib/firebase-data";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { Drop, UserProfile } from "@/types/db";

export default function CreatorProfileClient() {
    const params = useParams();
    const { user: currentUser, userProfile: currentUserProfile, loading: authLoading } = useAuth();
    const { openAuthModal } = useUI();
    const username = params.username as string;

    const [creator, setCreator] = useState<UserProfile | null>(null);
    const [drops, setDrops] = useState<Drop[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [favorited, setFavorited] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [subscriptionActive, setSubscriptionActive] = useState(false);
    const [subscribeLoading, setSubscribeLoading] = useState(false);
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
                    creator?: UserProfile;
                    drops?: Drop[];
                };

                if (!response.ok || !result.success || !result.creator) {
                    setLoading(false);
                    return;
                }

                setCreator(result.creator);
                setDrops(result.drops || []);
            } catch (error) {
                console.error("Error fetching creator:", error);
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
        if (currentUserProfile && creator) {
            setFollowing(currentUserProfile.following?.includes(creator.uid) || false);
            setFavorited(currentUserProfile.favoriteCreators?.includes(creator.uid) || false);
            setNotificationsEnabled(currentUserProfile.creatorNotificationPreferences?.[creator.uid] === true);
        }
    }, [currentUserProfile, creator]);

    useEffect(() => {
        if (!currentUser || !creator) {
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
                    setFavorited(relationshipResult.relationship.favorited === true);
                    setNotificationsEnabled(relationshipResult.relationship.notificationsEnabled === true);
                }
                setSubscriptionActive(relationshipResult.subscription?.status === "active" || bookingResult.subscriptionActive === true);
                setMessages(Array.isArray(messageResult.messages) ? messageResult.messages : []);
                setBookings(Array.isArray(bookingResult.bookings) ? bookingResult.bookings : []);
                setBroadcasts(Array.isArray(broadcastResult.broadcasts) ? broadcastResult.broadcasts : []);
            } catch (error) {
                console.error("Failed to hydrate creator experience state", error);
            }
        }

        void hydrateCreatorRelationshipState();
        return () => {
            cancelled = true;
        };
    }, [creator, currentUser]);

    const creatorPublicState = useMemo(
        () => resolveCreatorPublicExperienceState(creator?.creatorSettings, drops.length),
        [creator?.creatorSettings, drops.length],
    );
    const creatorSettings = creatorPublicState.settings;
    const summaryCards = creatorPublicState.summaryCards.slice(0, 4);
    const summaryChips = summaryCards.filter((card) => card.key !== "drops").slice(0, 3);
    const requestCategories = creatorPublicState.enabledRequestCategories;

    const refreshCreatorBroadcasts = async (creatorId: string) => {
        try {
            const response = await authFetch(`/api/creator/broadcasts?creatorId=${encodeURIComponent(creatorId)}`);
            const result = await response.json() as { broadcasts?: Array<Record<string, unknown>> };
            setBroadcasts(Array.isArray(result.broadcasts) ? result.broadcasts : []);
        } catch (error) {
            console.error("Failed to refresh creator broadcasts", error);
        }
    };

    const handleFollow = async () => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to follow creators.");
            return;
        }
        if (currentUser.uid === creator.uid) {
            toast.error("You cannot follow yourself!");
            return;
        }

        setFollowLoading(true);

        try {
            const action = following ? "unfollow" : "follow";
            const response = await authFetch("/api/user/follow", {
                method: "POST",
                body: JSON.stringify({
                    targetUserId: creator.uid,
                    action,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error);
            }

            setFollowing(!following);
            if (!following) {
                await refreshCreatorBroadcasts(creator.uid);
            } else if (!subscriptionActive) {
                setBroadcasts([]);
            }
            toast.success(following ? `Unfollowed ${creator.displayName}` : `Following ${creator.displayName}!`);
        } catch (error: any) {
            console.error("Follow error:", error);
            toast.error(error.message || "Action failed.");
        } finally {
            setFollowLoading(false);
        }
    };

    const handleRelationshipAction = async (action: "favorite" | "unfavorite" | "enable_notifications" | "disable_notifications") => {
        if (!currentUser || !creator) {
            toast.error("Please sign in to manage creator relationships.");
            return;
        }

        try {
            const response = await authFetch("/api/creator/relationships", {
                method: "POST",
                body: JSON.stringify({
                    creatorId: creator.uid,
                    action,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Action failed.");
            }

            if (action === "favorite" || action === "unfavorite") {
                setFavorited(action === "favorite");
            }
            if (action === "enable_notifications" || action === "disable_notifications") {
                setNotificationsEnabled(action === "enable_notifications");
            }
        } catch (error: any) {
            console.error("Creator relationship action failed", error);
            toast.error(error.message || "Action failed.");
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
            console.error("Subscription action failed", error);
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
            console.error("Creator message failed", error);
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
            console.error("Creator request failed", error);
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
            console.error("Creator booking failed", error);
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

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),rgba(0,0,0,0)_32rem),linear-gradient(180deg,#09090b_0%,#020617_100%)] pb-20">
            <div className="group relative h-56 overflow-hidden bg-zinc-800 md:h-72">
                {creator.bannerUrl ? (
                    <Image src={creator.bannerUrl} alt="Banner" fill priority className="object-cover" />
                ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.34),transparent_45%),linear-gradient(135deg,rgba(39,39,42,0.92),rgba(9,9,11,0.98))]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
            </div>

            <div className="relative z-10 mx-auto -mt-24 w-full max-w-6xl px-4 sm:px-6">
                <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/65 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.6rem] border border-white/10 bg-zinc-900 shadow-2xl sm:h-36 sm:w-36">
                                {creator.photoURL ? (
                                    <Image src={creator.photoURL} alt={creator.displayName || ""} fill sizes="144px" priority className="object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-brand-purple">
                                        <Ghost className="h-10 w-10 sm:h-12 sm:w-12" />
                                    </div>
                                )}
                            </div>

                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">
                                    <Sparkles className="h-3.5 w-3.5 text-brand-purple" />
                                    Public creator profile
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{creator.displayName}</h1>
                                    {creator.isVerified ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-purple" /> : null}
                                </div>
                                <p className="mt-2 font-medium text-brand-purple">@{creator.username}</p>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base">
                                    {creator.bio || "This creator profile is live and ready for fans to follow, browse drops, and unlock approved creator experiences."}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200">
                                        {drops.length === 1 ? "1 live drop" : `${drops.length} live drops`}
                                    </span>
                                    {summaryChips.map((card) => (
                                        <span
                                            key={card.key}
                                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200"
                                        >
                                            {card.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:max-w-[22rem]">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                                <button
                                    type="button"
                                    onClick={handleFollow}
                                    disabled={followLoading}
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${following ? "border border-white/15 bg-white/10 text-white" : "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"}`}
                                >
                                    {followLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : following ? (
                                        <>
                                            <UserCheck className="h-5 w-5" /> Following
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-5 w-5" /> Follow creator
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!currentUser) {
                                            openAuthModal("signup");
                                            return;
                                        }
                                        void handleRelationshipAction(favorited ? "unfavorite" : "favorite");
                                    }}
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${favorited ? "border-brand-purple/30 bg-brand-purple/15 text-brand-purple" : "border-white/10 bg-white/5 text-white"}`}
                                >
                                    <Heart className="h-4 w-4" />
                                    {favorited ? "Saved to favorites" : "Save creator"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!currentUser) {
                                            openAuthModal("signup");
                                            return;
                                        }
                                        void handleRelationshipAction(notificationsEnabled ? "disable_notifications" : "enable_notifications");
                                    }}
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${notificationsEnabled ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-white/5 text-gray-200"}`}
                                >
                                    <Bell className="h-4 w-4" />
                                    {notificationsEnabled ? "Alerts on" : "Turn on alerts"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {summaryCards.length > 0 ? (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {summaryCards.map((card) => (
                                <article key={card.key} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{card.eyebrow}</p>
                                    <p className="mt-2 text-sm font-bold text-white">{card.label}</p>
                                    <p className="mt-2 text-sm leading-6 text-gray-400">{card.summary}</p>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-gray-400">
                            This creator profile is live, but fan-facing experiences have not been switched on yet.
                        </div>
                    )}
                </section>

                <div className="mt-6 space-y-6">
                    {(creatorSettings.subscriptionsEnabled || creatorSettings.messagingEnabled) ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {creatorSettings.subscriptionsEnabled ? (
                                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="inline-flex items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Monthly fan pass
                                            </div>
                                            <h2 className="mt-3 text-xl font-black text-white">All creator drops in one recurring lane.</h2>
                                            <p className="mt-2 text-sm leading-6 text-gray-400">
                                                Fans get creator-wide access, free chat, and reduced video pricing without bouncing between separate checkout flows.
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Monthly</p>
                                            <p className="mt-1 text-2xl font-black text-brand-purple">
                                                {creatorSettings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} GD
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!currentUser) {
                                                openAuthModal("signup");
                                                return;
                                            }
                                            void handleSubscription();
                                        }}
                                        disabled={subscribeLoading}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-5 py-3 text-sm font-bold text-white"
                                    >
                                        {subscribeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                                        {subscriptionActive ? "Cancel subscription" : "Subscribe now"}
                                    </button>
                                </section>
                            ) : null}

                            {creatorSettings.messagingEnabled ? (
                                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-5">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        Private creator chat
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-gray-400">
                                        Text costs {CREATOR_MESSAGE_COSTS.text} GD, images {CREATOR_MESSAGE_COSTS.image} GD, videos {CREATOR_MESSAGE_COSTS.video} GD. Subscribers chat free.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {(["text", "image", "video"] as const).map((kind) => (
                                            <button
                                                key={kind}
                                                type="button"
                                                onClick={() => setMessageKind(kind)}
                                                className={cn(
                                                    "rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]",
                                                    messageKind === kind
                                                        ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                                        : "border-white/10 bg-white/5 text-gray-400",
                                                )}
                                            >
                                                {kind}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={messageText}
                                        onChange={(event) => setMessageText(event.target.value)}
                                        rows={3}
                                        placeholder="Say what you want from the creator..."
                                        className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-gray-600"
                                    />
                                    <input
                                        type="file"
                                        accept={messageKind === "video" ? "video/*" : messageKind === "image" ? "image/*" : "*"}
                                        onChange={(event) => setMessageFile(event.target.files?.[0] || null)}
                                        className="mt-3 block w-full text-xs text-gray-400 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!currentUser) {
                                                openAuthModal("signup");
                                                return;
                                            }
                                            void handleSendMessage();
                                        }}
                                        disabled={sendingMessage}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white"
                                    >
                                        {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                                        Send message
                                    </button>
                                    {messages.length > 0 ? (
                                        <div className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                                            {messages.slice(-4).map((message) => (
                                                <div key={String(message.id)} className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                                                        {message.senderRole === "creator" ? "Creator" : "You"}
                                                    </p>
                                                    <p className="mt-1 text-sm text-white">
                                                        {typeof message.text === "string" && message.text.trim().length > 0 ? message.text : "Media message"}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}
                        </div>
                    ) : null}

                    {(creatorSettings.customRequestsEnabled && requestCategories.length > 0) || creatorSettings.bookingsEnabled ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {(creatorSettings.customRequestsEnabled && requestCategories.length > 0) ? (
                                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-5">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Custom requests
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-gray-400">
                                        Request private creator work for yourself only. Declined requests remain non-refundable by policy.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {requestCategories.slice(0, 3).map((category) => (
                                            <span
                                                key={category.id}
                                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200"
                                            >
                                                {category.label} · {category.priceGd} GD
                                            </span>
                                        ))}
                                    </div>
                                    <select
                                        value={requestCategoryId}
                                        onChange={(event) => setRequestCategoryId(event.target.value)}
                                        className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                                    >
                                        <option value="">Choose a request type</option>
                                        {requestCategories.map((category: CreatorRequestCategoryConfig) => (
                                            <option key={category.id} value={category.id}>
                                                {category.label} - {category.priceGd} GD
                                            </option>
                                        ))}
                                    </select>
                                    <textarea
                                        value={requestDetails}
                                        onChange={(event) => setRequestDetails(event.target.value)}
                                        rows={3}
                                        placeholder="Tell the creator exactly what you want made for you."
                                        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-gray-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!currentUser) {
                                                openAuthModal("signup");
                                                return;
                                            }
                                            void handleCreateRequest();
                                        }}
                                        disabled={creatingRequest}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white"
                                    >
                                        {creatingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        Create request
                                    </button>
                                </section>
                            ) : null}

                            {creatorSettings.bookingsEnabled ? (
                                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-5">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        Phone + video experiences
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-gray-400">
                                        Phone is {CREATOR_BOOKING_RATES.phone} GD/min. Video is {CREATOR_BOOKING_RATES.video} GD/min with 50% off for subscribers only.
                                    </p>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        <select
                                            value={bookingServiceType}
                                            onChange={(event) => setBookingServiceType(event.target.value as "phone" | "video")}
                                            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                                        >
                                            <option value="phone">Phone call</option>
                                            <option value="video">Video call</option>
                                        </select>
                                        <input
                                            type="number"
                                            min={CREATOR_BOOKING_MIN_MINUTES}
                                            step={5}
                                            value={bookingDurationMinutes}
                                            onChange={(event) => setBookingDurationMinutes(Number(event.target.value) || CREATOR_BOOKING_MIN_MINUTES)}
                                            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                                        />
                                    </div>
                                    <input
                                        type="datetime-local"
                                        value={bookingStartAt}
                                        onChange={(event) => setBookingStartAt(event.target.value)}
                                        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white [color-scheme:dark]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!currentUser) {
                                                openAuthModal("signup");
                                                return;
                                            }
                                            void handleCreateBooking();
                                        }}
                                        disabled={creatingBooking}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white"
                                    >
                                        {creatingBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                                        Book creator time
                                    </button>
                                    {bookings.length > 0 ? (
                                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Your latest booking</p>
                                            <p className="mt-2 text-sm text-white">
                                                {String(bookings[0].serviceType || "call")} - {typeof bookings[0].priceGd === "number" ? `${bookings[0].priceGd} GD` : ""}
                                            </p>
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}
                        </div>
                    ) : null}

                    {creatorSettings.broadcastsEnabled ? (
                        <section className="glass-panel rounded-[1.8rem] border border-white/10 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-300">
                                        <Bell className="h-3.5 w-3.5" />
                                        Creator updates
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-gray-400">
                                        Followers and subscribers can see quick creator updates here without leaving the drop flow.
                                    </p>
                                </div>
                            </div>
                            {broadcasts.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-gray-500">
                                    {currentUser ? "Follow or subscribe to unlock creator updates when they go live." : "Sign in and follow this creator to unlock creator updates."}
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {broadcasts.slice(0, 4).map((broadcast) => {
                                        const broadcastBody = typeof broadcast.body === "string"
                                            ? broadcast.body
                                            : typeof broadcast.message === "string"
                                                ? broadcast.message
                                                : "";

                                        return (
                                            <button
                                                key={String(broadcast.id)}
                                                type="button"
                                                onClick={() => {
                                                    trackEvent("creator_broadcast_opened", {
                                                        creator_id: creator.uid,
                                                        broadcast_id: String(broadcast.id),
                                                    });
                                                }}
                                                className="block w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-left"
                                            >
                                                <p className="text-sm font-semibold text-white">
                                                    {typeof broadcast.title === "string" && broadcast.title.trim().length > 0 ? broadcast.title : "Creator update"}
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-gray-400">{broadcastBody}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    ) : null}

                    <section className="rounded-[1.8rem] border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                            <div>
                                <h2 className="text-xl font-black text-white">Latest Drops</h2>
                                <p className="mt-1 text-sm text-gray-400">Browse this creator&apos;s currently approved public drops.</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                                {drops.length} items
                            </span>
                        </div>

                        {drops.length > 0 ? (
                            <div className="relative mt-5">
                                {!authLoading && !currentUser && (
                                    <div className="glass-panel absolute inset-0 z-50 m-2 flex items-center justify-center border border-white/5 !bg-black/60 pt-10 pb-20 backdrop-blur-md">
                                        <div className="animate-in fade-in zoom-in flex max-w-md flex-col items-center p-8 text-center duration-500">
                                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-brand-purple/30 bg-brand-purple/20 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                                                <Lock className="h-10 w-10 text-brand-purple" />
                                            </div>
                                            <h3 className="mb-4 text-3xl font-black tracking-tight text-white">Members only</h3>
                                            <p className="mb-8 font-medium leading-relaxed text-gray-400">
                                                Sign in to preview this creator&apos;s drop library, save them to your loop, and unlock private fan experiences.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => openAuthModal("signup")}
                                                className="w-full rounded-xl bg-brand-purple px-8 py-4 text-lg font-black text-white shadow-[0_0_40px_rgba(217,70,239,0.2)] transition-transform hover:scale-105 active:scale-95"
                                            >
                                                Sign Up / Sign In
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className={!authLoading && !currentUser ? "pointer-events-none select-none grayscale opacity-30 transition-all duration-700" : ""}>
                                    <DropGrid drops={drops} onSelectDrop={() => {}} />
                                </div>
                            </div>
                        ) : (
                            <div className="mt-5 rounded-3xl border border-dashed border-white/10 bg-white/5 py-16 text-center">
                                <p className="text-gray-300">This creator profile is live, but the first drop has not landed yet.</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

