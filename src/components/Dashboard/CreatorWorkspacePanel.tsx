"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Send, Users, Activity, MessageCircle, Package } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { UiContinuityNotice } from "@/components/ui/UiContinuityNotice";
import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth } from "@/context/AuthContext";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    describeCreatorFacingOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
} from "@/lib/creator-onboarding";
import { CREATOR_DROP_MANAGE_ROUTE, CREATOR_DROP_ROUTE_STATE, CREATOR_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";
import { buildBugReportContext, getSafePreviousRoute, resolveClientActionError } from "@/lib/errors/client-error-adapter";
import { loadUiContinuityModules, readUiJson, type UiContinuityModuleState } from "@/lib/ui-continuity";
import type { CreatorApplication, UserProfile } from "@/types/db";

type CreatorStats = {
    earningsGd: number;
    pendingCashoutGd: number;
    followerCount: number;
    profileViewsCount: number;
    liveDropsCount: number;
    contentCount?: number;
    activeSubscribers: number;
    openRequests: number;
    bookedCalls: number;
};

type CreatorSettingsSourceSummary = {
    settingsState?: "configured" | "not_configured";
    statsEvidence?: {
        sourceTruth?: "canonical" | "partial" | "needs_review" | "unavailable";
        issues?: string[];
        fanCountSource?: "relationship_count" | "profile_follower_count" | "settings_snapshot" | "unavailable";
        contentCountScope?: "creator_owned_or_assigned";
    } | null;
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
    const settingsBugReporter = useSubmitBugReport();
    const creatorApplication = userProfile.creatorApplication as CreatorApplication | undefined;
    const isCreatorOperator = userProfile.role === "creator";
    const isProjectionMode = Boolean(viewAsState);
    const projectionCreatorId = viewAsState?.adminViewingAsUserId ?? "";
    const projectionDisplayName = viewAsState?.adminViewingAsDisplayName ?? "Creator";
    const hasCreatorWorkspace = isCreatorOperator || Boolean(creatorApplication) || isProjectionMode;

    const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
    const [creatorStatsEvidence, setCreatorStatsEvidence] = useState<CreatorSettingsSourceSummary["statsEvidence"]>(null);
    const [settingsSourceNotice, setSettingsSourceNotice] = useState<{
        title: string;
        body: string;
        state: string;
    } | null>(null);
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
        () => Object.entries(moduleErrors).filter((entry): entry is [ModuleKey, string] => entry[0] !== "settings" && typeof entry[1] === "string" && entry[1].length > 0),
        [moduleErrors],
    );
    const settingsModuleError = useMemo(() => {
        if (!moduleErrors.settings) {
            return null;
        }

        return resolveClientActionError(
            { errorKey: "dashboard_source_unavailable", status: 500 },
            {
                surface: "creator_dashboard",
                route: "/api/creator/settings",
                status: 500,
                code: "dashboard_source_unavailable",
                fallbackKey: "dashboard_source_unavailable",
                context: {
                    manager: "creator_settings",
                    source_component: "CreatorWorkspacePanel",
                },
            },
        );
    }, [moduleErrors.settings]);

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
        setSettingsSourceNotice(null);

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
                        settingsState?: "configured" | "not_configured";
                        statsEvidence?: CreatorSettingsSourceSummary["statsEvidence"];
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
                const settingsResult = result.value as { stats?: CreatorStats | null } & CreatorSettingsSourceSummary;
                setCreatorStats(settingsResult.stats ?? null);
                setCreatorStatsEvidence(settingsResult.statsEvidence ?? null);
                const issues = settingsResult.statsEvidence?.issues ?? [];
                if (settingsResult.settingsState === "not_configured" || issues.includes("creator_settings_not_configured")) {
                    setSettingsSourceNotice({
                        title: "Creator Settings need setup",
                        body: "The dashboard is using safe defaults until this creator finishes setup.",
                        state: "not_configured",
                    });
                } else if (
                    settingsResult.statsEvidence?.sourceTruth === "partial"
                    || settingsResult.statsEvidence?.sourceTruth === "needs_review"
                    || settingsResult.statsEvidence?.sourceTruth === "unavailable"
                    || issues.length > 0
                ) {
                    setSettingsSourceNotice({
                        title: "Some creator stats need source review",
                        body: "The dashboard is showing safe partial data while one or more stat sources are unavailable.",
                        state: settingsResult.statsEvidence?.sourceTruth ?? "partial",
                    });
                }
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
            toast.error(failureMessage);
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
    const broadcastSourceReady = Boolean(creatorStats);
    const creatorContentCount = creatorStats?.contentCount ?? creatorStats?.liveDropsCount;
    const fanCountSource = creatorStatsEvidence?.fanCountSource ?? "unavailable";
    const overviewStatus = settingsSourceNotice
        ? settingsSourceNotice.state === "not_configured" ? "Setup needed" : "Partial source"
        : creatorStats ? "Live" : "Loading";
    const overviewMetrics = [
        { label: "Balance", value: creatorStats ? `${formatDashboardMetric(creatorStats.earningsGd)} GD` : "Unavailable", detail: creatorStats ? `$${cashValueUsd} value` : "Value unavailable", tone: "brand" },
        { label: "Action needed", value: creatorStats ? formatDashboardMetric(actionNeededCount) : "Unavailable", detail: "Requests, bookings, messages", tone: "action" },
        { label: "Fans", value: formatDashboardMetric(creatorStats?.followerCount), detail: fanCountSource.replaceAll("_", " "), tone: "neutral" },
        { label: "Content views", value: formatDashboardMetric(creatorStats?.profileViewsCount), detail: "Views tracked separately", tone: "muted" },
        { label: "Content", value: formatDashboardMetric(creatorContentCount), detail: "Owned or assigned drops", tone: "neutral" },
        { label: "Messages", value: formatDashboardMetric(unreadMessagesCount), detail: "Unread", tone: "muted" },
        { label: "Requests", value: formatDashboardMetric(creatorStats?.openRequests), detail: "Open", tone: "muted" },
        { label: "Bookings", value: formatDashboardMetric(creatorStats?.bookedCalls), detail: "Booked", tone: "muted" },
        { label: "Fan Pass", value: formatDashboardMetric(creatorStats?.activeSubscribers), detail: "Active", tone: "muted" },
    ];
    
    // Most recent active thread with another user
    const recentThread = threads.length > 0 ? threads[0] : null;

    return (
        <section
            className="mb-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+9rem)] sm:pt-0 md:mb-8 md:pb-0"
            data-creator-dashboard-landing-density="mobile_compact"
            data-creator-landing-mobile-density="compact_v2"
            data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}
            data-creator-landing-error-language="human"
            data-bottom-nav-safe="true"
            data-report-issue-safe-offset="bottom-nav"
        >
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
                <div className="space-y-3 sm:space-y-4">
                    {/* Inbox Preview Row */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                        {/* Quick Actions Array - Replaces verbose headers */}
                        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 sm:pb-0" data-creator-landing-quick-actions="compact_v2">
                            <Link href="/dashboard/chat" className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-brand-purple/20 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Inbox {unreadMessagesCount > 0 ? <span className="flex h-5 items-center justify-center rounded-full bg-brand-purple px-2 text-[10px] font-bold">{unreadMessagesCount}</span> : null}
                            </Link>
                            {isProjectionMode ? (
                                <button type="button" onClick={() => toast.error("Creator dashboard is read-only in admin projection.")} className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-60 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Manage drops
                                </button>
                            ) : (
                                <Link href={CREATOR_DROP_MANAGE_ROUTE} className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm" data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}>
                                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Manage drops
                                </Link>
                            )}
                            <Link href={CREATOR_SETTINGS_ROUTE} className="flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/10 sm:min-h-10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
                                Creator settings
                            </Link>
                        </div>

                        {/* Dense Inbox Preview */}
                        {recentThread ? (
                            <Link href={`/dashboard/chat?thread=${recentThread.id}`} className="group relative flex w-full shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 transition-colors hover:bg-white/5 sm:w-[280px] sm:px-4 sm:py-3">
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

                    {settingsModuleError ? (
                        <HumanErrorNotice
                            descriptor={settingsModuleError.descriptor}
                            compact
                            onSubmitBug={() => settingsBugReporter.submit(settingsModuleError.descriptor, buildBugReportContext({
                                descriptor: settingsModuleError.descriptor,
                                route: "/api/creator/settings",
                                previousRoute: getSafePreviousRoute(),
                                extra: {
                                    manager: "creator_settings",
                                    surface: "creator_dashboard",
                                    route: "/api/creator/settings",
                                    source_component: "CreatorWorkspacePanel",
                                },
                            }))}
                        />
                    ) : null}

                    {!settingsModuleError && settingsSourceNotice ? (
                        <div
                            className="rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:px-4 sm:py-3 sm:text-sm"
                            data-creator-landing-source-state={settingsSourceNotice.state}
                            data-creator-landing-source-review="partial_safe"
                        >
                            <p className="font-bold text-amber-50">{settingsSourceNotice.title}</p>
                            <p className="mt-0.5 text-amber-100/85">{settingsSourceNotice.body}</p>
                        </div>
                    ) : null}

                    {moduleErrorEntries.length > 0 ? (
                        <div className="rounded-[1.1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 sm:px-4 sm:py-3 sm:text-sm">
                            {moduleErrorEntries.map(([module]) => `${moduleLabels[module]} could not load right now.`).join(" | ")}
                        </div>
                    ) : null}

                    <div className="grid gap-2 sm:gap-4 xl:grid-cols-[1fr_280px]">
                        <div
                            className="rounded-2xl border border-white/10 bg-black/45 p-3 sm:rounded-3xl sm:p-4"
                            data-creator-overview-module="compact_v1"
                            data-creator-dashboard-fans-source={fanCountSource}
                            data-creator-dashboard-content-scope="creator_owned_or_assigned"
                            data-creator-dashboard-public-visibility-separated="true"
                            data-creator-dashboard-overview-density="mobile_compact"
                        >
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <h3 className="flex items-center gap-2 text-sm font-black text-white">
                                    <Activity className="h-4 w-4 text-brand-purple" />
                                    Creator Overview
                                </h3>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-200">
                                    {overviewStatus}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {overviewMetrics.map((metric) => (
                                    <div
                                        key={metric.label}
                                        className="min-h-10 rounded-xl border border-white/5 bg-white/[0.04] px-2.5 py-2"
                                        data-creator-overview-metric={metric.label.toLowerCase().replaceAll(" ", "_")}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="truncate text-[11px] font-semibold text-gray-400">{metric.label}</p>
                                            {metric.tone === "action" ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
                                        </div>
                                        <p className="mt-0.5 truncate text-sm font-black text-white sm:text-base" data-creator-landing-unavailable-density="compact">{metric.value}</p>
                                        <p className="truncate text-[10px] text-gray-500">{metric.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Broadcasts Module */}
                        <div className="flex flex-col gap-2.5 sm:gap-3">
                            <div className="rounded-2xl border border-white/10 bg-black/40 p-3 sm:rounded-3xl sm:p-4" data-creator-broadcast-mobile-priority={broadcastSourceReady ? "ready" : "deferred"}>
                                <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-white sm:mb-3 sm:text-sm"><Megaphone className="h-3.5 w-3.5 text-brand-purple sm:h-4 sm:w-4" /> Quick Broadcast</h3>
                                {broadcastSourceReady ? (
                                    <>
                                        <textarea
                                            value={broadcastDraft}
                                            onChange={(event) => setBroadcastDraft(event.target.value.slice(0, 280))}
                                            rows={2}
                                            placeholder="Write a blast to all fans..."
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
                                    </>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
                                        Broadcasts unlock when creator stats finish loading.
                                    </div>
                                )}
                            </div>
                            
                            {/* Relevant Action Required Lists */}
                            {requests.length > 0 && (
                                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-3 sm:p-4">
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
                                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-3 sm:p-4" data-testid="creator-workspace-bookings">
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
                                    body="Bookings are not loading right now. Try again in a bit."
                                    tone="warning"
                                    data-testid="creator-workspace-bookings-warning"
                                />
                            ) : moduleState.bookings.status === "success" && bookings.length === 0 ? (
                                <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/25 p-3 text-xs text-gray-300 sm:p-4 sm:text-sm" data-testid="creator-workspace-bookings-empty">
                                    No active phone or video bookings are hydrated right now.
                                </div>
                            ) : null}

                            {moduleErrors.subscriptions ? (
                                <UiContinuityNotice
                                    title="Subscriptions module degraded"
                                    body="Fan Pass subscribers are not loading right now. Try again in a bit."
                                    tone="warning"
                                    data-testid="creator-workspace-subscriptions-warning"
                                />
                            ) : (
                                <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-3 sm:p-4" data-testid="creator-workspace-subscriptions">
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
                                        <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 sm:py-3 sm:text-sm">
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

export function CreatorDashboardLandingRoute() {
    const { userProfile, loading } = useAuth();

    if (loading || !userProfile) {
        return (
            <div className="mx-auto w-full max-w-5xl px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+9rem)] sm:px-4 sm:pt-4 sm:pb-8" data-creator-landing-mobile-density="compact_v2">
                <div className="h-24 rounded-2xl bg-white/5 sm:h-36" />
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-[72px] rounded-xl bg-white/5 sm:h-32 sm:rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <main
            className="mx-auto w-full max-w-5xl px-3 pt-3 sm:px-4 sm:pt-4"
            data-creator-dashboard-route="landing"
            data-creator-dashboard-landing-density="mobile_compact"
            data-creator-landing-mobile-density="compact_v2"
            data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}
            data-creator-landing-error-language="human"
            data-bottom-nav-safe="true"
            data-report-issue-safe-offset="bottom-nav"
        >
            <CreatorWorkspacePanel userProfile={userProfile} />
        </main>
    );
}
