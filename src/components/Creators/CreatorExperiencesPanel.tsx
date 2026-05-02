"use client";

import {
    CalendarClock,
    Loader2,
    MessageSquare,
    Sparkles,
    Wallet,
    ChevronLeft,
    ChevronRight,
    Star,
    Video,
    Phone
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { UiContinuityNotice } from "@/components/ui/UiContinuityNotice";
import { getClientAnalyticsIdentitySnapshot } from "@/lib/client-session";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import {
    CREATOR_BOOKING_MIN_MINUTES,
    CREATOR_BOOKING_RATES,
    CREATOR_MESSAGE_COSTS,
    CREATOR_SUBSCRIPTION_MIN_GD,
    type CreatorRequestCategoryConfig,
    type CreatorSettings,
} from "@/lib/creator-experiences";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/db";

type CreatorExperienceView = "subscriptions" | "messages" | "requests" | "bookings";
type CreatorExperienceLane = "fan_pass" | "chat" | "request" | "live_time";

type CreatorExperiencesPanelProps = {
    bookingDurationMinutes: number;
    bookingServiceType: "phone" | "video";
    bookingStartAt: string;
    creatingBooking: boolean;
    creatingRequest: boolean;
    creatorId: string;
    creatorUsername?: string;
    currentUser: unknown;
    experienceWarnings: Array<{ key: string; label: string; message: string }>;
    latestBooking: Record<string, unknown> | null;
    messages: Array<Record<string, unknown>>;
    onBookingDurationMinutesChange: (value: number) => void;
    onBookingServiceTypeChange: (value: "phone" | "video") => void;
    onBookingStartAtChange: (value: string) => void;
    onCreateBooking: () => void;
    onCreateRequest: () => void;
    onOpenAuth: () => void;
    onOpenChat: () => void;
    onSelectedExperienceChange: (value: CreatorExperienceView | null) => void;
    onStartSubscription: () => void;
    requestCategories: CreatorRequestCategoryConfig[];
    requestCategoryId: string;
    requestDetails: string;
    selectedExperience: CreatorExperienceView | null;
    settings: CreatorSettings;
    setRequestCategoryId: (value: string) => void;
    setRequestDetails: (value: string) => void;
    subscriptionActive: boolean;
    subscriptionHydrated: boolean;
    subscribeLoading: boolean;
};

const EXPERIENCE_VIEW_TO_LANE: Record<CreatorExperienceView, CreatorExperienceLane> = {
    subscriptions: "fan_pass",
    messages: "chat",
    requests: "request",
    bookings: "live_time",
};

function readUserId(value: unknown) {
    return value && typeof value === "object" && "uid" in value && typeof value.uid === "string"
        ? value.uid
        : "";
}

export function CreatorExperiencesPanel({
    bookingDurationMinutes,
    bookingServiceType,
    bookingStartAt,
    creatingBooking,
    creatingRequest,
    creatorId,
    creatorUsername,
    currentUser,
    experienceWarnings,
    latestBooking,
    messages,
    onBookingDurationMinutesChange,
    onBookingServiceTypeChange,
    onBookingStartAtChange,
    onCreateBooking,
    onCreateRequest,
    onOpenAuth,
    onOpenChat,
    onSelectedExperienceChange,
    onStartSubscription,
    requestCategories,
    requestCategoryId,
    requestDetails,
    selectedExperience,
    settings,
    setRequestCategoryId,
    setRequestDetails,
    subscriptionActive,
    subscriptionHydrated,
    subscribeLoading,
}: CreatorExperiencesPanelProps) {
    const router = useRouter();
    const user = currentUser as UserProfile | null;
    const balance = user?.gumDropsBalance || 0;
    const userId = readUserId(currentUser);
    const identity = useMemo(() => getClientAnalyticsIdentitySnapshot(), []);
    const route = buildCreatorPublicHref({
        creatorId,
        creatorUsername,
        username: creatorUsername,
    }) ?? "/creators";

    const recentMessages = messages.slice(-3).reverse();
    const hasRecentThread = messages.length > 0;
    
    // Fallback availabilities logic for bookings
    const availabilityWindows = settings.availabilityWindows || [];
    const hasAvailabilities = availabilityWindows.length > 0;
    const phoneRatePerMinute = settings.phoneRatePerMinuteGd || CREATOR_BOOKING_RATES.phone;
    const videoRatePerMinute = settings.videoRatePerMinuteGd || CREATOR_BOOKING_RATES.video;
    const subscriberVideoRatePerMinute = Math.round(videoRatePerMinute * (1 - (settings.videoSubscriberDiscountPercent || 0) / 100));

    const activeOpacity = "opacity-100 scale-100";
    const inactiveOpacity = "opacity-50 scale-95 hover:opacity-100 hover:scale-100";
    const previousLaneRef = useRef<CreatorExperienceView | null>(null);
    const laneOpenedCountRef = useRef(0);
    const [debugState, setDebugState] = useState({
        laneOpenedCount: 0,
        ctaClicked: false,
        insufficientBalanceTriggered: false,
    });

    const getBalanceState = useCallback((cost: number) => {
        if (!user) {
            return "unknown";
        }

        return balance >= cost ? "enough_gd" : "insufficient_gd";
    }, [balance, user]);

    const buildTelemetryPayload = useCallback((view: CreatorExperienceView, cost = 0) => ({
        actorType: userId ? "user" : "guest",
        actorUid: userId,
        anonymousVisitorId: identity.anonymousVisitorId ?? "",
        sessionId: identity.sessionId,
        creatorId,
        lane: EXPERIENCE_VIEW_TO_LANE[view],
        priceGd: cost,
        balanceState: getBalanceState(cost),
        route,
        source: "creator_experiences_panel",
    }), [creatorId, getBalanceState, identity.anonymousVisitorId, identity.sessionId, route, userId]);

    const trackCreatorExperienceEvent = useCallback((
        eventName: string,
        view: CreatorExperienceView,
        cost = 0,
        extra?: Record<string, string | number | boolean>,
    ) => {
        trackEvent(eventName, {
            ...buildTelemetryPayload(view, cost),
            ...(extra ?? {}),
        });
    }, [buildTelemetryPayload]);

    useEffect(() => {
        const previousLane = previousLaneRef.current;
        if (previousLane === selectedExperience) {
            return;
        }

        if (previousLane) {
            trackCreatorExperienceEvent("creator_experience_lane_closed", previousLane);
        }
        if (selectedExperience) {
            const nextOpenedCount = laneOpenedCountRef.current + 1;
            laneOpenedCountRef.current = nextOpenedCount;
            setDebugState((current) => ({
                ...current,
                laneOpenedCount: nextOpenedCount,
            }));
            trackCreatorExperienceEvent("creator_experience_lane_opened", selectedExperience, 0, {
                laneOpenedCount: nextOpenedCount,
            });
        }
        previousLaneRef.current = selectedExperience;
    }, [selectedExperience, trackCreatorExperienceEvent]);

    const selectExperience = (value: CreatorExperienceView | null) => {
        onSelectedExperienceChange(value);
    };

    const renderCTA = (view: CreatorExperienceView, cost: number, onClick: () => void, isLoading: boolean, icon: ReactNode, readyLabel: string, baseColor: string = "bg-brand-purple text-white") => {
        if (!user) {
            return (
                <button type="button" onClick={onOpenAuth} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">
                    {icon} Sign in to continue
                </button>
            );
        }

        if (balance < cost) {
            const deficit = cost - balance;
            return (
                <button
                    type="button"
                    onClick={() => {
                        setDebugState((current) => ({
                            ...current,
                            insufficientBalanceTriggered: true,
                        }));
                        trackCreatorExperienceEvent("creator_experience_insufficient_balance", view, cost, {
                            deficitGd: deficit,
                            insufficientBalanceTriggered: true,
                        });
                        router.push("/dashboard/wallet");
                    }}
                    className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-brand-purple/50 hover:bg-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/20">
                            <Wallet className="h-4 w-4 text-brand-purple" />
                        </div>
                        <div className="text-left">
                            <span className="block leading-none">Add Gum Drops</span>
                            <span className="mt-1 block text-[11px] text-zinc-400">Need {deficit} GD to continue</span>
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                </button>
            );
        }

        return (
            <button
                type="button"
                onClick={() => {
                    setDebugState((current) => ({
                        ...current,
                        ctaClicked: true,
                    }));
                    trackCreatorExperienceEvent("creator_experience_cta_clicked", view, cost, {
                        ctaLabel: readyLabel,
                        ctaClicked: true,
                    });
                    onClick();
                }}
                disabled={isLoading}
                className={cn("mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform active:scale-[0.98]", baseColor, isLoading && "opacity-70 pointer-events-none")}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
                {readyLabel}
            </button>
        );
    };

    return (
        <div
            className="space-y-4 animate-in fade-in zoom-in-95 duration-300"
            data-testid="creator-experiences-shell"
            data-lane-opened-count={debugState.laneOpenedCount}
            data-cta-clicked={debugState.ctaClicked}
            data-insufficient-balance-triggered={debugState.insufficientBalanceTriggered}
            data-selected-lane={selectedExperience ? EXPERIENCE_VIEW_TO_LANE[selectedExperience] : ""}
            data-settings-source="creator_settings"
            data-restrictions-source="creator_public_state"
        >
            {experienceWarnings.length > 0 ? (
                <div className="space-y-2">
                    {experienceWarnings.map((warning) => (
                        <UiContinuityNotice
                            key={warning.key}
                            title={`${warning.label} is degraded`}
                            body={warning.message}
                            tone="warning"
                            data-testid={`creator-experience-warning-${warning.key}`}
                        />
                    ))}
                </div>
            ) : null}

            {/* Premium Selector Grid */}
            <div className={cn("grid gap-3 transition-all duration-300 ease-out", selectedExperience ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
                {settings.subscriptionsEnabled ? (
                    <button
                        type="button"
                        onClick={() => selectedExperience === "subscriptions" ? selectExperience(null) : selectExperience("subscriptions")}
                        className={cn(
                            "flex min-h-16 flex-col items-center justify-center rounded-[1.1rem] border px-2 py-3 text-center transition-all duration-300",
                            selectedExperience === "subscriptions"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <Star className={cn("mb-2 transition-transform", selectedExperience === "subscriptions" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-zinc-400")} />
                        <p className="text-xs font-bold leading-tight">Fan Pass</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-zinc-500 font-medium">{settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} GD/mo</p>}
                    </button>
                ) : null}

                {settings.messagingEnabled ? (
                    <button
                        type="button"
                        onClick={() => selectedExperience === "messages" ? selectExperience(null) : selectExperience("messages")}
                        className={cn(
                            "flex min-h-16 flex-col items-center justify-center rounded-[1.1rem] border px-2 py-3 text-center transition-all duration-300",
                            selectedExperience === "messages"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <MessageSquare className={cn("mb-2 transition-transform", selectedExperience === "messages" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-zinc-400")} />
                        <p className="text-xs font-bold leading-tight">Chat</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-zinc-500 font-medium">Direct msg</p>}
                    </button>
                ) : null}

                {settings.customRequestsEnabled && requestCategories.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => selectedExperience === "requests" ? selectExperience(null) : selectExperience("requests")}
                        className={cn(
                            "flex min-h-16 flex-col items-center justify-center rounded-[1.1rem] border px-2 py-3 text-center transition-all duration-300",
                            selectedExperience === "requests"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <Sparkles className={cn("mb-2 transition-transform", selectedExperience === "requests" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-zinc-400")} />
                        <p className="text-xs font-bold leading-tight">Requests</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-zinc-500 font-medium">From {requestCategories[0]?.priceGd ?? 0} GD</p>}
                    </button>
                ) : null}

                {settings.bookingsEnabled ? (
                    <button
                        type="button"
                        onClick={() => selectedExperience === "bookings" ? selectExperience(null) : selectExperience("bookings")}
                        className={cn(
                            "flex min-h-16 flex-col items-center justify-center rounded-[1.1rem] border px-2 py-3 text-center transition-all duration-300",
                            selectedExperience === "bookings"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <CalendarClock className={cn("mb-2 transition-transform", selectedExperience === "bookings" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-zinc-400")} />
                        <p className="text-xs font-bold leading-tight">Call</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-zinc-500 font-medium">Live time</p>}
                    </button>
                ) : null}
            </div>

            {/* Subscriptions Module */}
            {selectedExperience === "subscriptions" && settings.subscriptionsEnabled && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.4rem] border border-brand-purple/20 bg-gradient-to-b from-brand-purple/10 to-transparent p-4 sm:p-5">
                    <button aria-label="Go back" onClick={() => selectExperience(null)} className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="ml-10 flex flex-col gap-1.5">
                        <h2 className="text-xl font-black text-white">Fan Pass</h2>
                        <p className="text-sm font-medium text-brand-purple-light/80">Stay closer when new access opens.</p>
                    </div>

                    <details className="mt-4 rounded-2xl border border-white/5 bg-black/30 px-4 py-3">
                        <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-widest text-zinc-500">Pass includes</summary>
                        <ul className="mt-3 space-y-2.5">
                            <li className="flex items-center gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <Star className="h-3 w-3 text-brand-purple" />
                                </div>
                                <span className="text-sm text-zinc-200">Priority access to creator moments</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <MessageSquare className="h-3 w-3 text-brand-purple" />
                                </div>
                                <span className="text-sm text-zinc-200">Subscriber chat perks when enabled</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <CalendarClock className="h-3 w-3 text-brand-purple" />
                                </div>
                                <span className="text-sm text-zinc-200">Preferred booking offers when available</span>
                            </li>
                        </ul>
                    </details>

                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-5 pr-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Monthly Auto-Renew</span>
                            <span className="mt-0.5 text-2xl font-black text-white">{settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} <span className="text-sm font-medium text-zinc-400">GD</span></span>
                        </div>
                        {subscriptionActive && (
                            <span className="rounded-full border border-brand-purple/30 bg-brand-purple/20 px-3 py-1 text-xs font-bold text-brand-purple-light">Active</span>
                        )}
                    </div>

                    {!subscriptionHydrated ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                            <Loader2 className="h-3 w-3 animate-spin" /> Checking pass status...
                        </div>
                    ) : (
                        renderCTA(
                            "subscriptions",
                            subscriptionActive ? 0 : (settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD), 
                            () => subscriptionActive ? onStartSubscription() : onStartSubscription(),
                            subscribeLoading,
                            <Star className="h-4 w-4" />,
                            subscriptionActive ? "Cancel Fan Pass" : "Start Fan Pass",
                            subscriptionActive ? "bg-white/10 border border-white/10 text-white hover:bg-white/15" : "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"
                        )
                    )}
                </section>
            )}

            {/* Messaging Module */}
            {selectedExperience === "messages" && settings.messagingEnabled && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/40 p-4 sm:p-5">
                    <button aria-label="Go back" onClick={() => selectExperience(null)} className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="mb-4 ml-10 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white">Private Chat</h2>
                            {settings.chatFreeForSubscribers && subscriptionActive && (
                                <span className="rounded-full bg-brand-purple/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-purple-light">Free for you</span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-zinc-400">Send a private message without getting lost in comments.</p>
                    </div>

                    <details className="mb-4 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                        <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-widest text-zinc-500">Message menu</summary>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-black/35 px-2 py-2 text-center">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Text</span>
                                <span className="mt-1 block text-sm font-bold text-white">{CREATOR_MESSAGE_COSTS.text} GD</span>
                            </div>
                            <div className="rounded-xl bg-black/35 px-2 py-2 text-center">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Image</span>
                                <span className="mt-1 block text-sm font-bold text-white">{CREATOR_MESSAGE_COSTS.image} GD</span>
                            </div>
                            <div className="rounded-xl bg-black/35 px-2 py-2 text-center">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Video</span>
                                <span className="mt-1 block text-sm font-bold text-white">{CREATOR_MESSAGE_COSTS.video} GD</span>
                            </div>
                        </div>
                    </details>

                    {hasRecentThread ? (
                        <div className="mb-4 rounded-xl border border-brand-purple/10 bg-brand-purple/5 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <MessageSquare className="h-4 w-4 text-brand-purple" />
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-medium text-white truncate">Active conversation</p>
                                    <p className="text-[11px] text-zinc-400 truncate">View your latest messages...</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setDebugState((current) => ({
                                        ...current,
                                        ctaClicked: true,
                                    }));
                                    trackCreatorExperienceEvent("creator_experience_cta_clicked", "messages", 0, {
                                        ctaLabel: "Open private chat",
                                        ctaClicked: true,
                                    });
                                    onOpenChat();
                                }}
                                className="ml-2 flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
                            >
                                Open private chat <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="mb-4 rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                            <p className="text-xs text-zinc-400">No private thread yet. Start with a simple message.</p>
                        </div>
                    )}

                    {!hasRecentThread && renderCTA(
                        "messages",
                        (settings.chatFreeForSubscribers && subscriptionActive) ? 0 : CREATOR_MESSAGE_COSTS.text,
                        onOpenChat,
                        false,
                        <MessageSquare className="h-4 w-4" />,
                        "Open private chat"
                    )}
                </section>
            )}

            {/* Custom Requests Module */}
            {selectedExperience === "requests" && settings.customRequestsEnabled && requestCategories.length > 0 && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/40 p-4 sm:p-5">
                    <button aria-label="Go back" onClick={() => selectExperience(null)} className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="mb-4 ml-10 flex flex-col gap-1.5">
                        <h2 className="text-xl font-black text-white">Custom Request</h2>
                        <p className="text-sm font-medium text-zinc-400">Ask for something specific, then let the creator decide what fits.</p>
                    </div>

                    <div className="mb-4 flex flex-col gap-2">
                        <span className="pl-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Request type</span>
                        <div className="flex flex-wrap gap-2">
                            {requestCategories.map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => {
                                        setRequestCategoryId(category.id);
                                        trackCreatorExperienceEvent("creator_experience_request_category_selected", "requests", category.priceGd, {
                                            requestCategoryId: category.id,
                                        });
                                    }}
                                    className={cn(
                                        "flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 transition-all",
                                        requestCategoryId === category.id
                                            ? "border-brand-purple bg-brand-purple/20 text-white shadow-inner shadow-brand-purple/20 scale-[1.02]"
                                            : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
                                    )}
                                >
                                    <span className="text-sm font-semibold">{category.label}</span>
                                    <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-[0.4rem]", requestCategoryId === category.id ? "bg-brand-purple/40 text-brand-purple-light" : "bg-black/40 text-zinc-400")}>
                                        {category.priceGd} GD
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {requestCategoryId && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <textarea
                                value={requestDetails}
                                onChange={(event) => setRequestDetails(event.target.value)}
                                rows={3}
                                placeholder="Describe what you want, the vibe, and any details the creator should know."
                                className="w-full resize-none rounded-[1.2rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-brand-purple/50 focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                            />
                            {renderCTA(
                                "requests",
                                requestCategories.find(c => c.id === requestCategoryId)?.priceGd || 0,
                                onCreateRequest,
                                creatingRequest,
                                <Sparkles className="h-4 w-4" />,
                                "Send custom request"
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Bookings Module */}
            {selectedExperience === "bookings" && settings.bookingsEnabled && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/40 p-4 sm:p-5">
                    <button aria-label="Go back" onClick={() => selectExperience(null)} className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="mb-4 ml-10 flex flex-col gap-1.5">
                        <h2 className="text-xl font-black text-white">Live Time</h2>
                        <p className="text-sm font-medium text-zinc-400">Reserve real time before the window closes.</p>
                        {(settings.videoSubscriberDiscountPercent || 0) > 0 && subscriptionActive && bookingServiceType === "video" && (
                            <span className="mt-1 inline-block w-fit rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-purple-light">
                                Subscriber {settings.videoSubscriberDiscountPercent}% Off Applied
                            </span>
                        )}
                        {(settings.videoSubscriberDiscountPercent || 0) > 0 && !subscriptionActive && bookingServiceType === "video" && (
                            <span className="inline-block w-fit mt-1 rounded-full bg-brand-purple/10 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-brand-purple-light border border-brand-purple/20">
                                Fan Pass gets {settings.videoSubscriberDiscountPercent}% Off
                            </span>
                        )}
                    </div>

                    {/* Booking Mode Selector */}
                    <div className="mb-5 flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onBookingServiceTypeChange("phone");
                                trackCreatorExperienceEvent("creator_experience_booking_type_selected", "bookings", bookingDurationMinutes * phoneRatePerMinute, {
                                    bookingType: "phone",
                                });
                            }}
                            className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[1.2rem] border py-3 text-sm font-bold transition-all", bookingServiceType === "phone" ? "border-brand-purple bg-brand-purple/15 text-white shadow-inner shadow-brand-purple/20" : "border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10")}
                        >
                            <Phone className="h-4 w-4" /> Phone
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onBookingServiceTypeChange("video");
                                trackCreatorExperienceEvent("creator_experience_booking_type_selected", "bookings", bookingDurationMinutes * (subscriptionActive ? subscriberVideoRatePerMinute : videoRatePerMinute), {
                                    bookingType: "video",
                                });
                            }}
                            className={cn("flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[1.2rem] border py-3 text-sm font-bold transition-all", bookingServiceType === "video" ? "border-brand-purple bg-brand-purple/15 text-white shadow-inner shadow-brand-purple/20" : "border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10")}
                        >
                            <Video className="h-4 w-4" /> Video
                        </button>
                    </div>

                    <div className="mb-4 rounded-[1.2rem] border border-white/5 bg-black/30 p-3.5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Duration & Rate</span>
                            <div className="flex items-center gap-2 bg-white/5 rounded-md">
                                <select 
                                    className="bg-transparent text-white font-bold text-sm px-2 py-1 focus:outline-none focus:ring-0"
                                    value={bookingDurationMinutes}
                                    onChange={(e) => onBookingDurationMinutesChange(Number(e.target.value) || CREATOR_BOOKING_MIN_MINUTES)}
                                >
                                    {[15, 30, 45, 60, 90, 120].map(min => (
                                        <option key={min} value={min} className="bg-black text-white">{min} mins</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                {bookingServiceType === "phone" ? (
                                    <span className="text-xs text-brand-purple-light/70 font-semibold">@ {CREATOR_BOOKING_RATES.phone} GD/min</span>
                                ) : (
                                    <span className="text-xs text-brand-purple-light/70 font-semibold">
                                        @ {subscriptionActive ? subscriberVideoRatePerMinute : videoRatePerMinute} GD/min
                                    </span>
                                )}
                            </div>
                            <div className="text-2xl font-black text-white">
                                {bookingServiceType === "phone" 
                                    ? bookingDurationMinutes * phoneRatePerMinute
                                    : bookingDurationMinutes * (subscriptionActive ? subscriberVideoRatePerMinute : videoRatePerMinute)} <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold ml-0.5">GD ttl</span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Date Picker & Availability Fallback */}
                    <div className="relative mb-4 flex gap-3">
                        <div className="flex-1">
                            <label className="mb-1.5 block pl-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Pick a time</label>
                            <input
                                type="datetime-local"
                                value={bookingStartAt}
                                onChange={(event) => onBookingStartAtChange(event.target.value)}
                                className="w-full appearance-none rounded-[1.2rem] border border-white/10 bg-white/5 pl-4 pr-3 py-3 text-sm font-semibold text-white focus:border-brand-purple/50 focus:outline-none focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                    {hasAvailabilities && !latestBooking && (
                        <details className="mb-4 rounded-[1.2rem] border border-white/5 bg-white/5 px-3 py-2.5">
                            <summary className="cursor-pointer list-none text-center text-xs font-medium text-zinc-300">Creator&apos;s usual hours</summary>
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {availabilityWindows.slice(0, 3).map(w => (
                                    <span key={w.id} className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">
                                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][w.dayOfWeek]} {w.startHour}:{w.startMinute.toString().padStart(2, '0')}-{w.endHour}:{w.endMinute.toString().padStart(2, '0')}
                                    </span>
                                ))}
                            </div>
                        </details>
                    )}

                    {renderCTA(
                        "bookings",
                        bookingServiceType === "phone" 
                            ? bookingDurationMinutes * phoneRatePerMinute
                            : bookingDurationMinutes * (subscriptionActive ? subscriberVideoRatePerMinute : videoRatePerMinute),
                        onCreateBooking,
                        creatingBooking,
                        <CalendarClock className="h-4 w-4" />,
                        "Book live time"
                    )}
                </section>
            )}
        </div>
    );
}
