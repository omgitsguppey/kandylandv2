"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Activity,
    Database,
    Loader2,
    Radio,
    ShieldAlert,
    Sparkles,
    Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";

import { useAuth } from "@/context/AuthContext";
import { useAdminAiAssistantRealtime } from "./hooks/useAdminAiAssistantRealtime";
import { useAdminDebugRealtime } from "./hooks/useAdminDebugRealtime";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useCompactViewport } from "@/hooks/useCompactViewport";

import { StatCard } from "./components/DebugPrimitives";
import { DebugTabNow } from "./components/DebugTabNow";
import { DebugTabActions } from "./components/DebugTabActions";
import { DebugTabMonitoring } from "./components/DebugTabMonitoring";
import { DebugTabInfrastructure } from "./components/DebugTabInfrastructure";
import { DebugTabAi } from "./components/DebugTabAi";
import { DebugTabAdvanced } from "./components/DebugTabAdvanced";
import type { AdminAiDebugSummary } from "@/lib/ai-debug-assistant";
import {
    ADMIN_DEBUG_DEFAULT_TAB,
    type AdminDebugRouteRuntimeFilter,
    type AdminDebugTabOption,
} from "@/lib/admin-debug-preferences";
import { filterAdminDebugRouteRuntimeHealth, buildAdminDebugRouteRuntimeRateSummary } from "@/lib/admin-debug-route-runtime";

import {
    getRouteRuntimeHealthCluster,
    getRouteRuntimeHealthCoverageState,
    summarizeRouteRuntimeHealth,
} from "@/lib/route-runtime-health";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { cn } from "@/lib/utils";

type DebugTabId = AdminDebugTabOption;

const DEBUG_TABS: Array<{ id: DebugTabId; label: string; icon: typeof Activity }> = [
    { id: "now", label: "Right now", icon: Activity },
    { id: "actions", label: "Action lane", icon: ShieldAlert },
    { id: "monitoring", label: "Monitoring", icon: Radio },
    { id: "infrastructure", label: "Infrastructure", icon: Database },
    { id: "ai", label: "AI", icon: Sparkles },
    { id: "advanced", label: "Advanced", icon: Terminal },
];

function formatRelative(timestamp?: number) {
    if (!timestamp) return "No recent activity";
    const deltaMs = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function formatWindowHours(windowMs?: number) {
    if (!windowMs) return "current";
    return `${Math.max(1, Math.round(windowMs / 3_600_000))}h`;
}

export default function DebugConsole() {
    const { user, userProfile } = useAuth();
    const isCompactViewport = useCompactViewport();
    const [processing, setProcessing] = useState(false);
    const [repairingId, setRepairingId] = useState<string | null>(null);
    const [simAmount, setSimAmount] = useState("500");
    const [activeTab, setActiveTab] = useState<DebugTabId>(ADMIN_DEBUG_DEFAULT_TAB);
    const [routeRuntimeFilter, setRouteRuntimeFilter] = useState<AdminDebugRouteRuntimeFilter>("all");
    const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
    const [aiAssistantModel, setAiAssistantModel] = useState("gemini-3.1-flash-lite-preview");
    const [savingAiAssistantSettings, setSavingAiAssistantSettings] = useState(false);
    const [savingDebugPreferences, setSavingDebugPreferences] = useState(false);
    const debugPreferencesHydratedRef = useRef(false);

    const { data, error, isLoading, mutate } = useAdminPollingSWR<any>("/api/admin/debug", 60000, {
        keepPreviousData: true,
        revalidateOnFocus: false,
    });

    const {
        clusteredWarnings,
        activeWarnings,
        historicalWarnings,
        routeHealth: realtimeRouteHealth,
        repairProposals: realtimeRepairProposals,
        queueHeartbeats: realtimeQueueHeartbeats
    } = useAdminDebugRealtime();
    const { data: debugPreferencesData, mutate: mutateDebugPreferences } = useAdminPollingSWR<any>("/api/admin/debug/preferences", 15000, {
        keepPreviousData: true,
        revalidateOnFocus: false,
    });
    const { data: aiDebugData, error: aiDebugError, mutate: mutateAiDebug } = useAdminPollingSWR<AdminAiDebugSummary>("/api/admin/debug/assistant", 15000, {
        keepPreviousData: true,
        revalidateOnFocus: false,
    });
    const { data: overviewData, isLoading: overviewLoading, mutate: mutateOverview } = useAdminOverview();

    useEffect(() => {
        const preferences = debugPreferencesData?.preferences;
        if (!preferences || debugPreferencesHydratedRef.current) {
            return;
        }

        debugPreferencesHydratedRef.current = true;
        if (typeof preferences.activeTab === "string") {
            setActiveTab(preferences.activeTab as DebugTabId);
        }
        if (typeof preferences.routeRuntimeFilter === "string") {
            setRouteRuntimeFilter(preferences.routeRuntimeFilter as AdminDebugRouteRuntimeFilter);
        }
    }, [debugPreferencesData?.preferences]);

    const persistDebugPreferences = useCallback(async (patch: {
        activeTab?: DebugTabId;
        routeRuntimeFilter?: AdminDebugRouteRuntimeFilter;
    }) => {
        setSavingDebugPreferences(true);
        try {
            const response = await authFetch("/api/admin/debug/preferences", {
                method: "PUT",
                body: JSON.stringify(patch),
            });
            const body = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(body.error || "Failed to save debug preferences.");
            }
            await mutateDebugPreferences();
        } catch (preferenceError) {
            reportClientIssue({
                channel: "runtime",
                severity: "warn",
                message: "Admin debug preferences save failed",
                error: preferenceError,
                detail: patch,
                consoleLabel: "[Admin Debug] preference save failed",
            });
            toast.error(preferenceError instanceof Error ? preferenceError.message : "Failed to save debug preferences.");
        } finally {
            setSavingDebugPreferences(false);
        }
    }, [mutateDebugPreferences]);

    const handleActiveTabChange = useCallback((nextTab: DebugTabId) => {
        setActiveTab(nextTab);
        void persistDebugPreferences({ activeTab: nextTab });
    }, [persistDebugPreferences]);

    const handleRouteRuntimeFilterChange = useCallback((nextFilter: AdminDebugRouteRuntimeFilter) => {
        setRouteRuntimeFilter(nextFilter);
        void persistDebugPreferences({ routeRuntimeFilter: nextFilter });
    }, [persistDebugPreferences]);

    const recentTransactions = useMemo(() => (
        (overviewData?.recentTransactions || []).map((entry: any) => ({
            ...entry,
            timestampLabel: typeof entry.timestamp === "number" && entry.timestamp > 0
                ? new Date(entry.timestamp).toLocaleString()
                : "Pending",
        }))
    ), [overviewData?.recentTransactions]);
    const panelLogWarnCount = useMemo(
        () => (data?.panelSystemLogs || []).filter((entry: any) => entry.status === "warn").length,
        [data?.panelSystemLogs],
    );
    const panelLogFailCount = useMemo(
        () => (data?.panelSystemLogs || []).filter((entry: any) => entry.status === "fail").length,
        [data?.panelSystemLogs],
    );
            const routeRuntimeHealth = realtimeRouteHealth;
    const filteredRouteRuntimeHealth = useMemo(
        () => filterAdminDebugRouteRuntimeHealth(routeRuntimeHealth, routeRuntimeFilter),
        [routeRuntimeHealth, routeRuntimeFilter],
    );
    const routeRuntimeHealthSummary = useMemo(
        () => summarizeRouteRuntimeHealth(routeRuntimeHealth),
        [routeRuntimeHealth],
    );
    const nativeChatRouteRuntimeHealth = useMemo(
        () => routeRuntimeHealth.filter((entry: any) => getRouteRuntimeHealthCluster(entry.key) === "native_chat"),
        [routeRuntimeHealth],
    );
    const compatibilityChatRouteRuntimeHealth = useMemo(
        () => routeRuntimeHealth.filter((entry: any) => getRouteRuntimeHealthCluster(entry.key) === "compatibility_chat"),
        [routeRuntimeHealth],
    );
    const nativeChatRouteRuntimeSummary = useMemo(
        () => summarizeRouteRuntimeHealth(nativeChatRouteRuntimeHealth),
        [nativeChatRouteRuntimeHealth],
    );
    const compatibilityChatRouteRuntimeSummary = useMemo(
        () => summarizeRouteRuntimeHealth(compatibilityChatRouteRuntimeHealth),
        [compatibilityChatRouteRuntimeHealth],
    );
    const nativeChatRouteRuntimeRates = useMemo(
        () => buildAdminDebugRouteRuntimeRateSummary(nativeChatRouteRuntimeHealth),
        [nativeChatRouteRuntimeHealth],
    );
    const compatibilityChatRouteRuntimeRates = useMemo(
        () => buildAdminDebugRouteRuntimeRateSummary(compatibilityChatRouteRuntimeHealth),
        [compatibilityChatRouteRuntimeHealth],
    );
    const queueJobHeartbeats = realtimeQueueHeartbeats;
    const runtimeWarnings = activeWarnings;
    const notificationDispatchOutcomes = useMemo(
        () => data?.notificationDispatchOutcomes || [],
        [data?.notificationDispatchOutcomes],
    );
    const queueRuntimeSummary = useMemo(
        () => data?.queueRuntimeSummary || {
            jobHeartbeats: { total: 0, stale: 0, failed: 0, running: 0 },
            warnings: { total: 0, failed: 0, degraded: 0, fallback: 0, legacyAdapterUses: 0, queueDriftWarnings: 0 },
            missingNotificationOutcomes: 0,
            recentOutcomes: 0,
        },
        [data?.queueRuntimeSummary],
    );
    const derivedActionCount = useMemo(
        () => (
            (data?.stats?.orchestrationActionableRepairs ?? 0)
            + panelLogWarnCount
            + panelLogFailCount
            + routeRuntimeHealthSummary.warn
            + routeRuntimeHealthSummary.fail
            + routeRuntimeHealthSummary.stale
            + queueRuntimeSummary.jobHeartbeats.stale
            + queueRuntimeSummary.jobHeartbeats.failed
            + queueRuntimeSummary.missingNotificationOutcomes
        ),
        [data?.stats?.orchestrationActionableRepairs, panelLogFailCount, panelLogWarnCount, queueRuntimeSummary.jobHeartbeats.failed, queueRuntimeSummary.jobHeartbeats.stale, queueRuntimeSummary.missingNotificationOutcomes, routeRuntimeHealthSummary.fail, routeRuntimeHealthSummary.stale, routeRuntimeHealthSummary.warn],
    );
    const freshestLoadedSignalAt = useMemo(() => {
        const timestamps = [
            ...recentTransactions.map((entry) => (typeof entry.timestamp === "number" ? entry.timestamp : 0)),
            ...(data?.panelSystemLogs || []).map((entry: any) => typeof entry.updatedAtMs === "number" ? entry.updatedAtMs : 0),
            ...routeRuntimeHealth.map((entry: any) => typeof entry.updatedAtMs === "number" ? entry.updatedAtMs : 0),
            ...queueJobHeartbeats.map((entry: any) => typeof entry.updatedAt === "number" ? entry.updatedAt : 0),
            ...runtimeWarnings.map((entry: any) => typeof entry.lastSeenAt === "number" ? entry.lastSeenAt : 0),
            ...notificationDispatchOutcomes.map((entry: any) => typeof entry.updatedAt === "number" ? entry.updatedAt : 0),
            ...(data?.opsHealth?.diagnostics?.recent || []).map((entry: any) => typeof entry.timestamp === "number" ? entry.timestamp : 0),
            aiDebugData?.generated_at ? Date.parse(aiDebugData.generated_at) : 0,
        ].filter((value) => Number.isFinite(value) && value > 0);

        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
    }, [aiDebugData?.generated_at, data?.opsHealth?.diagnostics?.recent, data?.panelSystemLogs, notificationDispatchOutcomes, queueJobHeartbeats, recentTransactions, routeRuntimeHealth, runtimeWarnings]);
    const overviewDependencyUpdatedAt = useMemo(() => {
        const timestamps = recentTransactions
            .map((entry) => (typeof entry.timestamp === "number" ? entry.timestamp : 0))
            .filter((value) => Number.isFinite(value) && value > 0);

        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
    }, [recentTransactions]);
    const routeRuntimeLaneUpdatedAt = useMemo(() => {
        const timestamps = routeRuntimeHealth
            .map((entry: any) => (typeof entry.updatedAtMs === "number" ? entry.updatedAtMs : 0))
            .filter((value: number) => Number.isFinite(value) && value > 0);

        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
    }, [routeRuntimeHealth]);
    const unseenRouteRuntimeCount = useMemo(
        () => routeRuntimeHealth.filter((entry: any) => getRouteRuntimeHealthCoverageState(entry) === "unseen").length,
        [routeRuntimeHealth],
    );
    const observedRouteRuntimeCount = Math.max(0, routeRuntimeHealthSummary.total - routeRuntimeHealthSummary.unobserved);
    const activePipelineFailureCount = data?.opsHealth?.pipeline?.activeFailureCount ?? 0;
    const recentPipelineFailureCount = data?.opsHealth?.pipeline?.recentFailureCount ?? 0;
    const sampledPipelineFailureCount = data?.opsHealth?.pipeline?.sampleFailureCount ?? data?.opsHealth?.pipeline?.failureCount ?? 0;
    const activeDiagnosticCount = (data?.opsHealth?.diagnostics?.activeErrorCount ?? 0) + (data?.opsHealth?.diagnostics?.activeWarnCount ?? 0);
    const recentDiagnosticCount = (data?.opsHealth?.diagnostics?.recentErrorCount ?? 0) + (data?.opsHealth?.diagnostics?.recentWarnCount ?? 0);
    const sampledDiagnosticCount = (data?.opsHealth?.diagnostics?.errorCount ?? 0) + (data?.opsHealth?.diagnostics?.warnCount ?? 0);

    useEffect(() => {
        if (!aiDebugData) {
            return;
        }

        setAiAssistantEnabled(aiDebugData.enabled !== false);
        setAiAssistantModel(aiDebugData.configured_model || aiDebugData.model || "gemini-3.1-flash-lite-preview");
    }, [aiDebugData]);
    const aiAssistantRealtime = useAdminAiAssistantRealtime(aiDebugData);

    const aiStatusLabel = aiDebugError
        ? "Unavailable"
        : !aiDebugData
            ? "Loading"
            : aiDebugData.enabled === false
                ? "Disabled"
                : aiDebugData.runtime_ready === false
                    ? "Unavailable"
                    : aiDebugData.fallback_used
                ? "Fallback"
                : "Live";
    const aiStatusTone: "neutral" | "good" | "warn" | "bad" = aiDebugError
        ? "bad"
        : !aiDebugData
            ? "neutral"
            : aiDebugData.enabled === false
                ? "warn"
                : aiDebugData.runtime_ready === false
                    ? "bad"
                    : aiDebugData.fallback_used
                ? "warn"
                : "good";

    const refreshAll = async () => {
        await Promise.all([mutate(), mutateOverview(), mutateAiDebug()]);
        toast.success("Debug console refreshed");
    };

    const handleManualBalanceAdjustment = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            const amount = Number.parseInt(simAmount, 10);
            const response = await authFetch("/api/admin/balance", {
                method: "POST",
                body: JSON.stringify({
                    userId: user.uid,
                    amount,
                    reason: `Debug Console Adjustment: +${amount}`,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Balance adjustment failed");
            toast.success("Balance updated");
            await mutateOverview();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin debug manual balance adjustment failed",
                error: issue,
                detail: {
                    action: "manual_balance_adjustment",
                    amount: simAmount,
                },
                consoleLabel: "[Admin Debug] manual balance adjustment failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Balance adjustment failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleRepairProposal = async (proposalId: string, action: "apply" | "dismiss") => {
        setRepairingId(proposalId);
        try {
            const response = await authFetch("/api/admin/orchestration/repairs", {
                method: "POST",
                body: JSON.stringify({ proposalId, action }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Repair action failed");
            }

            toast.success(action === "apply" ? "Repair action queued" : "Proposal dismissed");
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin debug repair action failed",
                error: issue,
                detail: {
                    action,
                    proposalId,
                },
                consoleLabel: "[Admin Debug] repair action failed",
            });
            toast.error(issue instanceof Error ? issue.message : "Repair action failed");
        } finally {
            setRepairingId(null);
        }
    };

    const handleSaveAiAssistantSettings = async () => {
        setSavingAiAssistantSettings(true);
        try {
            const response = await authFetch("/api/admin/debug/assistant", {
                method: "PUT",
                body: JSON.stringify({
                    enabled: aiAssistantEnabled,
                    model: aiAssistantModel.trim() || "gemini-3.1-flash-lite-preview",
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "AI assistant settings update failed");
            }

            toast.success("AI debug assistant settings saved");
            await mutateAiDebug();
            await mutate();
        } catch (issue) {
            reportClientIssue({
                channel: "ui",
                message: "Admin debug AI assistant settings save failed",
                error: issue,
                detail: {
                    action: "save_ai_debug_assistant_settings",
                    enabled: aiAssistantEnabled,
                    model: aiAssistantModel,
                },
                consoleLabel: "[Admin Debug] AI assistant settings save failed",
            });
            toast.error(issue instanceof Error ? issue.message : "AI assistant settings update failed");
        } finally {
            setSavingAiAssistantSettings(false);
        }
    };

    const renderTabControls = () => {
        return (
            <div className="flex w-full items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {DEBUG_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleActiveTabChange(tab.id)}
                            className={cn(
                                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                                active ? "border-brand-purple/40 bg-brand-purple/20 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <PageViewEvent eventName="admin_debug_viewed" />
            <AdminPageHeader
                eyebrow="Admin Debug"
                title="Debug Console"
                compact
                actions={(
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-500 uppercase tracking-widest">Live</span>
                    </div>
                )}
            />

            {renderTabControls()}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-1">
                <StatCard label="System Truth" value={data?.opsHealth?.canonicalState?.status || "--"} meta={data?.opsHealth?.canonicalState?.reason || "Awaiting canonical state"} truthState={!data && isLoading ? "loading" : error ? "failed" : data?.opsHealth?.canonicalState?.status === "healthy" ? "live" : "degraded"} />
                <StatCard label="Pipeline active" value={activePipelineFailureCount} meta={`recent ${recentPipelineFailureCount} | sample ${sampledPipelineFailureCount} | ${data?.opsHealth?.pipeline?.status === "healthy" ? `no current incident in ${formatWindowHours(data?.opsHealth?.pipeline?.activeWindowMs)}` : data?.opsHealth?.pipeline?.lastFailureAt ? `last ${formatRelative(data.opsHealth.pipeline.lastFailureAt)}` : "missing last-failure timestamp"}`} truthState={!data && isLoading ? "loading" : error ? "failed" : activePipelineFailureCount > 0 ? "failed" : recentPipelineFailureCount > 0 || sampledPipelineFailureCount > 0 ? "degraded" : "live"} />
                <StatCard label="Task-issue users" value={data?.stats?.usersWithTaskIssues ?? "--"} meta={`${data?.stats?.runtimeUsersWithRefreshIssues ?? 0} sampled refresh warnings`} truthState={!data && isLoading ? "loading" : error ? "failed" : (data?.stats?.usersWithTaskIssues ?? 0) > 0 || (data?.stats?.runtimeUsersWithRefreshIssues ?? 0) > 0 ? "degraded" : "live"} />
                <StatCard label="Creator issues" value={data?.stats?.creatorOnboardingIssues ?? "--"} meta={`${data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0} missing queue links`} truthState={!data && isLoading ? "loading" : error ? "failed" : (data?.stats?.creatorOnboardingIssues ?? 0) > 0 ? "degraded" : "live"} />
                <StatCard label="Open actions" value={derivedActionCount} meta={`${data?.stats?.orchestrationActionableRepairs ?? 0} proposals + ${panelLogWarnCount + panelLogFailCount} panel log issues + ${routeRuntimeHealthSummary.warn + routeRuntimeHealthSummary.fail + routeRuntimeHealthSummary.stale} route issues + ${queueRuntimeSummary.jobHeartbeats.stale + queueRuntimeSummary.jobHeartbeats.failed + queueRuntimeSummary.missingNotificationOutcomes} queue issues`} truthState={!data && isLoading ? "loading" : error ? "failed" : derivedActionCount > 0 ? "degraded" : "live"} />
                <StatCard label="Route health" value={routeRuntimeHealthSummary.total ? `${routeRuntimeHealthSummary.fail}/${routeRuntimeHealthSummary.warn}/${routeRuntimeHealthSummary.stale}` : "--"} meta={routeRuntimeHealthSummary.total ? `${routeRuntimeHealthSummary.total} tracked | ${observedRouteRuntimeCount} observed | ${routeRuntimeHealthSummary.unobserved} unseen (no sample yet)` : "no route rollups yet"} truthState={!data && isLoading ? "loading" : error ? "failed" : routeRuntimeHealthSummary.fail > 0 ? "failed" : routeRuntimeHealthSummary.warn > 0 || routeRuntimeHealthSummary.stale > 0 ? "degraded" : routeRuntimeHealthSummary.total > 0 ? "live" : "unavailable"} />
                <StatCard label="Freshest loaded sample" value={freshestLoadedSignalAt ? formatRelative(freshestLoadedSignalAt) : "--"} meta="derived from loaded diagnostics, panel logs, UI hydration reports, transactions, and AI status" truthState={!data && isLoading ? "loading" : error ? "failed" : freshestLoadedSignalAt ? "live" : "unavailable"} />
                <StatCard label="AI assistant" value={aiStatusLabel} meta={aiDebugData ? `${aiDebugData.configured_model} configured | ${aiAssistantRealtime.feedStatus} preflight lane | ${aiDebugData.runtime_ready ? "runtime ready" : "runtime unavailable"} | ${aiDebugData.latency_ms}ms` : aiDebugError ? "assistant unavailable" : "waiting for summary"} truthState={aiDebugData ? aiDebugData.runtime_ready ? "live" : "degraded" : aiDebugError ? "failed" : "loading"} />
            </div>

            {error ? <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">Debug data could not be loaded right now.</div> : null}
            {(isLoading || overviewLoading) && !data ? <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-6 text-sm text-gray-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading debug surfaces...</div> : null}

            {activeTab === "now" ? (
                <DebugTabNow
                    data={data}
                    isCompactViewport={isCompactViewport}
                    freshestLoadedSignalAt={freshestLoadedSignalAt}
                    activePipelineFailureCount={activePipelineFailureCount}
                    recentPipelineFailureCount={recentPipelineFailureCount}
                    sampledPipelineFailureCount={sampledPipelineFailureCount}
                    activeDiagnosticCount={activeDiagnosticCount}
                    recentDiagnosticCount={recentDiagnosticCount}
                    sampledDiagnosticCount={sampledDiagnosticCount}
                    panelLogWarnCount={panelLogWarnCount}
                    panelLogFailCount={panelLogFailCount}
                />
            ) : activeTab === "actions" ? (
                <DebugTabActions
                    data={data}
                    repairingId={repairingId}
                    processing={processing}
                    simAmount={simAmount}
                    onSimAmountChange={setSimAmount}
                    onRepairProposal={handleRepairProposal}
                    onManualBalanceAdjustment={handleManualBalanceAdjustment}
                />
            ) : activeTab === "monitoring" ? (
                <DebugTabMonitoring
                    data={data}
                    user={user}
                    userProfile={userProfile}
                    isCompactViewport={isCompactViewport}
                    routeRuntimeHealthSummary={routeRuntimeHealthSummary}
                    nativeChatRouteRuntimeSummary={nativeChatRouteRuntimeSummary}
                    compatibilityChatRouteRuntimeSummary={compatibilityChatRouteRuntimeSummary}
                    recentTransactions={recentTransactions}
                    queueRuntimeSummary={queueRuntimeSummary}
                    queueJobHeartbeats={queueJobHeartbeats}
                    runtimeWarnings={runtimeWarnings}
                    notificationDispatchOutcomes={notificationDispatchOutcomes}
                    routeRuntimeFilter={routeRuntimeFilter}
                    routeRuntimeHealth={routeRuntimeHealth}
                    filteredRouteRuntimeHealth={filteredRouteRuntimeHealth}
                    nativeChatRouteRuntimeHealth={nativeChatRouteRuntimeHealth}
                    nativeChatRouteRuntimeRates={nativeChatRouteRuntimeRates}
                    compatibilityChatRouteRuntimeHealth={compatibilityChatRouteRuntimeHealth}
                    compatibilityChatRouteRuntimeRates={compatibilityChatRouteRuntimeRates}
                    onRouteRuntimeFilterChange={handleRouteRuntimeFilterChange}
                />
            ) : activeTab === "infrastructure" ? (
                <DebugTabInfrastructure data={data} />
            ) : activeTab === "ai" ? (
                <DebugTabAi
                    aiDebugData={aiDebugData}
                    aiDebugError={aiDebugError}
                    aiStatusLabel={aiStatusLabel}
                    aiStatusTone={aiStatusTone}
                    aiAssistantEnabled={aiAssistantEnabled}
                    aiAssistantModel={aiAssistantModel}
                    aiAssistantRealtime={aiAssistantRealtime}
                    savingAiAssistantSettings={savingAiAssistantSettings}
                    onAiAssistantEnabledChange={setAiAssistantEnabled}
                    onAiAssistantModelChange={setAiAssistantModel}
                    onSaveAiAssistantSettings={handleSaveAiAssistantSettings}
                />
            ) : activeTab === "advanced" ? (
                <DebugTabAdvanced data={data} />
            ) : null}
        </div>
    );
}
