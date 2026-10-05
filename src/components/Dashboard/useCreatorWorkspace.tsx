"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { useAdminViewAs } from "@/context/AdminViewAsContext";

import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { describeCreatorFacingOnboardingBlockingReason, getCreatorOnboardingStatusSummary } from "@/lib/creator-onboarding";

import { buildBugReportContext, getSafePreviousRoute, resolveClientActionError } from "@/lib/errors/client-error-adapter";
import { loadUiContinuityModules, readUiJson, type UiContinuityModuleState } from "@/lib/ui-continuity";
import type { CreatorApplication, UserProfile } from "@/types/db";

import { type CreatorRunwayFact } from "@/components/creative-tim/kandydrops/creator/CreatorOperatingRunway";

import { DEFAULT_MODULE_STATE, formatDashboardMetric, formatFollowerSourceDetail, type CreatorBookingRecord, type CreatorRequestRecord, type CreatorSettingsSourceSummary, type CreatorStats, type CreatorSubscriptionRecord, type CreatorThreadRecord, type ModuleKey } from "./creator-workspace/types";

export function useCreatorWorkspace({ userProfile }: { userProfile: UserProfile }) {
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
const runwayFacts: CreatorRunwayFact[] = [
        { label: "Balance", value: creatorStats ? `${formatDashboardMetric(creatorStats.earningsGd)} GD` : "Unavailable", detail: creatorStats ? `$${cashValueUsd} value` : "Value unavailable" },
        { label: "Action needed", value: creatorStats ? formatDashboardMetric(actionNeededCount) : "Unavailable", detail: "Requests, bookings, messages" },
        { label: "Followers", value: formatDashboardMetric(creatorStats?.followerCount), detail: formatFollowerSourceDetail(fanCountSource) },
        { label: "Content views", value: formatDashboardMetric(creatorStats?.profileViewsCount), detail: "Views tracked separately" },
        { label: "Content", value: formatDashboardMetric(creatorContentCount), detail: "Owned or assigned drops" },
        { label: "Messages", value: formatDashboardMetric(unreadMessagesCount), detail: "Unread" },
        { label: "Requests", value: formatDashboardMetric(creatorStats?.openRequests), detail: "Open" },
        { label: "Bookings", value: formatDashboardMetric(creatorStats?.bookedCalls), detail: "Booked" },
        { label: "Fan Pass", value: formatDashboardMetric(creatorStats?.activeSubscribers), detail: "Active" },
    ];
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
return { creatorApplication, isCreatorOperator, isProjectionMode, projectionDisplayName, hasCreatorWorkspace, settingsSourceNotice, requests, bookings, subscriptions, moduleErrors, moduleState, busyAction, broadcastDraft, setBroadcastDraft, onboardingSummary, blockingReasons, moduleErrorEntries, settingsModuleError, handleRequestAction, handleBookingAction, handleBroadcastSend, actionNeededCount, broadcastCapabilitySource, broadcastSourceReady, overviewStatus, runwayFacts, submitSettingsBug };
}
