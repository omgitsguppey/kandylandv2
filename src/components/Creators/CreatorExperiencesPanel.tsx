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

import { UiContinuityNotice } from "@/components/ui/UiContinuityNotice";
import {
    CREATOR_BOOKING_MIN_MINUTES,
    CREATOR_BOOKING_RATES,
    CREATOR_MESSAGE_COSTS,
    CREATOR_SUBSCRIPTION_MIN_GD,
    type CreatorRequestCategoryConfig,
    type CreatorSettings,
} from "@/lib/creator-experiences";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/db";

type CreatorExperienceView = "subscriptions" | "messages" | "requests" | "bookings";

type CreatorExperiencesPanelProps = {
    bookingDurationMinutes: number;
    bookingServiceType: "phone" | "video";
    bookingStartAt: string;
    creatingBooking: boolean;
    creatingRequest: boolean;
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

export function CreatorExperiencesPanel({
    bookingDurationMinutes,
    bookingServiceType,
    bookingStartAt,
    creatingBooking,
    creatingRequest,
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

    const recentMessages = messages.slice(-3).reverse();
    const hasRecentThread = messages.length > 0;
    
    // Fallback availabilities logic for bookings
    const availabilityWindows = settings.availabilityWindows || [];
    const hasAvailabilities = availabilityWindows.length > 0;

    const activeOpacity = "opacity-100 scale-100";
    const inactiveOpacity = "opacity-50 scale-95 hover:opacity-100 hover:scale-100";

    const renderCTA = (cost: number, onClick: () => void, isLoading: boolean, icon: React.ReactNode, readyLabel: string, baseColor: string = "bg-brand-purple text-white") => {
        if (!user) {
            return (
                <button type="button" onClick={onOpenAuth} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors px-5 py-3.5 text-sm font-bold text-white">
                    {icon} Sign in to continue
                </button>
            );
        }

        if (balance < cost) {
            const deficit = cost - balance;
            return (
                <button type="button" onClick={() => router.push("/dashboard/wallet")} className="mt-4 flex w-full items-center justify-between rounded-xl bg-white/5 border border-white/10 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10 hover:border-brand-purple/50">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple/20">
                            <Wallet className="h-4 w-4 text-brand-purple" />
                        </div>
                        <div className="text-left">
                            <span className="block leading-none">Get more GumDrops</span>
                            <span className="mt-1 block text-[11px] text-gray-400">Need {deficit} GD to proceed</span>
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                </button>
            );
        }

        return (
            <button
                type="button"
                onClick={onClick}
                disabled={isLoading}
                className={cn("mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition-transform active:scale-[0.98]", baseColor, isLoading && "opacity-70 pointer-events-none")}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
                {readyLabel}
            </button>
        );
    };

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300" data-testid="creator-experiences-shell">
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
                        onClick={() => selectedExperience === "subscriptions" ? onSelectedExperienceChange(null) : onSelectedExperienceChange("subscriptions")}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-[1.4rem] border px-2 py-4 text-center transition-all duration-300",
                            selectedExperience === "subscriptions"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-gray-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <Star className={cn("mb-2 transition-transform", selectedExperience === "subscriptions" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-gray-400")} />
                        <p className="text-xs font-bold leading-tight">Fan Pass</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-gray-500 font-medium">{settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} GD/mo</p>}
                    </button>
                ) : null}

                {settings.messagingEnabled ? (
                    <button
                        type="button"
                        onClick={() => selectedExperience === "messages" ? onSelectedExperienceChange(null) : onSelectedExperienceChange("messages")}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-[1.4rem] border px-2 py-4 text-center transition-all duration-300",
                            selectedExperience === "messages"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-gray-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <MessageSquare className={cn("mb-2 transition-transform", selectedExperience === "messages" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-gray-400")} />
                        <p className="text-xs font-bold leading-tight">Chat</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-gray-500 font-medium">Direct msg</p>}
                    </button>
                ) : null}

                {settings.customRequestsEnabled && requestCategories.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => selectedExperience === "requests" ? onSelectedExperienceChange(null) : onSelectedExperienceChange("requests")}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-[1.4rem] border px-2 py-4 text-center transition-all duration-300",
                            selectedExperience === "requests"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-gray-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <Sparkles className={cn("mb-2 transition-transform", selectedExperience === "requests" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-gray-400")} />
                        <p className="text-xs font-bold leading-tight">Requests</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-gray-500 font-medium">From {requestCategories[0]?.priceGd ?? 0} GD</p>}
                    </button>
                ) : null}

                {settings.bookingsEnabled ? (
                    <button
                        type="button"
                        onClick={() => selectedExperience === "bookings" ? onSelectedExperienceChange(null) : onSelectedExperienceChange("bookings")}
                        className={cn(
                            "flex flex-col items-center justify-center rounded-[1.4rem] border px-2 py-4 text-center transition-all duration-300",
                            selectedExperience === "bookings"
                                ? `border-brand-purple/50 bg-brand-purple/15 text-white ${activeOpacity}`
                                : `border-white/10 bg-white/5 text-gray-200 hover:border-white/20 hover:bg-white/10 ${selectedExperience ? inactiveOpacity : ""}`,
                        )}
                    >
                        <CalendarClock className={cn("mb-2 transition-transform", selectedExperience === "bookings" ? "h-6 w-6 text-brand-purple scale-110" : "h-5 w-5 text-gray-400")} />
                        <p className="text-xs font-bold leading-tight">Call</p>
                        {!selectedExperience && <p className="mt-1 text-[10px] text-gray-500 font-medium">Live time</p>}
                    </button>
                ) : null}
            </div>

            {/* Subscriptions Module */}
            {selectedExperience === "subscriptions" && settings.subscriptionsEnabled && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.8rem] border border-brand-purple/20 bg-gradient-to-b from-brand-purple/10 to-transparent p-5 sm:p-6">
                    <button aria-label="Go back" title="Go back" onClick={() => onSelectedExperienceChange(null)} className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="ml-10 flex flex-col gap-2">
                        <h2 className="text-xl font-black text-white">Fan Pass</h2>
                        <p className="text-sm font-medium text-brand-purple-light/80">Priority access and an exclusive connection.</p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/5 bg-black/40 p-4">
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <Star className="h-3 w-3 text-brand-purple" />
                                </div>
                                <span className="text-sm text-gray-200">Priority access layer</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <MessageSquare className="h-3 w-3 text-brand-purple" />
                                </div>
                                <span className="text-sm text-gray-200">Subscriber chat {settings.chatFreeForSubscribers ? "is free" : "included"}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <CalendarClock className="h-3 w-3 text-brand-purple" />
                                </div>
                                <span className="text-sm text-gray-200">{(settings.videoSubscriberDiscountPercent || 0) > 0 ? `${settings.videoSubscriberDiscountPercent}% off video bookings` : "Preferred booking availability"}</span>
                            </li>
                        </ul>
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 py-4 pl-5 pr-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Monthly Auto-Renew</span>
                            <span className="mt-0.5 text-2xl font-black text-white">{settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} <span className="text-sm font-medium text-gray-400">GD</span></span>
                        </div>
                        {subscriptionActive && (
                            <span className="rounded-full border border-brand-purple/30 bg-brand-purple/20 px-3 py-1 text-xs font-bold text-brand-purple-light">Active</span>
                        )}
                    </div>

                    {!subscriptionHydrated ? (
                        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                            <Loader2 className="h-3 w-3 animate-spin" /> Checking pass status...
                        </div>
                    ) : (
                        renderCTA(
                            subscriptionActive ? 0 : (settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD), 
                            () => subscriptionActive ? onStartSubscription() : onStartSubscription(),
                            subscribeLoading,
                            <Star className="h-4 w-4" />,
                            subscriptionActive ? "Cancel Fan Pass" : "Start Fan Pass",
                            subscriptionActive ? "bg-white/10 border border-white/10 text-white hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30" : "bg-brand-purple text-white shadow-lg shadow-brand-purple/20"
                        )
                    )}
                </section>
            )}

            {/* Messaging Module */}
            {selectedExperience === "messages" && settings.messagingEnabled && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/40 p-5 sm:p-6">
                    <button aria-label="Go back" title="Go back" onClick={() => onSelectedExperienceChange(null)} className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="ml-10 flex flex-col gap-2 mb-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-white">Private Chat</h2>
                            {settings.chatFreeForSubscribers && subscriptionActive && (
                                <span className="rounded-full bg-brand-purple/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-purple-light">Free for you</span>
                            )}
                        </div>
                        <p className="text-sm font-medium text-gray-400">The most direct way to connect.</p>
                    </div>

                    <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-none">
                        <div className="flex flex-1 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 py-3 px-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Text</span>
                            <span className="text-sm font-bold text-white">{CREATOR_MESSAGE_COSTS.text} GD</span>
                        </div>
                        <div className="flex flex-1 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 py-3 px-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Image</span>
                            <span className="text-sm font-bold text-white">{CREATOR_MESSAGE_COSTS.image} GD</span>
                        </div>
                        <div className="flex flex-1 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/5 py-3 px-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Video</span>
                            <span className="text-sm font-bold text-white">{CREATOR_MESSAGE_COSTS.video} GD</span>
                        </div>
                    </div>

                    {hasRecentThread ? (
                        <div className="mb-4 rounded-xl border border-brand-purple/10 bg-brand-purple/5 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-purple/20">
                                    <MessageSquare className="h-4 w-4 text-brand-purple" />
                                </div>
                                <div className="truncate">
                                    <p className="text-xs font-medium text-white truncate">Active conversation</p>
                                    <p className="text-[11px] text-gray-400 truncate">View your latest messages...</p>
                                </div>
                            </div>
                            <button onClick={onOpenChat} className="shrink-0 ml-2 flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20">
                                Open <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="mb-4 rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                            <p className="text-xs text-gray-400">No recent messages. Start the conversation!</p>
                        </div>
                    )}

                    {!hasRecentThread && renderCTA(
                        (settings.chatFreeForSubscribers && subscriptionActive) ? 0 : CREATOR_MESSAGE_COSTS.text,
                        onOpenChat,
                        false,
                        <MessageSquare className="h-4 w-4" />,
                        "Start chat"
                    )}
                </section>
            )}

            {/* Custom Requests Module */}
            {selectedExperience === "requests" && settings.customRequestsEnabled && requestCategories.length > 0 && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/40 p-5 sm:p-6">
                    <button aria-label="Go back" title="Go back" onClick={() => onSelectedExperienceChange(null)} className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="ml-10 flex flex-col gap-2 mb-6">
                        <h2 className="text-xl font-black text-white">Custom Request</h2>
                        <p className="text-sm font-medium text-gray-400">A custom treat made just for you.</p>
                    </div>

                    <div className="mb-4 flex flex-col gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 pl-1">Tap to select</span>
                        <div className="flex flex-wrap gap-2">
                            {requestCategories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setRequestCategoryId(category.id)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-full border px-4 py-2 transition-all",
                                        requestCategoryId === category.id
                                            ? "border-brand-purple bg-brand-purple/20 text-white shadow-inner shadow-brand-purple/20 scale-[1.02]"
                                            : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10" 
                                    )}
                                >
                                    <span className="text-sm font-semibold">{category.label}</span>
                                    <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded-[0.4rem]", requestCategoryId === category.id ? "bg-brand-purple/40 text-brand-purple-light" : "bg-black/40 text-gray-400")}>
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
                                placeholder="What would you like exactly? (e.g. Include my name, wear the red top...)"
                                className="w-full resize-none rounded-[1.2rem] border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:border-brand-purple/50 focus:outline-none focus:ring-1 focus:ring-brand-purple/50"
                            />
                            {renderCTA(
                                requestCategories.find(c => c.id === requestCategoryId)?.priceGd || 0,
                                onCreateRequest,
                                creatingRequest,
                                <Sparkles className="h-4 w-4" />,
                                "Send Request"
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Bookings Module */}
            {selectedExperience === "bookings" && settings.bookingsEnabled && (
                <section className="animate-in slide-in-from-top-2 fade-in duration-300 glass-panel relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-black/40 p-5 sm:p-6">
                    <button aria-label="Go back" title="Go back" onClick={() => onSelectedExperienceChange(null)} className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 opacity-80 transition-all hover:bg-white/10 hover:text-white">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    
                    <div className="ml-10 flex flex-col gap-2 mb-6">
                        <h2 className="text-xl font-black text-white">Live Time</h2>
                        <p className="text-sm font-medium text-gray-400">Booked moment. Premium access.</p>
                        {(settings.videoSubscriberDiscountPercent || 0) > 0 && subscriptionActive && bookingServiceType === "video" && (
                            <span className="inline-block w-fit mt-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-green-400 border border-green-500/20">
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
                            onClick={() => onBookingServiceTypeChange("phone")}
                            className={cn("flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] py-3 text-sm font-bold transition-all border", bookingServiceType === "phone" ? "border-brand-purple bg-brand-purple/15 text-white shadow-inner shadow-brand-purple/20" : "border-white/5 bg-white/5 text-gray-400 hover:bg-white/10")}
                        >
                            <Phone className="h-4 w-4" /> Phone
                        </button>
                        <button
                            type="button"
                            onClick={() => onBookingServiceTypeChange("video")}
                            className={cn("flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] py-3 text-sm font-bold transition-all border", bookingServiceType === "video" ? "border-brand-purple bg-brand-purple/15 text-white shadow-inner shadow-brand-purple/20" : "border-white/5 bg-white/5 text-gray-400 hover:bg-white/10")}
                        >
                            <Video className="h-4 w-4" /> Video
                        </button>
                    </div>

                    <div className="rounded-[1.4rem] border border-white/5 bg-black/30 p-4 mb-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Duration & Rate</span>
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
                                        @ {subscriptionActive ? Math.round(CREATOR_BOOKING_RATES.video * (1 - (settings.videoSubscriberDiscountPercent || 0)/100)) : CREATOR_BOOKING_RATES.video} GD/min
                                    </span>
                                )}
                            </div>
                            <div className="text-2xl font-black text-white">
                                {bookingServiceType === "phone" 
                                    ? bookingDurationMinutes * CREATOR_BOOKING_RATES.phone 
                                    : bookingDurationMinutes * (subscriptionActive ? Math.round(CREATOR_BOOKING_RATES.video * (1 - (settings.videoSubscriberDiscountPercent || 0)/100)) : CREATOR_BOOKING_RATES.video)} <span className="text-[11px] uppercase tracking-widest text-gray-500 font-bold ml-0.5">GD ttl</span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Date Picker & Availability Fallback */}
                    <div className="relative mb-5 flex gap-3">
                        <div className="flex-1">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 pl-1 mb-1.5 block">Date & Time</label>
                            <input
                                type="datetime-local"
                                value={bookingStartAt}
                                onChange={(event) => onBookingStartAtChange(event.target.value)}
                                className="w-full appearance-none rounded-[1.2rem] border border-white/10 bg-white/5 pl-4 pr-3 py-3 text-sm font-semibold text-white focus:border-brand-purple/50 focus:outline-none focus:ring-1 focus:ring-brand-purple/50 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                    {hasAvailabilities && !latestBooking && (
                        <div className="mb-5 rounded-[1.2rem] border border-white/5 bg-white/5 p-3">
                            <p className="text-xs text-gray-300 font-medium pb-2 text-center">Creator&apos;s Usual Hours</p>
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {availabilityWindows.slice(0, 3).map(w => (
                                    <span key={w.id} className="text-[10px] uppercase font-bold text-gray-400 bg-black/40 px-2 py-1 rounded-md">
                                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][w.dayOfWeek]} {w.startHour}:{w.startMinute.toString().padStart(2, '0')}-{w.endHour}:{w.endMinute.toString().padStart(2, '0')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {renderCTA(
                        bookingServiceType === "phone" 
                            ? bookingDurationMinutes * CREATOR_BOOKING_RATES.phone 
                            : bookingDurationMinutes * (subscriptionActive ? Math.round(CREATOR_BOOKING_RATES.video * (1 - (settings.videoSubscriberDiscountPercent || 0)/100)) : CREATOR_BOOKING_RATES.video),
                        onCreateBooking,
                        creatingBooking,
                        <CalendarClock className="h-4 w-4" />,
                        "Book Live Time"
                    )}
                </section>
            )}
        </div>
    );
}
