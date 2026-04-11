"use client";

import {
    CalendarClock,
    Loader2,
    MessageSquare,
    Sparkles,
    Wallet,
} from "lucide-react";

import {
    CREATOR_BOOKING_MIN_MINUTES,
    CREATOR_BOOKING_RATES,
    CREATOR_MESSAGE_COSTS,
    CREATOR_SUBSCRIPTION_MIN_GD,
    type CreatorRequestCategoryConfig,
    type CreatorSettings,
} from "@/lib/creator-experiences";
import { cn } from "@/lib/utils";

type CreatorExperienceView = "subscriptions" | "messages" | "requests" | "bookings";

type CreatorExperiencesPanelProps = {
    bookingDurationMinutes: number;
    bookingServiceType: "phone" | "video";
    bookingStartAt: string;
    creatingBooking: boolean;
    creatingRequest: boolean;
    currentUser: unknown;
    latestBooking: Record<string, unknown> | null;
    messages: Array<Record<string, unknown>>;
    onBookingDurationMinutesChange: (value: number) => void;
    onBookingServiceTypeChange: (value: "phone" | "video") => void;
    onBookingStartAtChange: (value: string) => void;
    onCreateBooking: () => void;
    onCreateRequest: () => void;
    onOpenAuth: () => void;
    onOpenChat: () => void;
    onSelectedExperienceChange: (value: CreatorExperienceView) => void;
    onStartSubscription: () => void;
    requestCategories: CreatorRequestCategoryConfig[];
    requestCategoryId: string;
    requestDetails: string;
    selectedExperience: CreatorExperienceView | null;
    settings: CreatorSettings;
    setRequestCategoryId: (value: string) => void;
    setRequestDetails: (value: string) => void;
    subscriptionActive: boolean;
    subscribeLoading: boolean;
};

export function CreatorExperiencesPanel({
    bookingDurationMinutes,
    bookingServiceType,
    bookingStartAt,
    creatingBooking,
    creatingRequest,
    currentUser,
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
    subscribeLoading,
}: CreatorExperiencesPanelProps) {
    const recentMessages = messages.slice(-3).reverse();

    return (
        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {settings.subscriptionsEnabled ? (
                    <button
                        type="button"
                        onClick={() => onSelectedExperienceChange("subscriptions")}
                        className={cn(
                            "rounded-[1.6rem] border px-3 py-3 text-left transition-all",
                            selectedExperience === "subscriptions"
                                ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]",
                        )}
                    >
                        <Wallet className="h-5 w-5 text-brand-purple" />
                        <p className="mt-3 text-sm font-bold text-white">Fan Pass</p>
                        <p className="mt-1 text-xs text-gray-400">{settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} GD monthly</p>
                    </button>
                ) : null}

                {settings.messagingEnabled ? (
                    <button
                        type="button"
                        onClick={() => onSelectedExperienceChange("messages")}
                        className={cn(
                            "rounded-[1.6rem] border px-3 py-3 text-left transition-all",
                            selectedExperience === "messages"
                                ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]",
                        )}
                    >
                        <MessageSquare className="h-5 w-5 text-brand-purple" />
                        <p className="mt-3 text-sm font-bold text-white">Private chat</p>
                        <p className="mt-1 text-xs text-gray-400">{CREATOR_MESSAGE_COSTS.text} to {CREATOR_MESSAGE_COSTS.video} GD</p>
                    </button>
                ) : null}

                {settings.customRequestsEnabled && requestCategories.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => onSelectedExperienceChange("requests")}
                        className={cn(
                            "rounded-[1.6rem] border px-3 py-3 text-left transition-all",
                            selectedExperience === "requests"
                                ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]",
                        )}
                    >
                        <Sparkles className="h-5 w-5 text-brand-purple" />
                        <p className="mt-3 text-sm font-bold text-white">Custom request</p>
                        <p className="mt-1 text-xs text-gray-400">{requestCategories[0]?.priceGd ?? 0} GD and up</p>
                    </button>
                ) : null}

                {settings.bookingsEnabled ? (
                    <button
                        type="button"
                        onClick={() => onSelectedExperienceChange("bookings")}
                        className={cn(
                            "rounded-[1.6rem] border px-3 py-3 text-left transition-all",
                            selectedExperience === "bookings"
                                ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/[0.08]",
                        )}
                    >
                        <CalendarClock className="h-5 w-5 text-brand-purple" />
                        <p className="mt-3 text-sm font-bold text-white">Call or video</p>
                        <p className="mt-1 text-xs text-gray-400">Starts at {CREATOR_BOOKING_MIN_MINUTES} min</p>
                    </button>
                ) : null}
            </div>

            {selectedExperience === "subscriptions" && settings.subscriptionsEnabled ? (
                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-white">Fan Pass</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                                Subscriber chat, lower booking friction, and first access when requests open.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Monthly</p>
                            <p className="mt-1 text-2xl font-black text-brand-purple">{settings.subscriptionPriceGd || CREATOR_SUBSCRIPTION_MIN_GD} GD</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!currentUser) {
                                onOpenAuth();
                                return;
                            }
                            onStartSubscription();
                        }}
                        disabled={subscribeLoading}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-5 py-3 text-sm font-bold text-white"
                    >
                        {subscribeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                        {subscriptionActive ? "Cancel fan pass" : "Start fan pass"}
                    </button>
                </section>
            ) : null}

            {selectedExperience === "messages" && settings.messagingEnabled ? (
                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-white">Private creator chat</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                                Open the Chat inbox to send text, image, or video messages at these rates, and subscribers chat free when enabled.
                            </p>
                        </div>
                        {subscriptionActive ? (
                            <div className="rounded-full border border-brand-purple/25 bg-brand-purple/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                Subscriber active
                            </div>
                        ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Text</p>
                            <p className="mt-2 text-sm font-semibold text-white">{CREATOR_MESSAGE_COSTS.text} GD</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Image</p>
                            <p className="mt-2 text-sm font-semibold text-white">{CREATOR_MESSAGE_COSTS.image} GD</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Video</p>
                            <p className="mt-2 text-sm font-semibold text-white">{CREATOR_MESSAGE_COSTS.video} GD</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!currentUser) {
                                onOpenAuth();
                                return;
                            }
                            onOpenChat();
                        }}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple px-5 py-3 text-sm font-bold text-white"
                    >
                        <MessageSquare className="h-4 w-4" />
                        Open chat
                    </button>
                    {recentMessages.length > 0 ? (
                        <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Recent chat</p>
                            {recentMessages.map((message) => (
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

            {selectedExperience === "requests" && settings.customRequestsEnabled && requestCategories.length > 0 ? (
                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-white">Custom request</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                                Request one-off creator work with pricing set by category.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {requestCategories.slice(0, 2).map((category) => (
                                <span
                                    key={category.id}
                                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-gray-200"
                                >
                                    {category.label} - {category.priceGd} GD
                                </span>
                            ))}
                        </div>
                    </div>
                    <select
                        value={requestCategoryId}
                        onChange={(event) => setRequestCategoryId(event.target.value)}
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                    >
                        <option value="">Choose a request type</option>
                        {requestCategories.map((category) => (
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
                                onOpenAuth();
                                return;
                            }
                            onCreateRequest();
                        }}
                        disabled={creatingRequest}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white"
                    >
                        {creatingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Create request
                    </button>
                </section>
            ) : null}

            {selectedExperience === "bookings" && settings.bookingsEnabled ? (
                <section className="glass-panel rounded-[1.8rem] border border-white/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-white">Phone or video time</h2>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                                Phone from {CREATOR_BOOKING_RATES.phone} GD/min and video from {CREATOR_BOOKING_RATES.video} GD/min.
                            </p>
                        </div>
                        {latestBooking ? (
                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Latest booking</p>
                                <p className="mt-1 text-sm text-white">
                                    {String(latestBooking.serviceType || "call")}
                                    {typeof latestBooking.priceGd === "number" ? ` - ${latestBooking.priceGd} GD` : ""}
                                </p>
                            </div>
                        ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <select
                            value={bookingServiceType}
                            onChange={(event) => onBookingServiceTypeChange(event.target.value as "phone" | "video")}
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
                            onChange={(event) => onBookingDurationMinutesChange(Number(event.target.value) || CREATOR_BOOKING_MIN_MINUTES)}
                            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                        />
                    </div>
                    <input
                        type="datetime-local"
                        value={bookingStartAt}
                        onChange={(event) => onBookingStartAtChange(event.target.value)}
                        className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white [color-scheme:dark]"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (!currentUser) {
                                onOpenAuth();
                                return;
                            }
                            onCreateBooking();
                        }}
                        disabled={creatingBooking}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold text-white"
                    >
                        {creatingBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                        Book creator time
                    </button>
                </section>
            ) : null}
        </div>
    );
}

