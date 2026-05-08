"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Send, Users, Eye, Activity, Phone, DollarSign, MessageCircle, PlaySquare, CheckCircle, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { UiContinuityNotice } from "@/components/ui/UiContinuityNotice";
import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    describeCreatorFacingOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
} from "@/lib/creator-onboarding";
import { loadUiContinuityModules, readUiJson, type UiContinuityModuleState } from "@/lib/ui-continuity";
import type { CreatorApplication, UserProfile } from "@/types/db";

type CreatorStats = {
    earningsGd: number;
    pendingCashoutGd: number;
    followerCount: number;
    profileViewsCount: number;
    liveDropsCount: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
};

type CreatorRequestRecord = {
    id: string;
    categoryLabel?: string;
    details?: string;
    priceGd?: number;
    status?: string;
    responseNote?: string | null;
    createdAt?: number;
    respondedAt?: number;
    userId?: string;
};

type CreatorBookingRecord = {
    id: string;
    serviceType?: string;
    status?: string;
    startAt?: number;
    durationMinutes?: number;
    priceGd?: number;
    userId?: string;
};

type CreatorThreadRecord = {
    id: string;
    creatorId?: string;
    userId?: string;
    lastMessageAt?: number;
    lastMessagePreview?: string;
    unreadCount?: number;
    counterpartDisplayName?: string;
    counterpartUsername?: string;
    counterpartPhotoURL?: string | null;
};

type CreatorSubscriptionRecord = {
    id: string;
    userId?: string;
    status?: string;
    priceGd?: number;
    renewAt?: number;
    autoRenew?: boolean;
};

type ModuleKey =
    | "settings"
    | "requests"
    | "bookings"
    | "subscriptions"
    | "threads";

const moduleLabels: Record<ModuleKey, string> = {
    settings: "creator settings",
    requests: "custom requests",
    bookings: "bookings",
    subscriptions: "subscriptions",
    threads: "messages",
};

const DEFAULT_MODULE_STATE: Record<ModuleKey, UiContinuityModuleState> = {
    settings: { key: "settings", label: "creator settings", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    requests: { key: "requests", label: "custom requests", critical: false, status: "success", warning: null, fallbackActive: false, responseOk: true },
    bookings: { key: "bookings", label: "bookings", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    subscriptions: { key: "subscriptions", label: "subscriptions", critical: true, status: "success", warning: null, fallbackActive: false, responseOk: true },
    threads: { key: "threads", label: "messages", critical: false, status: "success", warning: null, fallbackActive: false, responseOk: true },
};

function formatRelativeTime(timestamp?: number) {
    if (!timestamp || !Number.isFinite(timestamp)) {
        return "Not available";
    }

    const diffMs = timestamp - Date.now();
    const diffMinutes = Math.round(diffMs / 60_000);
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, "minute");
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 48) {
        return rtf.format(diffHours, "hour");
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 30) {
        return rtf.format(diffDays, "day");
    }

    return new Date(timestamp).toLocaleString();
}

function formatStatusLabel(value?: string) {
    return value ? value.replaceAll("_", " ") : "unknown";
}

function toneClasses(tone: "good" | "warn" | "bad" | "neutral") {
    switch (tone) {
        case "good":
            return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
        case "warn":
            return "border-amber-400/20 bg-amber-500/10 text-amber-100";
        case "bad":
            return "border-red-400/20 bg-red-500/10 text-red-100";
        default:
            return "border-white/10 bg-white/5 text-gray-200";
    }
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "bad" | "neutral" }) {
    return (
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${toneClasses(tone)}`}>
            {label}
        </span>
    );
}

function formatDashboardMetric(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "Unavailable";
}

export function CreatorWorkspacePanel({ userProfile }: { userProfile: UserProfile }) {
    const { viewAsState } = useAdminViewAs();
    const creatorApplication = userProfile.creatorApplication as CreatorApplication | undefined;
    const isCreatorOperator = userProfile.role === "creator";
    const isProjectionMode = Boolean(viewAsState);
    const projectionCreatorId = viewAsState?.adminViewingAsUserId ?? "";
    const projectionDisplayName = viewAsState?.adminViewingAsDisplayName ?? "Creator";
    const hasCreatorWorkspace = isCreatorOperator || Boolean(creatorApplication) || isProjectionMode;

    const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
    const [requests, setRequests] = useState<CreatorRequestRecord[]>([]);
    const [bookings, setBookings] = useState<CreatorBookingRecord[]>([]);
    const [subscriptions, setSubscriptions] = useState<CreatorSubscriptionRecord[]>([]);
    const [threads, setThreads] = useState<CreatorThreadRecord[]>([]);
    const [moduleErrors, setModuleErrors] = useState<Record<ModuleKey, string | null>>({
        settings: null,
        requests: null,
        bookings: null,
        subscriptions: null,
        threads: null,
    });
    const [moduleState, setModuleState] = useState<Record<ModuleKey, UiContinuityModuleState>>(DEFAULT_MODULE_STATE);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [broadcastDraft, setBroadcastDraft] = useState("");

    const onboardingSummary = useMemo(() => {
        if (isProjectionMode) {
            return {
                stage: "Projection",
                label: "Admin projection active",
                summary: `Read-only projection of ${projectionDisplayName}'s creator dashboard.`,
                timeline: "",
            };
        }

        if (creatorApplication) {
            return getCreatorOnboardingStatusSummary(creatorApplication);
        }

        if (isCreatorOperator) {
            return {
                stage: "Approved",
                label: "Creator access live",
                summary: "Creator access is already live, and this workspace reads from the real creator routes.",
                timeline: "",
            };
        }

        return getCreatorOnboardingStatusSummary(undefined);
    }, [creatorApplication, isCreatorOperator, isProjectionMode, projectionDisplayName]);
    const blockingReasons = useMemo(
        () => (creatorApplication?.blockingReasons ?? []).map((reason) => describeCreatorFacingOnboardingBlockingReason(reason)),
        [creatorApplication?.blockingReasons],
    );
    const moduleErrorEntries = useMemo(
        () => Object.entries(moduleErrors).filter((entry): entry is [ModuleKey, string] => typeof entry[1] === "string" && entry[1].length > 0),
        [moduleErrors],
    );

    const loadWorkspace = useCallback(async () => {
        if (!isCreatorOperator && !isProjectionMode) {
            return;
        }

        const creatorQuery = projectionCreatorId ? `?creatorId=${encodeURIComponent(projectionCreatorId)}` : "";

        const nextErrors: Record<ModuleKey, string | null> = {
            settings: null,
            requests: null,
            bookings: null,
            subscriptions: null,
            threads: null,
        };

        const results = await loadUiContinuityModules({
            surface: "creator_workspace",
            diagnosticsChannel: "ui",
            modules: [
                {
                    key: "settings",
                    label: "creator settings",
                    critical: true,
                    load: async () => readUiJson<{
                        stats?: CreatorStats | null;
                    }>(
                        await authFetch(`/api/creator/settings${creatorQuery}`),
                        { moduleLabel: "creator settings", url: "/api/creator/settings" },
                    ),
                },
                {
                    key: "requests",
                    label: "creator requests",
                    load: async () => readUiJson<{ requests?: CreatorRequestRecord[] }>(
                        await authFetch(`/api/creator/requests${creatorQuery}`),
                        { moduleLabel: "creator requests", url: "/api/creator/requests" },
                    ),
                    fallbackValue: { requests: [] },
                },
                {
                    key: "bookings",
                    label: "creator bookings",
                    critical: true,
                    load: async () => readUiJson<{ bookings?: CreatorBookingRecord[] }>(
                        await authFetch(`/api/creator/bookings${creatorQuery}`),
                        { moduleLabel: "creator bookings", url: "/api/creator/bookings" },
                    ),
                    fallbackValue: { bookings: [] },
                },
                {
                    key: "subscriptions",
                    label: "creator subscriptions",
                    critical: true,
                    load: async () => readUiJson<{ subscribers?: CreatorSubscriptionRecord[] }>(
                        await authFetch(`/api/creator/subscriptions${creatorQuery}`),
                        { moduleLabel: "creator subscriptions", url: "/api/creator/subscriptions" },
                    ),
                    fallbackValue: { subscribers: [] },
                },
                {
                    key: "threads",
                    label: "creator messages",
                    load: async () => readUiJson<{ threads?: CreatorThreadRecord[] }>(
                        await authFetch(`/api/chat/threads${creatorQuery}`),
                        { moduleLabel: "creator messages", url: "/api/chat/threads" },
                    ),
                    fallbackValue: { threads: [] },
                },
            ],
        });

        const nextModuleState = { ...DEFAULT_MODULE_STATE };
        for (const result of results) {
            nextModuleState[result.state.key as ModuleKey] = result.state;
            if (result.state.warning) {
                nextErrors[result.state.key as ModuleKey] = result.state.warning;
            }
            if (result.state.key === "settings" && result.value && typeof result.value === "object") {
                setCreatorStats((result.value as { stats?: CreatorStats | null }).stats ?? null);
            }
            if (result.state.key === "requests" && result.value && typeof result.value === "object") {
                const requestsResult = result.value as { requests?: CreatorRequestRecord[] };
                setRequests(Array.isArray(requestsResult.requests) ? requestsResult.requests : []);
            }
            if (result.state.key === "bookings" && result.value && typeof result.value === "object") {
                const bookingsResult = result.value as { bookings?: CreatorBookingRecord[] };
                setBookings(Array.isArray(bookingsResult.bookings) ? bookingsResult.bookings : []);
            }
            if (result.state.key === "subscriptions" && result.value && typeof result.value === "object") {
                const subscriptionsResult = result.value as { subscribers?: CreatorSubscriptionRecord[] };
                setSubscriptions(Array.isArray(subscriptionsResult.subscribers) ? subscriptionsResult.subscribers : []);
            }
            if (result.state.key === "threads" && result.value && typeof result.value === "object") {
                const threadsResult = result.value as { threads?: CreatorThreadRecord[] };
                setThreads(Array.isArray(threadsResult.threads) ? threadsResult.threads : []);
            }
        }

        setModuleErrors(nextErrors);
        setModuleState(nextModuleState);
    }, [isCreatorOperator, isProjectionMode, projectionCreatorId]);

    useEffect(() => {
        if (!isCreatorOperator) {
            return;
        }

        void loadWorkspace();
    }, [isCreatorOperator, loadWorkspace]);
    const runAction = useCallback(async (actionKey: string, callback: () => Promise<void>, failureMessage: string) => {
        setBusyAction(actionKey);
        try {
            await callback();
        } catch (error) {
            reportClientIssue({
                channel: "ui",
                severity: "warn",
                message: "Creator workspace action failed",
                error,
                detail: {
                    actionKey,
                },
                consoleLabel: `[CreatorWorkspace] ${actionKey} failed`,
            });
            toast.error(error instanceof Error ? error.message : failureMessage);
        } finally {
            setBusyAction(null);
        }
    }, []);

    const handleRequestAction = useCallback((requestId: string, action: "accept" | "decline" | "fulfill") => {
        if (isProjectionMode) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

        void runAction(`request:${requestId}:${action}`, async () => {
            await readUiJson(
                await authFetch("/api/creator/requests", {
                    method: "PUT",
                    body: JSON.stringify({ requestId, action }),
                }),
                { moduleLabel: "creator requests", url: "/api/creator/requests" },
            );
            toast.success(`Request ${action}ed.`);
            await loadWorkspace();
        }, "We could not update that request.");
    }, [isProjectionMode, loadWorkspace, runAction]);

    const handleBookingAction = useCallback((bookingId: string, action: "complete" | "cancel") => {
        if (isProjectionMode) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

        void runAction(`booking:${bookingId}:${action}`, async () => {
            await readUiJson(
                await authFetch("/api/creator/bookings", {
                    method: "PUT",
                    body: JSON.stringify({ bookingId, action }),
                }),
                { moduleLabel: "creator bookings", url: "/api/creator/bookings" },
            );
            toast.success(action === "complete" ? "Booking completed." : "Booking canceled.");
            await loadWorkspace();
        }, "We could not update that booking.");
    }, [isProjectionMode, loadWorkspace, runAction]);

    const handleBroadcastSend = useCallback(() => {
        if (!broadcastDraft.trim().length) {
            return;
        }

        if (isProjectionMode) {
            toast.error("Creator dashboard is read-only in admin projection.");
            return;
        }

        void runAction("broadcast:send", async () => {
            await readUiJson(
                await authFetch("/api/creator/broadcasts", {
                    method: "POST",
                    body: JSON.stringify({ message: broadcastDraft.trim() }),
                }),
                { moduleLabel: "creator broadcasts", url: "/api/creator/broadcasts" },
            );
            setBroadcastDraft("");
            toast.success("Broadcast sent.");
        }, "We could not send that broadcast.");
    }, [broadcastDraft, isProjectionMode, runAction]);

    if (!hasCreatorWorkspace) {
        return null;
    }

    const unreadMessagesCount = threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);
    const actionNeededCount = (creatorStats?.openRequests || 0) + (creatorStats?.bookedCalls || 0) + unreadMessagesCount;
    const cashValueUsd = ((creatorStats?.earningsGd || 0) / 100).toFixed(2);
    
    // Most recent active thread with another user
    const recentThread = threads.length > 0 ? threads[0] : null;

    return (
        <section className="mb-5 md:mb-8">
            {isProjectionMode ? (
                <div className="mb-4 rounded-2xl border border-brand-purple/30 bg-brand-purple/10 px-4 py-3 text-sm text-white">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-bold">Admin projection</p>
                            <p className="mt-1 text-xs text-white/75">
                                Read-only creator dashboard preview for {projectionDisplayName}. Writes are blocked.
                            </p>
                        </div>
                        <StatusPill label="Read-only" tone="warn" />
                    </div>
                </div>
            ) : null}

            {!isCreatorOperator ? (
                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold text-white">{onboardingSummary.label}</p>
                            <p className="mt-1 text-xs text-gray-400">{onboardingSummary.summary}</p>
                        </div>
                        <div className="flex gap-2">
                            <StatusPill label={onboardingSummary.stage} tone={creatorApplication?.approvalStatus === "creator_approved" ? "good" : blockingReasons.length > 0 ? "warn" : "neutral"} />
                            {creatorApplication?.readyForApproval ? <StatusPill label="Ready" tone="good" /> : null}
                            {typeof creatorApplication?.queuePosition === "number" && creatorApplication.queuePosition > 0 ? (
                                <StatusPill label={`#${creatorApplication.queuePosition} in queue`} />
                            ) : null}
                            <Link href="/creators/waitlist" className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
                                View app
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Inbox Preview Row */}
                    <div className="flex flex-col gap-4 sm:flex-row">
                        {/* Quick Actions Array - Replaces verbose headers */}
                        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                            <Link href="/dashboard/chat" className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-purple/20">
                                <MessageCircle className="h-4 w-4" />
                                Inbox {unreadMessagesCount > 0 ? <span className="flex h-5 items-center justify-center rounded-full bg-brand-purple px-2 text-[10px] font-bold">{unreadMessagesCount}</span> : null}
                            </Link>
                            {isProjectionMode ? (
                                <button type="button" onClick={() => toast.error("Creator dashboard is read-only in admin projection.")} className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white opacity-60">
                                    <Package className="h-4 w-4" />
                                    Create drop
                                </button>
                            ) : (
                                <Link href="/dashboard/drops" className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                                    <Package className="h-4 w-4" />
                                    Create drop
                                </Link>
                            )}
                            <Link href="/dashboard/profile" className="flex shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                                Creator settings
                            </Link>
                        </div>

                        {/* Dense Inbox Preview */}
                        {recentThread ? (
                            <Link href={`/dashboard/chat?thread=${recentThread.id}`} className="group relative flex w-full shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 transition-colors hover:bg-white/5 sm:w-[280px]">
                                {recentThread.counterpartPhotoURL ? (
                                    <Image
                                        src={recentThread.counterpartPhotoURL}
                                        alt="Fan"
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                                        <Users className="h-5 w-5 opacity-50" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-sm font-bold text-white">{recentThread.counterpartDisplayName || recentThread.counterpartUsername || "Fan"}</p>
                                        <span className="shrink-0 text-[10px] text-gray-500">{formatRelativeTime(recentThread.lastMessageAt).replace(" ago", "")}</span>
                                    </div>
                                    <p className="truncate text-xs text-gray-400">{recentThread.lastMessagePreview || "New thread"}</p>
                                </div>
                                {(recentThread.unreadCount ?? 0) > 0 ? <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-purple" /> : null}
                            </Link>
                        ) : null}
                    </div>

                    {moduleErrorEntries.length > 0 ? (
                        <div className="rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                            {moduleErrorEntries.map(([module, message]) => `${moduleLabels[module]}: ${message}`).join(" | ")}
                        </div>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                        {/* 3x3 Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-brand-purple">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(creatorStats?.earningsGd)} <span className="text-[10px] uppercase tracking-wider text-brand-purple">GD</span></p>
                                    <p className="text-xs text-brand-purple/70">{creatorStats ? `$${cashValueUsd} value` : "Unavailable"}</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4 transition-colors hover:bg-emerald-400/10">
                                <div className="flex items-center justify-between text-emerald-400">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{creatorStats ? formatDashboardMetric(actionNeededCount) : "Unavailable"}</p>
                                    <p className="text-xs text-emerald-400/70">Action needed</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-gray-400">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(creatorStats?.followerCount)}</p>
                                    <p className="text-xs text-gray-400">Fans</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-gray-400">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(creatorStats?.profileViewsCount)}</p>
                                    <p className="text-xs text-gray-400">Content views</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-gray-400">
                                    <MessageCircle className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(unreadMessagesCount)}</p>
                                    <p className="text-xs text-gray-400">Messages</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-gray-400">
                                    <PlaySquare className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(creatorStats?.liveDropsCount)}</p>
                                    <p className="text-xs text-gray-400">Content</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-gray-400">
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(creatorStats?.openRequests)}</p>
                                    <p className="text-xs text-gray-400">Requests</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-gray-400">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(creatorStats?.bookedCalls)}</p>
                                    <p className="text-xs text-gray-400">Bookings</p>
                                </div>
                            </div>
                            <div className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                <div className="flex items-center justify-between text-gray-400">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div className="mt-3">
                                    <p className="text-2xl font-black text-white">{formatDashboardMetric(creatorStats?.activeSubscribers)}</p>
                                    <p className="text-xs text-gray-400">Fan Pass</p>
                                </div>
                            </div>
                        </div>

                        {/* Broadcasts Module */}
                        <div className="flex flex-col gap-3">
                            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Megaphone className="h-4 w-4 text-brand-purple" /> Quick Broadcast</h3>
                                <textarea
                                    value={broadcastDraft}
                                    onChange={(event) => setBroadcastDraft(event.target.value.slice(0, 280))}
                                    rows={2}
                                    placeholder="Write a blast to all followers..."
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-brand-purple/50 focus:outline-none"
                                />
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">{broadcastDraft.length}/280</span>
                                    <Button
                                        variant="brand"
                                        size="sm"
                                        isLoading={busyAction === "broadcast:send"}
                                        disabled={broadcastDraft.trim().length < 4 || isProjectionMode}
                                        onClick={handleBroadcastSend}
                                        className="h-8 rounded-full px-4 text-xs font-bold"
                                    >
                                        <Send className="mr-1 h-3 w-3" /> Blast
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Relevant Action Required Lists */}
                            {requests.length > 0 && (
                                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Requests</h3>
                                    <div className="mt-3 space-y-2">
                                        {requests.slice(0, 3).map((r) => (
                                            <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                                                <p className="truncate text-sm font-semibold text-white">{r.categoryLabel} <span className="text-xs text-emerald-400">{r.priceGd} GD</span></p>
                                                <div className="flex shrink-0 gap-1">
                                                    {r.status === "pending" && (
                                                        <>
                                                            <button onClick={() => handleRequestAction(r.id, "accept")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30">Accept</button>
                                                            <button onClick={() => handleRequestAction(r.id, "decline")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-300 transition-colors hover:bg-red-500/20">Deny</button>
                                                        </>
                                                    )}
                                                    {r.status === "accepted" && <button onClick={() => handleRequestAction(r.id, "fulfill")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-brand-purple/20 px-2 py-1 text-[10px] font-bold text-brand-purple transition-colors hover:bg-brand-purple/30">Done</button>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bookings.length > 0 && (
                                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-4" data-testid="creator-workspace-bookings">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Bookings</h3>
                                    <div className="mt-3 space-y-2">
                                        {bookings.slice(0, 3).map((b) => (
                                            <div key={b.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                                                <p className="truncate text-sm font-semibold text-white">{formatStatusLabel(b.serviceType)} Call - {formatStatusLabel(b.status)}</p>
                                                <div className="flex shrink-0 gap-1">
                                                    {b.status === "booked" && (
                                                        <button onClick={() => handleBookingAction(b.id, "complete")} disabled={busyAction !== null || isProjectionMode} className="rounded-lg bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30">Mark done</button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {moduleErrors.bookings ? (
                                <UiContinuityNotice
                                    title="Bookings module degraded"
                                    body={moduleErrors.bookings}
                                    tone="warning"
                                    data-testid="creator-workspace-bookings-warning"
                                />
                            ) : moduleState.bookings.status === "success" && bookings.length === 0 ? (
                                <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-4 text-sm text-gray-300" data-testid="creator-workspace-bookings-empty">
                                    No active phone or video bookings are hydrated right now.
                                </div>
                            ) : null}

                            {moduleErrors.subscriptions ? (
                                <UiContinuityNotice
                                    title="Subscriptions module degraded"
                                    body={moduleErrors.subscriptions}
                                    tone="warning"
                                    data-testid="creator-workspace-subscriptions-warning"
                                />
                            ) : (
                                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-4" data-testid="creator-workspace-subscriptions">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Subscribers</h3>
                                    {subscriptions.length > 0 ? (
                                        <div className="mt-3 space-y-2">
                                            {subscriptions.slice(0, 4).map((subscription) => (
                                                <div key={subscription.id} className="rounded-xl bg-white/5 px-3 py-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="truncate text-sm font-semibold text-white">{subscription.userId || subscription.id}</p>
                                                        <StatusPill label={formatStatusLabel(subscription.status)} tone={subscription.status === "active" ? "good" : "neutral"} />
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        {typeof subscription.priceGd === "number" ? `${subscription.priceGd} GD` : "Price unavailable"}
                                                        {typeof subscription.renewAt === "number" ? ` • renews ${formatRelativeTime(subscription.renewAt)}` : ""}
                                                        {subscription.autoRenew === false ? " • auto-renew off" : " • auto-renew on"}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-300">
                                            No subscriber rows are active yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
