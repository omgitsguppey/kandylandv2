"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth } from "@/context/AuthContext";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import {
    describeCreatorFacingOnboardingBlockingReason,
    getCreatorOnboardingStatusSummary,
} from "@/lib/creator-onboarding";
import { CREATOR_DROP_ROUTE_STATE } from "@/lib/creator-profile-routing";
import { buildBugReportContext, getSafePreviousRoute, resolveClientActionError } from "@/lib/errors/client-error-adapter";
import { loadUiContinuityModules, readUiJson, type UiContinuityModuleState } from "@/lib/ui-continuity";
import type { CreatorApplication, UserProfile } from "@/types/db";
import { CreatorActionQueuePanel } from "./creator-workspace/CreatorActionQueuePanel";
import { CreatorBroadcastCard } from "./creator-workspace/CreatorBroadcastCard";
import { CreatorDashboardOverviewModule, type CreatorOverviewMetric } from "./creator-workspace/CreatorDashboardOverviewModule";
import { CreatorDashboardQuickActions } from "./creator-workspace/CreatorDashboardQuickActions";
import { CreatorDashboardSourceNotice, CreatorWorkspaceStatusPill } from "./creator-workspace/CreatorDashboardSourceNotice";
import { CreatorFanPassCrmPanel } from "./creator-workspace/CreatorFanPassCrmPanel";
import {
    DEFAULT_MODULE_STATE,
    formatDashboardMetric,
    formatFollowerSourceDetail,
    type CreatorBookingRecord,
    type CreatorRequestRecord,
    type CreatorSettingsSourceSummary,
    type CreatorStats,
    type CreatorSubscriptionRecord,
    type CreatorThreadRecord,
    type ModuleKey,
} from "./creator-workspace/types";
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
                    body: JSON.stringify({ message: broadcastDraft.trim(), audience: "followers" }),
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
    const broadcastCapabilitySource = moduleState.settings.status === "success" ? "settings_route" : "unavailable";
    const broadcastSourceReady = Boolean(creatorStats) && broadcastCapabilitySource === "settings_route" && !settingsModuleError;
    const creatorContentCount = creatorStats?.contentCount ?? creatorStats?.liveDropsCount;
    const fanCountSource = creatorStatsEvidence?.fanCountSource ?? "unavailable";
    const overviewStatus = settingsSourceNotice
        ? settingsSourceNotice.state === "not_configured" ? "Setup needed" : "Partial source"
        : creatorStats ? "Live" : "Loading";
    const overviewMetrics: CreatorOverviewMetric[] = [
        { label: "Balance", value: creatorStats ? `${formatDashboardMetric(creatorStats.earningsGd)} GD` : "Unavailable", detail: creatorStats ? `$${cashValueUsd} value` : "Value unavailable", tone: "brand" },
        { label: "Action needed", value: creatorStats ? formatDashboardMetric(actionNeededCount) : "Unavailable", detail: "Requests, bookings, messages", tone: "action" },
        { label: "Followers", value: formatDashboardMetric(creatorStats?.followerCount), detail: formatFollowerSourceDetail(fanCountSource), tone: "neutral" },
        { label: "Content views", value: formatDashboardMetric(creatorStats?.profileViewsCount), detail: "Views tracked separately", tone: "muted" },
        { label: "Content", value: formatDashboardMetric(creatorContentCount), detail: "Owned or assigned drops", tone: "neutral" },
        { label: "Messages", value: formatDashboardMetric(unreadMessagesCount), detail: "Unread", tone: "muted" },
        { label: "Requests", value: formatDashboardMetric(creatorStats?.openRequests), detail: "Open", tone: "muted" },
        { label: "Bookings", value: formatDashboardMetric(creatorStats?.bookedCalls), detail: "Booked", tone: "muted" },
        { label: "Fan Pass", value: formatDashboardMetric(creatorStats?.activeSubscribers), detail: "Active", tone: "muted" },
    ];
    const recentThread = threads.length > 0 ? threads[0] : null;
    const submitSettingsBug = (error: NonNullable<typeof settingsModuleError>) => {
        settingsBugReporter.submit(error.descriptor, buildBugReportContext({
            descriptor: error.descriptor,
            route: "/api/creator/settings",
            previousRoute: getSafePreviousRoute(),
            extra: {
                manager: "creator_settings",
                surface: "creator_dashboard",
                route: "/api/creator/settings",
                source_component: "CreatorWorkspacePanel",
            },
        }));
    };

    return (
        <section
            className="mb-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+9rem)] sm:pt-0 md:mb-8 md:pb-0"
            data-creator-dashboard-content-boundary="creator_only"
            data-creator-dashboard-landing-density="mobile_compact"
            data-creator-landing-mobile-density="compact_v2"
            data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}
            data-creator-landing-error-language="human"
            data-user-dashboard-modules-rendered="false"
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
                        <CreatorWorkspaceStatusPill label="Read-only" tone="warn" />
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
                            <CreatorWorkspaceStatusPill label={onboardingSummary.stage} tone={creatorApplication?.approvalStatus === "creator_approved" ? "good" : blockingReasons.length > 0 ? "warn" : "neutral"} />
                            {creatorApplication?.readyForApproval ? <CreatorWorkspaceStatusPill label="Ready" tone="good" /> : null}
                            {typeof creatorApplication?.queuePosition === "number" && creatorApplication.queuePosition > 0 ? (
                                <CreatorWorkspaceStatusPill label={`#${creatorApplication.queuePosition} in queue`} />
                            ) : null}
                            <Link href="/creators/waitlist" className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
                                View app
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    <CreatorDashboardQuickActions unreadMessagesCount={unreadMessagesCount} recentThread={recentThread} isProjectionMode={isProjectionMode} />

                    <CreatorDashboardSourceNotice
                        settingsModuleError={settingsModuleError}
                        settingsSourceNotice={settingsSourceNotice}
                        moduleErrorEntries={moduleErrorEntries}
                        onSubmitSettingsBug={submitSettingsBug}
                    />

                    <div className="grid gap-2 sm:gap-4 xl:grid-cols-[1fr_280px]">
                        <CreatorDashboardOverviewModule
                            metrics={overviewMetrics}
                            overviewStatus={overviewStatus}
                            fanCountSource={fanCountSource}
                        />

                        <div className="flex flex-col gap-2.5 sm:gap-3">
                            <CreatorBroadcastCard
                                broadcastDraft={broadcastDraft}
                                broadcastSourceReady={broadcastSourceReady}
                                broadcastCapabilitySource={broadcastCapabilitySource}
                                busy={busyAction === "broadcast:send"}
                                isProjectionMode={isProjectionMode}
                                onDraftChange={setBroadcastDraft}
                                onSend={handleBroadcastSend}
                            />
                            <CreatorActionQueuePanel
                                requests={requests}
                                bookings={bookings}
                                bookingsModuleError={moduleErrors.bookings}
                                bookingsModuleState={moduleState.bookings}
                                busyAction={busyAction}
                                isProjectionMode={isProjectionMode}
                                onRequestAction={handleRequestAction}
                                onBookingAction={handleBookingAction}
                            />
                            <CreatorFanPassCrmPanel
                                subscriptions={subscriptions}
                                subscriptionsModuleError={moduleErrors.subscriptions}
                            />
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
            data-dashboard-surface="creator_dashboard"
            data-creator-dashboard-route="landing"
            data-creator-dashboard-content-boundary="creator_only"
            data-creator-dashboard-landing-density="mobile_compact"
            data-creator-landing-mobile-density="compact_v2"
            data-create-drop-route-state={CREATOR_DROP_ROUTE_STATE}
            data-creator-landing-error-language="human"
            data-user-dashboard-modules-rendered="false"
            data-bottom-nav-safe="true"
            data-report-issue-safe-offset="bottom-nav"
        >
            <CreatorWorkspacePanel userProfile={userProfile} />
        </main>
    );
}
