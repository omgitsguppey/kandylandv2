"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Activity,
    ChevronDown,
    ChevronUp,
    Loader2,
    Plus,
    Radio,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminTruthSurfaces } from '../AdminTruthSurfaces';
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import type { AdminAiDebugSummary } from "@/lib/ai-debug-assistant";
import {
    buildAdminUiChartHealthItem,
    getAdminUiChartHealthFreshness,
    summarizeAdminUiChartHealth,
} from "@/lib/admin-ui-chart-health";
import {
    ADMIN_DEBUG_DEFAULT_TAB,
    ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS,
    type AdminDebugRouteRuntimeFilter,
    type AdminDebugTabOption,
} from "@/lib/admin-debug-preferences";
import { filterAdminDebugRouteRuntimeHealth, buildAdminDebugRouteRuntimeRateSummary } from "@/lib/admin-debug-route-runtime";
import { CREATOR_MESSAGES_COMPATIBILITY_REMOVE_AFTER } from "@/lib/creator-message-compatibility";
import {
    getRouteRuntimeHealthCluster,
    getRouteRuntimeHealthCoverageState,
    getRouteRuntimeHealthFreshness,
    getRouteRuntimeHealthStatus,
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
    { id: "ai", label: "AI", icon: Sparkles },
    { id: "advanced", label: "Advanced", icon: Terminal },
];

function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}

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

function getPipelineStatusLabel(status?: string) {
    if (status === "fail") return "Active";
    if (status === "warn") return "Recent";
    return "Clear";
}

function getChartHealthStatusTone(status?: string) {
    if (status === "fail") return "bad" as const;
    if (status === "warn") return "warn" as const;
    return "good" as const;
}

function getFreshnessTone(state: "fresh" | "stale" | "unseen") {
    if (state === "fresh") return "good" as const;
    if (state === "stale") return "warn" as const;
    return "neutral" as const;
}

function compactNumber(value?: number) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function Pill({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "good" | "warn" | "bad" }) {
    const toneClassName = tone === "good"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : tone === "warn"
            ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
            : tone === "bad"
                ? "border-red-400/20 bg-red-500/10 text-red-100"
                : "border-white/10 bg-white/5 text-gray-200";

    return (
        <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneClassName)}>
            <span className="text-gray-400">{label}</span>
            <span className="font-semibold text-white">{value}</span>
        </div>
    );
}

function StatCard({ label, value, meta }: { label: string; value: string | number; meta?: string }) {
    return (
        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
            <div className="mt-1.5 text-[1.7rem] font-black text-white">{value}</div>
            {meta ? <p className="mt-1 text-[11px] text-gray-400">{meta}</p> : null}
        </div>
    );
}

function Section({
    title,
    subtitle,
    summary,
    defaultOpen,
    children,
}: {
    title: string;
    subtitle?: string;
    summary?: React.ReactNode;
    defaultOpen: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/25">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-start justify-between gap-3 px-3.5 py-3.5 text-left md:px-4"
                aria-expanded={open}
            >
                <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-white md:text-base">{title}</h2>
                    {subtitle ? <p className="mt-0.5 text-[11px] leading-5 text-gray-400 md:text-xs">{subtitle}</p> : null}
                    {summary ? <div className="mt-2.5 flex flex-wrap gap-2">{summary}</div> : null}
                </div>
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </button>
            {open ? <div className="border-t border-white/10 px-3.5 py-3.5 md:px-4">{children}</div> : null}
        </section>
    );
}

function ScrollWrap({ children }: { children: React.ReactNode }) {
    return <div className="max-h-[24rem] overflow-auto rounded-[1rem] border border-white/10 bg-black/25">{children}</div>;
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
    const [aiAssistantModel, setAiAssistantModel] = useState("gemini-2.5-flash-lite");
    const [savingAiAssistantSettings, setSavingAiAssistantSettings] = useState(false);
    const [savingDebugPreferences, setSavingDebugPreferences] = useState(false);
    const debugPreferencesHydratedRef = useRef(false);

    const { data, error, isLoading, mutate } = useAdminPollingSWR<any>("/api/admin/debug", 5000, {
        keepPreviousData: false,
    });
    const { data: debugPreferencesData, mutate: mutateDebugPreferences } = useAdminPollingSWR<any>("/api/admin/debug/preferences", 15000, {
        keepPreviousData: true,
    });
    const { data: aiDebugData, error: aiDebugError, mutate: mutateAiDebug } = useAdminPollingSWR<AdminAiDebugSummary>("/api/admin/debug/assistant", 15000, {
        keepPreviousData: true,
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
    const analyticsChartHealth = useMemo(
        () => data?.analyticsChartHealth || [],
        [data?.analyticsChartHealth],
    );
    const analyticsChartHealthSummary = useMemo(
        () => summarizeAdminUiChartHealth(analyticsChartHealth),
        [analyticsChartHealth],
    );
    const routeRuntimeHealth = useMemo(
        () => data?.routeRuntimeHealth || [],
        [data?.routeRuntimeHealth],
    );
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
    const queueJobHeartbeats = useMemo(
        () => data?.queueJobHeartbeats || [],
        [data?.queueJobHeartbeats],
    );
    const runtimeWarnings = useMemo(
        () => data?.runtimeWarnings || [],
        [data?.runtimeWarnings],
    );
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
            + analyticsChartHealthSummary.warn
            + analyticsChartHealthSummary.fail
            + routeRuntimeHealthSummary.warn
            + routeRuntimeHealthSummary.fail
            + routeRuntimeHealthSummary.stale
            + queueRuntimeSummary.jobHeartbeats.stale
            + queueRuntimeSummary.jobHeartbeats.failed
            + queueRuntimeSummary.missingNotificationOutcomes
        ),
        [analyticsChartHealthSummary.fail, analyticsChartHealthSummary.warn, data?.stats?.orchestrationActionableRepairs, panelLogFailCount, panelLogWarnCount, queueRuntimeSummary.jobHeartbeats.failed, queueRuntimeSummary.jobHeartbeats.stale, queueRuntimeSummary.missingNotificationOutcomes, routeRuntimeHealthSummary.fail, routeRuntimeHealthSummary.stale, routeRuntimeHealthSummary.warn],
    );
    const freshestLoadedSignalAt = useMemo(() => {
        const timestamps = [
            ...recentTransactions.map((entry) => (typeof entry.timestamp === "number" ? entry.timestamp : 0)),
            ...(data?.panelSystemLogs || []).map((entry: any) => typeof entry.updatedAtMs === "number" ? entry.updatedAtMs : 0),
            ...analyticsChartHealth.map((entry: any) => typeof entry.updatedAtMs === "number" ? entry.updatedAtMs : 0),
            ...routeRuntimeHealth.map((entry: any) => typeof entry.updatedAtMs === "number" ? entry.updatedAtMs : 0),
            ...queueJobHeartbeats.map((entry: any) => typeof entry.updatedAt === "number" ? entry.updatedAt : 0),
            ...runtimeWarnings.map((entry: any) => typeof entry.lastSeenAt === "number" ? entry.lastSeenAt : 0),
            ...notificationDispatchOutcomes.map((entry: any) => typeof entry.updatedAt === "number" ? entry.updatedAt : 0),
            ...(data?.opsHealth?.diagnostics?.recent || []).map((entry: any) => typeof entry.timestamp === "number" ? entry.timestamp : 0),
            aiDebugData?.generated_at ? Date.parse(aiDebugData.generated_at) : 0,
        ].filter((value) => Number.isFinite(value) && value > 0);

        return timestamps.length > 0 ? Math.max(...timestamps) : 0;
    }, [aiDebugData?.generated_at, analyticsChartHealth, data?.opsHealth?.diagnostics?.recent, data?.panelSystemLogs, notificationDispatchOutcomes, queueJobHeartbeats, recentTransactions, routeRuntimeHealth, runtimeWarnings]);
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
        setAiAssistantModel(aiDebugData.configured_model || aiDebugData.model || "gemini-2.5-flash-lite");
    }, [aiDebugData]);

    const debugSurfaceHealth = useMemo(() => ([
        buildAdminUiChartHealthItem({
            key: "debug.console_snapshot",
            title: "Debug console snapshot",
            page: "debug",
            category: "overview",
            source: "overview_snapshot",
            updatedAtMs: freshestLoadedSignalAt,
            hasLoaded: Boolean(data) || Boolean(error),
            loading: isLoading,
            hasData: Boolean(data),
            blockingIssues: error ? [error instanceof Error ? error.message : "Debug console snapshot failed to load."] : [],
            healthySummary: "Primary debug snapshot is loaded from the canonical admin debug route.",
            emptySummary: "The primary debug snapshot has not returned data yet.",
        }),
        buildAdminUiChartHealthItem({
            key: "debug.overview_dependency",
            title: "Overview dependency",
            page: "debug",
            category: "overview",
            source: "overview_snapshot",
            updatedAtMs: overviewDependencyUpdatedAt,
            hasLoaded: Boolean(overviewData) || !overviewLoading,
            loading: overviewLoading,
            hasData: Boolean(overviewData),
            healthySummary: "Admin overview dependency is loaded for recent transaction context.",
            emptySummary: "Admin overview dependency returned no data for the debug console.",
        }),
        buildAdminUiChartHealthItem({
            key: "debug.ai_assistant_summary",
            title: "AI assistant summary",
            page: "debug",
            category: "operations",
            source: "mixed_client_live",
            updatedAtMs: aiDebugData?.generated_at ? Date.parse(aiDebugData.generated_at) : 0,
            hasLoaded: Boolean(aiDebugData) || Boolean(aiDebugError),
            loading: !aiDebugData && !aiDebugError,
            hasData: Boolean(aiDebugData),
            blockingIssues: aiDebugError ? [aiDebugError instanceof Error ? aiDebugError.message : "AI debug assistant is unavailable."] : [],
            healthySummary: aiDebugData?.fallback_used
                ? "AI assistant summary is loaded through the deterministic fallback path."
                : "AI assistant summary is loaded from the live model path.",
            emptySummary: "AI assistant summary has not returned data yet.",
        }),
        buildAdminUiChartHealthItem({
            key: "debug.route_runtime_lane",
            title: "Route runtime lane",
            page: "debug",
            category: "operations",
            source: "overview_snapshot",
            updatedAtMs: routeRuntimeLaneUpdatedAt,
            hasLoaded: Boolean(data) || Boolean(error),
            loading: isLoading,
            hasData: routeRuntimeHealth.length > 0,
            backgroundIssues: [
                unseenRouteRuntimeCount > 0
                    ? `${unseenRouteRuntimeCount} tracked routes have not produced a runtime sample yet.`
                    : null,
                routeRuntimeHealthSummary.stale > 0
                    ? `${routeRuntimeHealthSummary.stale} tracked routes are stale and need a fresh sample.`
                    : null,
            ].filter((issue): issue is string => Boolean(issue)),
            healthySummary: `${routeRuntimeHealth.length} tracked routes are visible in the debug runtime lane.`,
            emptySummary: "No tracked route runtime entries are loaded yet.",
        }),
    ]), [
        aiDebugData,
        aiDebugError,
        data,
        error,
        freshestLoadedSignalAt,
        isLoading,
        overviewData,
        overviewDependencyUpdatedAt,
        overviewLoading,
        routeRuntimeHealth.length,
        routeRuntimeLaneUpdatedAt,
        routeRuntimeHealthSummary.stale,
        unseenRouteRuntimeCount,
    ]);
    useAdminUiChartHealthReporter(debugSurfaceHealth);
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
                    model: aiAssistantModel.trim() || "gemini-2.5-flash-lite",
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
        if (isCompactViewport) {
            return (
                <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Operator lane</label>
                    <select
                        value={activeTab}
                        onChange={(event) => handleActiveTabChange(event.target.value as DebugTabId)}
                        className="min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/40 px-3 text-sm font-semibold text-white"
                    >
                        {DEBUG_TABS.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                    </select>
                    {savingDebugPreferences ? <p className="mt-2 text-xs text-gray-500">Saving debug preference...</p> : null}
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-2">
                {DEBUG_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleActiveTabChange(tab.id)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                                active ? "border-brand-purple/40 bg-brand-purple/20 text-white" : "border-white/10 bg-white/5 text-gray-300"
                            )}
                        >
                            <Icon className="h-4 w-4" />
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
                    <Button variant="glass" onClick={refreshAll}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                )}
            />

            <AdminTruthSurfaces />

            {renderTabControls()}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-8">
                <StatCard label="Health score" value={data?.opsHealth ? `${data.opsHealth.score}%` : "--"} meta={`${data?.opsHealth?.diagnostics?.activeIssueClusterCount || 0} active issue clusters | ${getPipelineStatusLabel(data?.opsHealth?.pipeline?.status)} pipeline | ${data?.opsHealth?.materializerSummary?.warn ?? 0} warn / ${data?.opsHealth?.materializerSummary?.fail ?? 0} fail writers`} />
                <StatCard label="Pipeline active" value={activePipelineFailureCount} meta={`recent ${recentPipelineFailureCount} | sample ${sampledPipelineFailureCount} | ${data?.opsHealth?.pipeline?.status === "healthy" ? `no current incident in ${formatWindowHours(data?.opsHealth?.pipeline?.activeWindowMs)}` : data?.opsHealth?.pipeline?.lastFailureAt ? `last ${formatRelative(data.opsHealth.pipeline.lastFailureAt)}` : "missing last-failure timestamp"}`} />
                <StatCard label="Task-issue users" value={data?.stats?.usersWithTaskIssues ?? "--"} meta={`${data?.stats?.runtimeUsersWithRefreshIssues ?? 0} sampled refresh warnings`} />
                <StatCard label="Creator issues" value={data?.stats?.creatorOnboardingIssues ?? "--"} meta={`${data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0} missing queue links`} />
                <StatCard label="Open actions" value={derivedActionCount} meta={`${data?.stats?.orchestrationActionableRepairs ?? 0} proposals + ${panelLogWarnCount + panelLogFailCount} panel log issues + ${analyticsChartHealthSummary.warn + analyticsChartHealthSummary.fail} chart issues + ${routeRuntimeHealthSummary.warn + routeRuntimeHealthSummary.fail + routeRuntimeHealthSummary.stale} route issues`} />
                <StatCard label="Route health" value={routeRuntimeHealthSummary.total ? `${routeRuntimeHealthSummary.fail}/${routeRuntimeHealthSummary.warn}/${routeRuntimeHealthSummary.stale}` : "--"} meta={routeRuntimeHealthSummary.total ? `${routeRuntimeHealthSummary.total} tracked | ${observedRouteRuntimeCount} observed | ${routeRuntimeHealthSummary.unobserved} unseen (no sample yet)` : "no route rollups yet"} />
                <StatCard label="Freshest loaded sample" value={freshestLoadedSignalAt ? formatRelative(freshestLoadedSignalAt) : "--"} meta="derived from loaded diagnostics, panel logs, UI hydration reports, transactions, and AI status" />
                <StatCard label="AI assistant" value={aiStatusLabel} meta={aiDebugData ? `${aiDebugData.configured_model} configured | ${aiDebugData.runtime_ready ? "runtime ready" : "runtime unavailable"} | ${aiDebugData.latency_ms}ms` : aiDebugError ? "assistant unavailable" : "waiting for summary"} />
            </div>

            {error ? <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">Debug data could not be loaded right now.</div> : null}
            {(isLoading || overviewLoading) && !data ? <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-6 text-sm text-gray-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading debug surfaces...</div> : null}

            {activeTab === "now" ? (
                <div className="space-y-4">
                    <Section
                        title="System health now"
                        subtitle="Loaded health score, current diagnostics, and sampled pipeline freshness."
                        defaultOpen
                        summary={<><Pill label="Score" value={`${data?.opsHealth?.score ?? 0}%`} tone={(data?.opsHealth?.score ?? 0) >= 90 ? "good" : (data?.opsHealth?.score ?? 0) >= 70 ? "warn" : "bad"} /><Pill label="Pipeline" value={getPipelineStatusLabel(data?.opsHealth?.pipeline?.status)} tone={data?.opsHealth?.pipeline?.status === "fail" ? "bad" : data?.opsHealth?.pipeline?.status === "warn" ? "warn" : "good"} /><Pill label="Active diagnostics" value={(data?.opsHealth?.diagnostics?.activeErrorCount ?? 0) + (data?.opsHealth?.diagnostics?.activeWarnCount ?? 0)} tone={((data?.opsHealth?.diagnostics?.activeErrorCount ?? 0) + (data?.opsHealth?.diagnostics?.activeWarnCount ?? 0)) > 0 ? "warn" : "good"} /><Pill label="Writers" value={`${data?.opsHealth?.materializerSummary?.warn ?? 0}/${data?.opsHealth?.materializerSummary?.fail ?? 0}`} tone={((data?.opsHealth?.materializerSummary?.warn ?? 0) + (data?.opsHealth?.materializerSummary?.fail ?? 0)) > 0 ? "warn" : "good"} /><Pill label="Freshest loaded signal" value={freshestLoadedSignalAt ? formatRelative(freshestLoadedSignalAt) : "Not loaded"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Pipeline</p>
                                    <p className="mt-2 text-xl font-black text-white">{getPipelineStatusLabel(data?.opsHealth?.pipeline?.status)}</p>
                                    <p className="mt-1 text-sm text-gray-400">{data?.opsHealth?.pipeline?.status === "healthy" ? `No active incident in the last ${formatWindowHours(data?.opsHealth?.pipeline?.activeWindowMs)}.` : `Last failure ${formatRelative(data?.opsHealth?.pipeline?.lastFailureAt)}.`} Active ${activePipelineFailureCount}, recent ${recentPipelineFailureCount}, sample ${sampledPipelineFailureCount}.</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Diagnostics</p>
                                    <p className="mt-2 text-xl font-black text-white">{activeDiagnosticCount}</p>
                                    <p className="mt-1 text-sm text-gray-400">{data?.opsHealth?.diagnostics?.activeIssueClusterCount ?? 0} current issue clusters. Active {activeDiagnosticCount}, recent {recentDiagnosticCount}, sample {sampledDiagnosticCount}.</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Downstream writers</p>
                                    <p className="mt-2 text-xl font-black text-white">{(data?.opsHealth?.materializers || []).length}</p>
                                    <p className="mt-1 text-sm text-gray-400">Materializers tracked in this health slice. Warn {data?.opsHealth?.materializerSummary?.warn ?? 0}, fail {data?.opsHealth?.materializerSummary?.fail ?? 0}. Missing writers outside this slice are still possible.</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime warnings</p>
                                    <p className="mt-2 text-xl font-black text-white">{(data?.opsHealth?.runtime?.warnings || []).length}</p>
                                    <p className="mt-1 text-sm text-gray-400">Environment and runtime warnings from the current backend configuration check.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Top failing routes</p>
                                            <p className="mt-1 text-xs text-gray-400">Recent route failures from the loaded pipeline sample.</p>
                                        </div>
                                        <Pill label="Routes" value={(data?.opsHealth?.pipeline?.routes || []).length} tone={(data?.opsHealth?.pipeline?.routes || []).length ? "warn" : "good"} />
                                    </div>
                                    {(data?.opsHealth?.pipeline?.routes || []).length ? (
                                        <div className="mt-4 space-y-2">
                                            {(data?.opsHealth?.pipeline?.routes || []).slice(0, 6).map((route: any) => (
                                                <div key={route.routeKey} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                                                    <div>
                                                        <p className="font-semibold text-white">{route.label}</p>
                                                        <p className="text-xs text-gray-400">{route.routeKey}</p>
                                                    </div>
                                                    <Pill label="Failures" value={route.count} tone={route.count ? "warn" : "good"} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-sm text-emerald-100">No route failures are present in the loaded pipeline sample.</p>
                                    )}
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Degraded downstream writers</p>
                                            <p className="mt-1 text-xs text-gray-400">Only materializers tracked by the current health builder are represented here.</p>
                                        </div>
                                        <Pill label="Degraded" value={(data?.opsHealth?.materializers || []).filter((materializer: any) => materializer.status !== "healthy").length} tone={(data?.opsHealth?.materializers || []).some((materializer: any) => materializer.status !== "healthy") ? "warn" : "good"} />
                                    </div>
                                    {(data?.opsHealth?.materializers || []).length ? (
                                        <div className="mt-4 space-y-2">
                                            {(data?.opsHealth?.materializers || []).slice(0, 6).map((materializer: any) => (
                                                <div key={materializer.key} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold text-white">{materializer.label}</p>
                                                            <p className="text-xs text-gray-400">{materializer.engine}</p>
                                                        </div>
                                                        <Pill label="Status" value={materializer.status} tone={materializer.status === "healthy" ? "good" : materializer.status === "warn" ? "warn" : "bad"} />
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-300">{materializer.detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-sm text-gray-300">No downstream materializer sample is loaded right now.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Creator intake blockers"
                        subtitle="Live cross-checks between onboarding records, queue entries, and user projections."
                        defaultOpen={(data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0) > 0}
                        summary={<><Pill label="Issues" value={data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0} tone={(data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0) > 0 ? "warn" : "good"} /><Pill label="Missing queue" value={data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0} tone={(data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0) > 0 ? "bad" : "good"} /><Pill label="Role mismatch" value={data?.creatorOnboardingDiagnostics?.summary?.roleMismatchCount ?? 0} tone={(data?.creatorOnboardingDiagnostics?.summary?.roleMismatchCount ?? 0) > 0 ? "warn" : "good"} /></>}
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Missing queue links</p>
                                <p className="mt-2 text-xl font-black text-white">{data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0}</p>
                                <p className="mt-1 text-sm text-gray-400">Canonical onboarding exists but the roster review queue entry is missing.</p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Missing source records</p>
                                <p className="mt-2 text-xl font-black text-white">{(data?.creatorOnboardingDiagnostics?.summary?.missingSourceCount ?? 0) + (data?.creatorOnboardingDiagnostics?.summary?.projectionWithoutSourceCount ?? 0)}</p>
                                <p className="mt-1 text-sm text-gray-400">Queue or projection exists without a canonical onboarding record behind it.</p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Blocked in limbo</p>
                                <p className="mt-2 text-xl font-black text-white">{(data?.creatorOnboardingDiagnostics?.summary?.stuckAwaitingReviewCount ?? 0) + (data?.creatorOnboardingDiagnostics?.summary?.roleMismatchCount ?? 0)}</p>
                                <p className="mt-1 text-sm text-gray-400">Applicants waiting with no clear next state, or with approval and role state out of sync.</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                                <div>
                                    <p className="font-semibold text-white">Current creator onboarding issues</p>
                                    <p className="text-xs text-gray-400">Live backend mismatches from the current debug load.</p>
                                </div>
                                <Pill label="Rows" value={(data?.creatorOnboardingDiagnostics?.issues || []).length} />
                            </div>
                            <div className="divide-y divide-white/10">
                                {(data?.creatorOnboardingDiagnostics?.issues || []).length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-300">No creator onboarding anomalies are currently detected.</div>
                                ) : (
                                    (data?.creatorOnboardingDiagnostics?.issues || []).slice(0, 12).map((issue: any) => (
                                        <div key={`${issue.key}-${issue.userId}`} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{issue.message}</p>
                                                    <p className="text-xs text-gray-400">{issue.creatorDisplayName} · {issue.userId}</p>
                                                </div>
                                                <Pill label="Severity" value={issue.severity} tone={issue.severity === "error" ? "bad" : "warn"} />
                                            </div>
                                            <p className="text-sm text-gray-300">{issue.detail}</p>
                                            <a href={issue.link} className="text-xs font-semibold text-brand-purple hover:text-white">
                                                Open creator record
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Recent diagnostics and downstream writers"
                        subtitle="Recent diagnostics, route failures, and materializer freshness from the loaded sample."
                        defaultOpen={!isCompactViewport && ((data?.opsHealth?.diagnostics?.errorCount ?? 0) > 0 || (data?.opsHealth?.pipeline?.failureCount ?? 0) > 0)}
                        summary={<><Pill label="Channels" value={(data?.opsHealth?.diagnostics?.channels || []).length} /><Pill label="Recent diagnostics" value={(data?.opsHealth?.diagnostics?.recent || []).length} /><Pill label="Routes" value={(data?.opsHealth?.pipeline?.routes || []).length} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.opsHealth?.diagnostics?.channels || []).map((channel: any) => (
                                        <div key={channel.key} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{channel.label}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {formatRelative(channel.lastSeenAt)} | active {channel.activeErrorCount ?? 0} errors / {channel.activeWarnCount ?? 0} warns in {formatWindowHours(data?.opsHealth?.diagnostics?.activeWindowMs)}
                                                    </p>
                                                </div>
                                                <Pill
                                                    label="Current"
                                                    value={`${channel.activeErrorCount ?? 0}/${channel.activeWarnCount ?? 0}`}
                                                    tone={(channel.activeErrorCount ?? 0) > 0 ? "bad" : (channel.activeWarnCount ?? 0) > 0 ? "warn" : "good"}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Recent errors" value={channel.recentErrorCount ?? 0} tone={(channel.recentErrorCount ?? 0) > 0 ? "bad" : "good"} />
                                                <Pill label="Recent warns" value={channel.recentWarnCount ?? 0} tone={(channel.recentWarnCount ?? 0) > 0 ? "warn" : "good"} />
                                                <Pill label="Sample errors" value={channel.errorCount} tone={channel.errorCount ? "bad" : "good"} />
                                                <Pill label="Sample warns" value={channel.warnCount} tone={channel.warnCount ? "warn" : "good"} />
                                                <Pill label="Info" value={channel.infoCount} />
                                                <Pill label="Sample count" value={channel.count} />
                                            </div>
                                        </div>
                                    ))}
                                    {(data?.opsHealth?.pipeline?.routes || []).map((route: any) => (
                                        <div key={route.routeKey} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-white">{route.label}</p>
                                                <p className="text-xs text-gray-400">{route.routeKey}</p>
                                            </div>
                                            <Pill label="Failures" value={route.count} tone={route.count ? "warn" : "good"} />
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.opsHealth?.diagnostics?.recent || []).map((entry: any) => (
                                        <div key={entry.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.channel}</p>
                                                    <p className="text-xs text-gray-400">{formatTimestamp(entry.timestamp)}</p>
                                                </div>
                                                <Pill label="Severity" value={entry.severity} tone={entry.severity === "error" ? "bad" : entry.severity === "warn" ? "warn" : "neutral"} />
                                            </div>
                                            <p className="text-sm text-gray-200">{entry.message}</p>
                                            {entry.detailPreview ? <p className="text-xs text-gray-400">{entry.detailPreview}</p> : null}
                                        </div>
                                    ))}
                                    {(data?.opsHealth?.materializers || []).map((materializer: any) => (
                                        <div key={materializer.key} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{materializer.label}</p>
                                                    <p className="text-xs text-gray-400">{materializer.engine}</p>
                                                </div>
                                                <Pill label="Status" value={materializer.status} tone={materializer.status === "healthy" ? "good" : materializer.status === "warn" ? "warn" : "bad"} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Count" value={materializer.count} />
                                                <Pill label="Last seen" value={formatRelative(materializer.lastSeenAt)} />
                                            </div>
                                            <p className="text-sm text-gray-300">{materializer.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>

                    <Section
                        title="Panel status by section"
                        subtitle="Saved panel summaries with concrete next actions."
                        defaultOpen={(panelLogWarnCount + panelLogFailCount) > 0}
                        summary={<><Pill label="Panels" value={(data?.panelSystemLogs || []).length} /><Pill label="Warn" value={panelLogWarnCount} tone={panelLogWarnCount > 0 ? "warn" : "good"} /><Pill label="Fail" value={panelLogFailCount} tone={panelLogFailCount > 0 ? "bad" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.panelSystemLogs || []).map((entry: any) => (
                                    <div key={entry.id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.panelTitle}</p>
                                                <p className="text-xs text-gray-400">{entry.tab} | {formatRelative(entry.updatedAtMs)}</p>
                                            </div>
                                            <Pill label="Status" value={entry.status} tone={entry.status === "healthy" ? "good" : entry.status === "warn" ? "warn" : "bad"} />
                                        </div>
                                        <p className="text-sm text-gray-200">{entry.summary}</p>
                                        <p className="text-xs text-gray-400">{entry.action}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Signals" value={entry.signalCount ?? 0} tone={(entry.signalCount ?? 0) > 0 ? (entry.status === "fail" ? "bad" : "warn") : "good"} />
                                            {(entry.signalKeys || []).slice(0, 3).map((signalKey: string) => (
                                                <Pill key={`${entry.id}:${signalKey}`} label="Signal" value={signalKey} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(data?.panelSystemLogs || []).length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-gray-300">No persisted panel logs are loaded yet.</div>
                                ) : null}
                            </div>
                        </ScrollWrap>
                    </Section>
                </div>
            ) : null}

            {activeTab === "actions" ? (
                <div className="space-y-4">
                    <Section
                        title="Repairs available now"
                        subtitle="Open repair proposals that can be applied or dismissed."
                        defaultOpen={(data?.stats?.orchestrationActionableRepairs ?? 0) > 0}
                        summary={<><Pill label="Actionable" value={data?.stats?.orchestrationActionableRepairs ?? 0} tone={(data?.stats?.orchestrationActionableRepairs ?? 0) ? "warn" : "good"} /><Pill label="Contamination risks" value={data?.orchestration?.summary?.contaminationRisks ?? 0} tone={(data?.orchestration?.summary?.contaminationRisks ?? 0) ? "bad" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.orchestration?.proposals || []).length ? (data?.orchestration?.proposals || []).map((proposal: any) => (
                                    <div key={proposal.id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{proposal.label}</p>
                                                <p className="text-xs text-gray-400">{proposal.sourceDocumentPath}</p>
                                            </div>
                                            <Pill label="Status" value={proposal.status} tone={proposal.status === "open" ? "warn" : proposal.status === "resolved" ? "good" : "neutral"} />
                                        </div>
                                        <p className="text-sm text-gray-200">{proposal.detail}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="glass"
                                                size="sm"
                                                disabled={repairingId === proposal.id || proposal.actionType !== "rebuild_projection" || proposal.status !== "open"}
                                                onClick={() => handleRepairProposal(proposal.id, "apply")}
                                            >
                                                {repairingId === proposal.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Apply
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={repairingId === proposal.id || proposal.status !== "open"}
                                                onClick={() => handleRepairProposal(proposal.id, "dismiss")}
                                            >
                                                Dismiss
                                            </Button>
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No repair proposals are open in the current orchestration sample.</div>}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Bug reports to triage"
                        subtitle="Recent bug intake with severity, path, and diagnostic context."
                        defaultOpen={(data?.bugReports || []).length > 0}
                        summary={<><Pill label="Loaded" value={(data?.bugReports || []).length} /><Pill label="Last 7d" value={data?.stats?.bugReportsLast7d ?? 0} tone={(data?.stats?.bugReportsLast7d ?? 0) > 0 ? "warn" : "good"} /></>}
                    >
                        <div className="space-y-3">
                            {(data?.bugReports || []).length ? (data?.bugReports || []).map((report: any) => (
                                <div key={report.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-white">{report.summary || "Untitled bug report"}</p>
                                            <p className="mt-1 text-xs text-gray-400">{report.currentPath || "Unknown path"} | {report.componentName || "Unknown component"}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Status" value={report.status} />
                                            <Pill label="Severity" value={report.severity} tone={report.severity === "high" || report.severity === "critical" ? "bad" : report.severity === "medium" ? "warn" : "neutral"} />
                                        </div>
                                    </div>
                                    <p className="mt-3 line-clamp-3 text-sm text-gray-300">{report.message}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Breadcrumbs" value={report.breadcrumbsCount} />
                                        <Pill label="Diagnostics" value={report.diagnosticsCount} />
                                        <Pill label="Rollouts" value={report.rolloutCount} />
                                        <Pill label="When" value={formatRelative(report.timestamp)} />
                                    </div>
                                </div>
                            )) : <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">No bug reports are loaded in the current sample.</div>}
                        </div>
                    </Section>

                    <Section
                        title="Manual utilities (not live health)"
                        subtitle="Operator-triggered controls that stay separate from live diagnostics."
                        defaultOpen={false}
                        summary={<><Pill label="Balance adjust" value={`${simAmount} drops`} /></>}
                    >
                        <div className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                            Manual utilities can help unblock investigation, but they are not monitoring signals and they should not be read as system status.
                        </div>
                        <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Add Gum Drops to the current admin user</p>
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="number"
                                    className="min-h-11 flex-1 rounded-[1rem] border border-white/10 bg-black/40 px-3 text-white"
                                    value={simAmount}
                                    onChange={(event) => setSimAmount(event.target.value)}
                                />
                                <Button variant="brand" onClick={handleManualBalanceAdjustment} disabled={processing}>
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </Section>
                </div>
            ) : null}

            {activeTab === "monitoring" ? (
                <div className="space-y-4">
                    <Section
                        title="Tracked route runtime"
                        subtitle="Canonical route rollups for debug, overview, support, chat, creator relationships, and AI flows."
                        defaultOpen={routeRuntimeHealthSummary.fail > 0 || routeRuntimeHealthSummary.warn > 0 || routeRuntimeHealthSummary.stale > 0}
                        summary={<><Pill label="Tracked" value={routeRuntimeHealthSummary.total} /><Pill label="Filter" value={routeRuntimeFilter.replace("_", " ")} tone={routeRuntimeFilter === "all" ? "neutral" : "warn"} /><Pill label="Unseen" value={routeRuntimeHealthSummary.unobserved} tone={routeRuntimeHealthSummary.unobserved > 0 ? "warn" : "good"} /><Pill label="Stale" value={routeRuntimeHealthSummary.stale} tone={routeRuntimeHealthSummary.stale > 0 ? "warn" : "good"} /><Pill label="Warn" value={routeRuntimeHealthSummary.warn} tone={routeRuntimeHealthSummary.warn > 0 ? "warn" : "good"} /><Pill label="Fail" value={routeRuntimeHealthSummary.fail} tone={routeRuntimeHealthSummary.fail > 0 ? "bad" : "good"} /><Pill label="Slow samples" value={routeRuntimeHealthSummary.slow} tone={routeRuntimeHealthSummary.slow > 0 ? "warn" : "good"} /><Pill label="Native chat" value={`${nativeChatRouteRuntimeSummary.fail}/${nativeChatRouteRuntimeSummary.warn}/${nativeChatRouteRuntimeSummary.stale}`} tone={nativeChatRouteRuntimeSummary.fail > 0 ? "bad" : nativeChatRouteRuntimeSummary.warn > 0 || nativeChatRouteRuntimeSummary.stale > 0 ? "warn" : "good"} /><Pill label="Compat chat" value={`${compatibilityChatRouteRuntimeSummary.fail}/${compatibilityChatRouteRuntimeSummary.warn}/${compatibilityChatRouteRuntimeSummary.stale}`} tone={compatibilityChatRouteRuntimeSummary.fail > 0 ? "bad" : compatibilityChatRouteRuntimeSummary.warn > 0 || compatibilityChatRouteRuntimeSummary.stale > 0 ? "warn" : "good"} /></>}
                    >
                        <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_1fr_0.8fr]">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Pill label="Native chat error rate" value={nativeChatRouteRuntimeRates.errorRateLabel} tone={nativeChatRouteRuntimeRates.errorSamples > 0 ? "warn" : "good"} />
                                    <Pill label="Observed" value={nativeChatRouteRuntimeHealth.length - nativeChatRouteRuntimeRates.unseenCount} />
                                    <Pill label="Samples" value={nativeChatRouteRuntimeRates.totalSamples} />
                                </div>
                                <p className="mt-3 text-sm text-gray-300">
                                    Native chat routes currently show {nativeChatRouteRuntimeRates.errorSamples} error samples across {nativeChatRouteRuntimeRates.totalSamples} tracked samples.
                                </p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Pill label="Compat error rate" value={compatibilityChatRouteRuntimeRates.errorRateLabel} tone={compatibilityChatRouteRuntimeRates.errorSamples > 0 ? "warn" : "good"} />
                                    <Pill label="Observed" value={compatibilityChatRouteRuntimeHealth.length - compatibilityChatRouteRuntimeRates.unseenCount} />
                                    <Pill label="Samples" value={compatibilityChatRouteRuntimeRates.totalSamples} />
                                </div>
                                <p className="mt-3 text-sm text-gray-300">
                                    Compatibility traffic stays visible until the legacy creator-messages route is removed after {CREATOR_MESSAGES_COMPATIBILITY_REMOVE_AFTER}.
                                </p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Route filter</label>
                                <select
                                    value={routeRuntimeFilter}
                                    onChange={(event) => handleRouteRuntimeFilterChange(event.target.value as AdminDebugRouteRuntimeFilter)}
                                    className="min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/40 px-3 text-sm font-semibold text-white"
                                >
                                    {ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS.map((option) => (
                                        <option key={option} value={option}>
                                            {option === "all" ? "All tracked routes" : option === "failing" ? "Active failures" : option === "stale" ? "Stale only" : option === "unseen" ? "Unseen only" : option === "native_chat" ? "Native chat only" : "Compatibility chat only"}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-xs text-gray-500">
                                    Unseen means no sample recorded yet. Stale means the last sample is older than the runtime freshness window.
                                </p>
                            </div>
                        </div>
                        {filteredRouteRuntimeHealth.length > 0 ? (
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {filteredRouteRuntimeHealth.map((entry: any) => {
                                        const status = getRouteRuntimeHealthStatus(entry);
                                        const coverageState = getRouteRuntimeHealthCoverageState(entry);
                                        const freshness = getRouteRuntimeHealthFreshness(entry);
                                        return (
                                            <div key={entry.key} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.title}</p>
                                                        <p className="text-xs text-gray-400">{entry.routeName} | {entry.method} | {formatRelative(entry.updatedAtMs)}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Status" value={status} tone={status === "healthy" ? "good" : status === "fail" ? "bad" : "warn"} />
                                                        <Pill label="Coverage" value={coverageState} tone={coverageState === "observed" ? "good" : "warn"} />
                                                        <Pill label="Freshness" value={freshness} tone={freshness === "fresh" ? "good" : freshness === "stale" ? "warn" : "neutral"} />
                                                        <Pill label="Cluster" value={getRouteRuntimeHealthCluster(entry.key) === "native_chat" ? "native chat" : getRouteRuntimeHealthCluster(entry.key) === "compatibility_chat" ? "compatibility" : "other"} tone={getRouteRuntimeHealthCluster(entry.key) === "other" ? "neutral" : "warn"} />
                                                        <Pill label="Last result" value={entry.lastResult} tone={entry.lastResult === "success" ? "good" : entry.lastResult === "client_error" ? "warn" : "bad"} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Last latency" value={`${entry.lastLatencyMs ?? 0}ms`} tone={(entry.lastLatencyMs ?? 0) >= (entry.slowThresholdMs ?? 0) ? "warn" : "good"} />
                                                    <Pill label="Avg latency" value={`${entry.averageLatencyMs ?? 0}ms`} />
                                                    <Pill label="Max latency" value={`${entry.maxLatencyMs ?? 0}ms`} />
                                                    <Pill label="Success" value={entry.successCount ?? 0} tone="good" />
                                                    <Pill label="Client errors" value={entry.clientErrorCount ?? 0} tone={(entry.clientErrorCount ?? 0) > 0 ? "warn" : "good"} />
                                                    <Pill label="Server errors" value={entry.serverErrorCount ?? 0} tone={(entry.serverErrorCount ?? 0) > 0 ? "bad" : "good"} />
                                                    <Pill label="Slow" value={entry.slowCount ?? 0} tone={(entry.slowCount ?? 0) > 0 ? "warn" : "good"} />
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    {coverageState === "unseen"
                                                        ? "No runtime sample has been recorded for this route yet."
                                                        : freshness === "stale"
                                                            ? `Last sample ${formatRelative(entry.updatedAtMs)}. This route needs a fresh runtime sample before the lane can be treated as current.`
                                                            : `Slow threshold ${entry.slowThresholdMs ?? 0}ms. Last success ${formatRelative(entry.lastSuccessAtMs)}. Last server error ${formatRelative(entry.lastServerErrorAtMs)}.`}
                                                </p>
                                                {entry.lastErrorMessage ? <p className="text-sm text-amber-100">{entry.lastErrorMessage}</p> : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollWrap>
                        ) : (
                            <div className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                                {routeRuntimeHealth.length > 0
                                    ? `No route entries match the current "${routeRuntimeFilter.replace("_", " ")}" filter.`
                                    : "No tracked route rollups are loaded yet. Drive the creator follow, support inbox, or AI cover generation flows to populate this lane with real backend samples."}
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Recent transactions"
                        subtitle="Latest loaded commerce entries from the current bounded feed."
                        defaultOpen
                        summary={<><Pill label="Loaded" value={recentTransactions.length} /><Pill label="Feed window" value="Latest loaded entries" /></>}
                    >
                        <ScrollWrap>
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-black/80 text-[11px] uppercase tracking-[0.16em] text-gray-400">
                                    <tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Description</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {recentTransactions.map((entry: any) => (
                                        <tr key={entry.id}>
                                            <td className="px-3 py-3 text-gray-400">{entry.timestampLabel}</td>
                                            <td className="px-3 py-3 text-brand-purple">{entry.type}</td>
                                            <td className="px-3 py-3 text-white">{entry.amount}</td>
                                            <td className="px-3 py-3 text-gray-300">{entry.username ? `@${entry.username}` : entry.userId}</td>
                                            <td className="px-3 py-3 text-gray-400">{entry.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Queue runtime continuity"
                        subtitle="Canonical scheduler heartbeats, runtime warnings, and notification outcomes for queue lifecycle health."
                        defaultOpen={queueRuntimeSummary.jobHeartbeats.stale > 0 || queueRuntimeSummary.jobHeartbeats.failed > 0 || queueRuntimeSummary.missingNotificationOutcomes > 0 || queueRuntimeSummary.warnings.failed > 0}
                        summary={<><Pill label="Jobs" value={queueRuntimeSummary.jobHeartbeats.total} /><Pill label="Stale" value={queueRuntimeSummary.jobHeartbeats.stale} tone={queueRuntimeSummary.jobHeartbeats.stale > 0 ? "warn" : "good"} /><Pill label="Failed" value={queueRuntimeSummary.jobHeartbeats.failed} tone={queueRuntimeSummary.jobHeartbeats.failed > 0 ? "bad" : "good"} /><Pill label="Legacy adapter" value={queueRuntimeSummary.warnings.legacyAdapterUses} tone={queueRuntimeSummary.warnings.legacyAdapterUses > 0 ? "bad" : "good"} /><Pill label="Missing outcomes" value={queueRuntimeSummary.missingNotificationOutcomes} tone={queueRuntimeSummary.missingNotificationOutcomes > 0 ? "bad" : "good"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <div className="space-y-4">
                                <ScrollWrap>
                                    <div className="divide-y divide-white/10">
                                        {queueJobHeartbeats.map((entry: any) => (
                                            <div key={entry.jobId} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.jobId}</p>
                                                        <p className="text-xs text-gray-400">Last touch {formatRelative(entry.completedAt || entry.startedAt || entry.updatedAt)}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Status" value={entry.status} tone={entry.status === "failed" ? "bad" : entry.status === "warn" || entry.status === "running" ? "warn" : "good"} />
                                                        <Pill label="Scanned" value={entry.itemsScanned ?? 0} />
                                                        <Pill label="Changed" value={entry.itemsChanged ?? 0} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Duration" value={`${entry.durationMs ?? 0}ms`} />
                                                    <Pill label="Stale after" value={formatWindowHours(entry.staleAfterMs)} />
                                                    <Pill label="Warnings" value={(entry.warnings || []).length} tone={(entry.warnings || []).length > 0 ? "warn" : "good"} />
                                                </div>
                                                {entry.lastErrorCode ? <p className="text-sm text-amber-100">{entry.lastErrorCode}</p> : null}
                                            </div>
                                        ))}
                                        {queueJobHeartbeats.length === 0 ? <div className="px-4 py-4 text-sm text-amber-100">No queue scheduler heartbeats have been recorded yet.</div> : null}
                                    </div>
                                </ScrollWrap>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Warnings" value={queueRuntimeSummary.warnings.total} tone={queueRuntimeSummary.warnings.total > 0 ? "warn" : "good"} />
                                        <Pill label="Failed" value={queueRuntimeSummary.warnings.failed} tone={queueRuntimeSummary.warnings.failed > 0 ? "bad" : "good"} />
                                        <Pill label="Degraded" value={queueRuntimeSummary.warnings.degraded} tone={queueRuntimeSummary.warnings.degraded > 0 ? "warn" : "good"} />
                                        <Pill label="Fallback" value={queueRuntimeSummary.warnings.fallback} tone={queueRuntimeSummary.warnings.fallback > 0 ? "warn" : "good"} />
                                        <Pill label="Queue drift" value={queueRuntimeSummary.warnings.queueDriftWarnings} tone={queueRuntimeSummary.warnings.queueDriftWarnings > 0 ? "warn" : "good"} />
                                    </div>
                                    <p className="mt-3 text-sm text-gray-300">
                                        Legacy queue adapters are compatibility-only. Any adapter usage or missing dispatch outcome should be treated as blocking runtime continuity drift.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <ScrollWrap>
                                    <div className="divide-y divide-white/10">
                                        {runtimeWarnings.slice(0, 20).map((entry: any) => (
                                            <div key={entry.stable_id} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.code}</p>
                                                        <p className="text-xs text-gray-400">{entry.surface} | {entry.executionLayer} | {formatRelative(entry.lastSeenAt)}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Status" value={entry.status} tone={entry.status === "failed" ? "bad" : entry.status === "fallback" || entry.status === "degraded" ? "warn" : "good"} />
                                                        <Pill label="Count" value={entry.occurrenceCount ?? 0} />
                                                    </div>
                                                </div>
                                                {entry.detail?.message ? <p className="text-sm text-gray-300">{String(entry.detail.message)}</p> : null}
                                            </div>
                                        ))}
                                        {runtimeWarnings.length === 0 ? <div className="px-4 py-4 text-sm text-emerald-100">No persisted runtime warning records are active.</div> : null}
                                    </div>
                                </ScrollWrap>
                                <ScrollWrap>
                                    <div className="divide-y divide-white/10">
                                        {notificationDispatchOutcomes.slice(0, 20).map((entry: any) => (
                                            <div key={entry.stable_id} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.dropId}</p>
                                                        <p className="text-xs text-gray-400">{entry.activationKey} | {formatRelative(entry.updatedAt)}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Outcome" value={entry.status} tone={entry.status === "failed" ? "bad" : entry.status === "duplicate" ? "warn" : "good"} />
                                                        <Pill label="Error" value={entry.errorCode || "none"} tone={entry.errorCode ? "warn" : "good"} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {notificationDispatchOutcomes.length === 0 ? <div className="px-4 py-4 text-sm text-amber-100">No recent notification dispatch outcomes are loaded yet.</div> : null}
                                    </div>
                                </ScrollWrap>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Admin UI chart hydration"
                        subtitle="Latest client-reported health for admin dashboard, analytics, moderation, and debug surfaces."
                        defaultOpen={(analyticsChartHealthSummary.warn + analyticsChartHealthSummary.fail) > 0}
                        summary={<><Pill label="Reported" value={analyticsChartHealthSummary.total} /><Pill label="Warn" value={analyticsChartHealthSummary.warn} tone={analyticsChartHealthSummary.warn > 0 ? "warn" : "good"} /><Pill label="Fail" value={analyticsChartHealthSummary.fail} tone={analyticsChartHealthSummary.fail > 0 ? "bad" : "good"} /></>}
                    >
                        {analyticsChartHealth.length > 0 ? (
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {analyticsChartHealth.map((entry: any) => (
                                        <div key={entry.key} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.title}</p>
                                                    <p className="text-xs text-gray-400">{entry.page} | {entry.category} | {entry.source} | {formatRelative(entry.updatedAtMs)}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Status" value={entry.status} tone={getChartHealthStatusTone(entry.status)} />
                                                    <Pill label="Freshness" value={getAdminUiChartHealthFreshness(entry)} tone={getFreshnessTone(getAdminUiChartHealthFreshness(entry))} />
                                                    <Pill label="State" value={entry.hydrationState} tone={entry.hydrationState === "failed" ? "bad" : entry.hydrationState === "background_degraded" || entry.hydrationState === "empty" || entry.hydrationState === "loading" ? "warn" : "good"} />
                                                    <Pill label="Data" value={entry.hasData ? "Yes" : "No"} tone={entry.hasData ? "good" : "warn"} />
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-200">{entry.summary}</p>
                                            <p className="text-xs text-gray-400">{entry.action}</p>
                                            {Array.isArray(entry.issueMessages) && entry.issueMessages.length > 0 ? (
                                                <div className="space-y-1 text-xs text-amber-100">
                                                    {entry.issueMessages.slice(0, 3).map((issue: string) => (
                                                        <div key={`${entry.key}:${issue}`}>- {issue}</div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        ) : (
                            <div className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                                No admin UI chart reports are loaded yet. Open the admin overview and analytics pages to populate this lane with real client hydration state.
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Admin session and runtime prerequisites"
                        subtitle="Current admin identity plus the runtime prerequisites that affect debug behavior."
                        defaultOpen={false}
                        summary={<><Pill label="Role" value={userProfile?.role || "user"} tone="good" /><Pill label="GA property" value={data?.opsHealth?.runtime?.gaPropertyConfigured ? "Ready" : "Missing"} tone={data?.opsHealth?.runtime?.gaPropertyConfigured ? "good" : "warn"} /><Pill label="VAPID" value={data?.opsHealth?.runtime?.vapidConfigured ? "Yes" : "No"} tone={data?.opsHealth?.runtime?.vapidConfigured ? "good" : "warn"} /></>}
                    >
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="mb-4 text-sm text-gray-300">These checks describe the current admin session and a few runtime prerequisites used by debug/admin flows. They do not prove that all runtime dependencies are healthy everywhere else.</p>
                            <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4 text-sm text-gray-300">
                                    <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">User ID</span><span className="truncate font-mono text-xs text-white">{user?.uid || "--"}</span></div>
                                    <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">Email</span><span className="truncate text-white">{user?.email || "--"}</span></div>
                                    <div className="flex justify-between gap-3 border-b border-white/10 py-2"><span className="text-gray-400">Project</span><span className="truncate text-white">{data?.opsHealth?.runtime?.projectId || "--"}</span></div>
                                    <div className="flex justify-between gap-3 py-2"><span className="text-gray-400">Warnings</span><span className="text-white">{data?.opsHealth?.runtime?.warnings?.length || 0}</span></div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="VAPID" value={data?.opsHealth?.runtime?.vapidConfigured ? "Yes" : "No"} tone={data?.opsHealth?.runtime?.vapidConfigured ? "good" : "warn"} />
                                    <Pill label="Database URL" value={data?.opsHealth?.runtime?.databaseUrlConfigured ? "Ready" : "Missing"} tone={data?.opsHealth?.runtime?.databaseUrlConfigured ? "good" : "warn"} />
                                    <Pill label="Navigation signing" value={data?.opsHealth?.runtime?.navigationSessionSigningReady ? "Ready" : "Missing"} tone={data?.opsHealth?.runtime?.navigationSessionSigningReady ? "good" : "warn"} />
                                    {(data?.opsHealth?.runtime?.warnings || []).map((warning: string) => <Pill key={warning} label="Warning" value={warning} tone="warn" />)}
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Recent event flow"
                        subtitle="Derived recent events normalized from telemetry and backend signals."
                        defaultOpen={!isCompactViewport}
                        summary={<><Pill label="Events" value={data?.stats?.orchestrationEvents ?? 0} /><Pill label="Low confidence" value={data?.stats?.orchestrationLowConfidence ?? 0} tone={(data?.stats?.orchestrationLowConfidence ?? 0) ? "warn" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.orchestration?.events || []).map((event: any) => (
                                    <div key={event.id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{event.normalizedLabel}</p>
                                                <p className="text-xs text-gray-400">{event.domain} | {event.systemKey}</p>
                                            </div>
                                            <Pill label="Status" value={event.status} tone={event.status === "critical" ? "bad" : event.status === "attention" ? "warn" : "good"} />
                                        </div>
                                        <p className="text-sm text-gray-200">{event.humanSummary}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Actor" value={event.actor.actorLabel || event.actor.actorType} />
                                            <Pill label="Surface" value={event.session.sourceSurface || "background"} />
                                            <Pill label="Findings" value={event.findingCount} tone={event.findingCount ? "warn" : "good"} />
                                            <Pill label="Eval eligible" value={event.readiness.trainingEligible ? "yes" : "no"} tone={event.readiness.trainingEligible ? "good" : "warn"} />
                                        </div>
                                        {event.dependencyReadiness.missing?.length ? (
                                            <p className="text-xs text-gray-400">Missing inputs: {event.dependencyReadiness.missing.join(", ")}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Recent task activity sample"
                        subtitle="Recent task events and longer-tail rollups from the activity sample."
                        defaultOpen={false}
                        summary={<><Pill label="Recent events" value={(data?.recentTaskEvents || []).length} /><Pill label="Rollups" value={(data?.taskRollups || []).length} /><Pill label="Daily points" value={(data?.dailyTaskSeries || []).length} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.recentTaskEvents || []).map((event: any) => (
                                        <div key={event.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{event.title}</p>
                                                    <p className="text-xs text-gray-400">{event.triggerEvent}</p>
                                                </div>
                                                <Pill label={event.type} value={formatRelative(event.timestamp)} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="User" value={event.username} />
                                                <Pill label="Reward" value={event.reward} />
                                                <Pill label="Progress" value={`${event.progress}/${event.maxProgress}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.taskRollups || []).map((rollup: any) => (
                                        <div key={rollup.taskId} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{rollup.title}</p>
                                                    <p className="text-xs text-gray-400">Last event {formatRelative(rollup.lastEventAt)}</p>
                                                </div>
                                                <Pill label="Completed" value={rollup.completed} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Started" value={rollup.started} />
                                                <Pill label="Failed" value={rollup.failed} tone={rollup.failed ? "warn" : "good"} />
                                                <Pill label="Reminders" value={rollup.reminders} />
                                                <Pill label="Reward total" value={rollup.rewardTotal} />
                                            </div>
                                        </div>
                                    ))}
                                    {(data?.dailyTaskSeries || []).map((day: any) => (
                                        <div key={day.dayKey} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm text-gray-300">
                                            <span className="font-semibold text-white">{day.dayKey}</span>
                                            <Pill label="Events" value={day.eventCount} />
                                            <Pill label="Completed" value={day.completed} />
                                            <Pill label="Failed" value={day.failed} tone={day.failed ? "warn" : "good"} />
                                            <Pill label="Rewards" value={day.rewardTotal} />
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>

                    <Section
                        title="Recent receipts and dedupe sample"
                        subtitle="Recent receipts plus dedupe counters from the current sample."
                        defaultOpen={false}
                        summary={<><Pill label="Receipts 7d" value={data?.stats?.receiptsLast7d ?? 0} /><Pill label="Recent" value={(data?.recentReceipts || []).length} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.receiptSummary || []).map((receipt: any) => (
                                        <div key={receipt.eventName} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-white">{receipt.eventName}</p>
                                                <p className="text-xs text-gray-400">{formatTimestamp(receipt.lastSeenAt)}</p>
                                            </div>
                                            <Pill label="Count" value={receipt.count} />
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.recentReceipts || []).map((receipt: any) => (
                                        <div key={receipt.id} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{receipt.eventName}</p>
                                                    <p className="text-xs text-gray-400">{receipt.uid || "guest"} | {receipt.receiptKey}</p>
                                                </div>
                                                <Pill label="Source" value={receipt.source} />
                                            </div>
                                            <p className="text-xs text-gray-400">{formatTimestamp(receipt.timestamp)}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>
                </div>
            ) : null}

            {activeTab === "ai" ? (
                <div className="space-y-4">
                    <Section
                        title="AI debug assistant"
                        subtitle="Advisory summary over bounded canonical signals with labeled fallbacks."
                        defaultOpen
                        summary={<><Pill label="Status" value={aiStatusLabel} tone={aiStatusTone} /><Pill label="Enabled" value={aiDebugData?.enabled === false ? "No" : "Yes"} tone={aiDebugData?.enabled === false ? "warn" : "good"} /><Pill label="Configured model" value={aiDebugData?.configured_model || aiAssistantModel || "gemini-2.5-flash-lite"} /><Pill label="Runtime" value={aiDebugData?.runtime_ready ? "Ready" : "Unavailable"} tone={aiDebugData?.runtime_ready ? "good" : "bad"} /><Pill label="Last run" value={aiDebugData?.generated_at ? formatRelative(Date.parse(aiDebugData.generated_at)) : "Not recorded"} /><Pill label="Latency" value={aiDebugData ? `${aiDebugData.latency_ms}ms` : "--"} tone={aiDebugData && aiDebugData.latency_ms > 5000 ? "warn" : "neutral"} /></>}
                    >
                        {aiDebugError ? (
                            <div className="rounded-[1rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                                AI debug summaries could not be loaded right now. Canonical diagnostics remain authoritative.
                            </div>
                        ) : null}

                        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime config</p>
                                        <p className="mt-2 text-sm text-gray-300">Admin settings are now the primary enablement control. Runtime readiness is still gated by Vertex project and credentials.</p>
                                    </div>
                                    <Pill label="Resolved" value={aiDebugData?.model || aiAssistantModel || "gemini-2.5-flash-lite"} tone={aiStatusTone} />
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Configured model</p>
                                        <p className="mt-2 text-sm font-semibold text-white">{aiDebugData?.configured_model || aiAssistantModel || "gemini-2.5-flash-lite"}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime status</p>
                                        <p className="mt-2 text-sm font-semibold text-white">{aiDebugData?.runtime_ready ? "Ready" : "Unavailable"}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Project</p>
                                        <p className="mt-2 break-all text-sm font-semibold text-white">{aiDebugData?.runtime_project || "Missing"}</p>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Location</p>
                                        <p className="mt-2 text-sm font-semibold text-white">{aiDebugData?.runtime_location || "Missing"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Assistant controls</p>
                                <div className="mt-4 space-y-4">
                                    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">Enabled</p>
                                            <p className="mt-1 text-xs text-gray-400">Turns live assistant generation on or off without hiding the fallback truth surface.</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={aiAssistantEnabled}
                                            onChange={(event) => setAiAssistantEnabled(event.target.checked)}
                                            className="h-5 w-5 rounded border-white/20 bg-black/40 text-brand-purple"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-white">Configured model</span>
                                        <input
                                            type="text"
                                            value={aiAssistantModel}
                                            onChange={(event) => setAiAssistantModel(event.target.value)}
                                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-brand-purple/40"
                                            spellCheck={false}
                                        />
                                        <span className="mt-2 block text-xs text-gray-400">Default stays on the flash-lite alias unless you deliberately override it.</span>
                                    </label>
                                    <Button variant="glass" onClick={handleSaveAiAssistantSettings} disabled={savingAiAssistantSettings}>
                                        {savingAiAssistantSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Save assistant settings
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {aiDebugData ? (
                            <div className="space-y-4">
                                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">What it found</p>
                                        <p className="mt-3 text-sm leading-6 text-gray-200">{aiDebugData.summary}</p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Pill label="Source" value={aiDebugData.fallback_used ? "Deterministic fallback" : "Live model"} tone={aiDebugData.fallback_used ? "warn" : "good"} />
                                            <Pill label="Prompt" value={aiDebugData.prompt_version} />
                                            <Pill label="Generated" value={formatTimestamp(Date.parse(aiDebugData.generated_at))} />
                                            <Pill label="Runtime" value={aiDebugData.runtime_ready ? "Ready" : "Unavailable"} tone={aiDebugData.runtime_ready ? "good" : "bad"} />
                                        </div>
                                        {aiDebugData.availability_note ? (
                                            <p className="mt-3 text-xs leading-6 text-gray-400">{aiDebugData.availability_note}</p>
                                        ) : null}
                                    </div>
                                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">What to do next</p>
                                        <ul className="mt-3 space-y-2 text-sm text-gray-200">
                                            {(aiDebugData.suggested_next_checks || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                        </ul>
                                    </div>
                                </div>

                                <details className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <summary className="cursor-pointer text-sm font-semibold text-white">Technical detail</summary>
                                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                        <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Likely root causes</p>
                                            <ul className="mt-3 space-y-2 text-sm text-gray-200">
                                                {(aiDebugData.likely_root_causes || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                            </ul>
                                        </div>
                                        <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Affected systems</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(aiDebugData.affected_systems || []).map((entry) => <Pill key={entry} label="System" value={entry} tone="warn" />)}
                                            </div>
                                        </div>
                                        <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Confidence notes</p>
                                            <ul className="mt-3 space-y-2 text-sm text-gray-200">
                                                {(aiDebugData.confidence_notes || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        ) : !aiDebugError ? (
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
                                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                                Preparing bounded AI debug summary...
                            </div>
                        ) : null}
                    </Section>
                </div>
            ) : null}

            {activeTab === "advanced" ? (
                <div className="space-y-4">
                    <Section
                        title="Behavior normalization internals"
                        subtitle="Derived coordination state covering events, open findings, and domain coverage."
                        defaultOpen={false}
                        summary={<><Pill label="Health" value={`${data?.orchestration?.summary?.score ?? 0}%`} tone={(data?.orchestration?.summary?.score ?? 0) >= 90 ? "good" : (data?.orchestration?.summary?.score ?? 0) >= 70 ? "warn" : "bad"} /><Pill label="Open findings" value={data?.orchestration?.summary?.openFindings ?? 0} tone={(data?.orchestration?.summary?.openFindings ?? 0) ? "warn" : "good"} /><Pill label="Actionable repairs" value={data?.orchestration?.summary?.actionableProposals ?? 0} tone={(data?.orchestration?.summary?.actionableProposals ?? 0) ? "warn" : "good"} /><Pill label="Low confidence" value={data?.orchestration?.summary?.lowConfidenceEvents ?? 0} tone={(data?.orchestration?.summary?.lowConfidenceEvents ?? 0) ? "warn" : "good"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard label="Normalized events" value={data?.orchestration?.summary?.eventCount ?? 0} meta="Recent derived event sample" />
                                    <StatCard label="Eval eligible" value={data?.orchestration?.summary?.trainingEligible ?? 0} meta={`${data?.orchestration?.summary?.lowConfidenceEvents ?? 0} low-confidence events`} />
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Dependency gaps</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Missing actor" value={data?.orchestration?.dependencyReadiness?.actorMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.actorMissingCount ?? 0) ? "warn" : "good"} />
                                        <Pill label="Missing session" value={data?.orchestration?.dependencyReadiness?.sessionMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.sessionMissingCount ?? 0) ? "warn" : "good"} />
                                        <Pill label="Missing route" value={data?.orchestration?.dependencyReadiness?.routeMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.routeMissingCount ?? 0) ? "warn" : "good"} />
                                        <Pill label="Missing creator" value={data?.orchestration?.dependencyReadiness?.creatorContextMissingCount ?? 0} tone={(data?.orchestration?.dependencyReadiness?.creatorContextMissingCount ?? 0) ? "warn" : "good"} />
                                    </div>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Coverage by domain</p>
                                    <div className="mt-3 space-y-2">
                                        {(data?.orchestration?.domainSummary || []).slice(0, 6).map((entry: any) => (
                                            <div key={entry.key} className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300">
                                                <span className="font-semibold text-white">{entry.key}</span>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Events" value={entry.eventCount} />
                                                    <Pill label="Open" value={entry.openFindingCount} tone={entry.openFindingCount ? "warn" : "good"} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {(data?.orchestration?.findings || []).slice(0, 4).map((finding: any) => (
                                    <div key={finding.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white">{finding.title}</p>
                                                <p className="mt-1 text-xs text-gray-400">{finding.domain} | {finding.systemKey}</p>
                                            </div>
                                            <Pill label="Severity" value={finding.severity} tone={finding.severity === "error" ? "bad" : finding.severity === "warn" ? "warn" : "neutral"} />
                                        </div>
                                        <p className="mt-3 text-sm text-gray-200">{finding.humanSummary}</p>
                                        <p className="mt-2 text-xs text-gray-400">{finding.fixSummary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Actor ownership and bleed risk"
                        subtitle="Per-actor summaries from the normalization layer."
                        defaultOpen={false}
                        summary={<><Pill label="Actors" value={(data?.orchestration?.actorSummaries || []).length} /><Pill label="Contamination risks" value={data?.orchestration?.summary?.contaminationRisks ?? 0} tone={(data?.orchestration?.summary?.contaminationRisks ?? 0) ? "bad" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.orchestration?.actorSummaries || []).map((actor: any) => (
                                    <div key={actor.id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{actor.actorLabel || actor.actorId || actor.actorType}</p>
                                                <p className="text-xs text-gray-400">{actor.actorType} | {actor.actorId || "anonymous"}</p>
                                            </div>
                                            <Pill label="Events" value={actor.eventCount} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Warnings" value={actor.warningCount} tone={actor.warningCount ? "warn" : "good"} />
                                            <Pill label="Critical" value={actor.criticalCount} tone={actor.criticalCount ? "bad" : "good"} />
                                            <Pill label="Bleed risk" value={actor.contaminationCount} tone={actor.contaminationCount ? "bad" : "good"} />
                                        </div>
                                        {actor.topDomains?.length ? <p className="text-xs text-gray-400">Domains: {actor.topDomains.join(", ")}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Task catalog coverage"
                        subtitle="Built-in task definitions, trigger source, and action path."
                        defaultOpen={false}
                        summary={<><Pill label="Built-in" value={data?.stats?.builtInTasks ?? 0} /><Pill label="Canonical" value={data?.stats?.canonicalTasks ?? 0} tone="good" /><Pill label="Telemetry" value={data?.stats?.telemetryValidatedTasks ?? 0} tone="good" /><Pill label="Unsupported" value={data?.stats?.unsupportedTasks ?? 0} tone={data?.stats?.unsupportedTasks ? "warn" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.coverage || []).map((task: any) => (
                                    <div key={task.taskId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{task.title}</p>
                                                <p className="text-xs text-gray-400">{task.taskId} | {task.eventLabel}</p>
                                            </div>
                                            <Pill label="Source" value={task.trackingSource} tone={task.trackingSource === "unsupported" ? "bad" : "good"} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Reward" value={task.reward} />
                                            <Pill label="Max" value={task.maxProgress} />
                                            <Pill label="Group" value={task.group} />
                                            <Pill label="Action" value={task.actionMode === "runtime" ? `${task.actionType} (runtime)` : `${task.actionType} (route)`} />
                                            {task.oneTime ? <Pill label="Mode" value="one-time" /> : null}
                                            {task.hasUniqueKey ? <Pill label="Keying" value="unique" /> : null}
                                            {task.hasCriteria ? <Pill label="Criteria" value="filtered" /> : null}
                                        </div>
                                        <p className="text-xs leading-6 text-gray-400">
                                            {task.actionLabel} {"->"} {task.destinationHref}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Task parity and Gum Drop guardrails"
                        subtitle="Task assignment issues, reward parity, and creator-spend guardrails in one view."
                        defaultOpen={false}
                        summary={<><Pill label="Affected users" value={data?.stats?.usersWithTaskIssues ?? 0} tone={data?.stats?.usersWithTaskIssues ? "warn" : "good"} /><Pill label="Reward delta 7d" value={data?.stats?.rewardEventDeltaLast7d ?? 0} tone={(data?.stats?.rewardEventDeltaLast7d ?? 0) === 0 ? "good" : "warn"} /><Pill label="Creator spend violations" value={data?.stats?.creatorSpendViolationsLast7d ?? 0} tone={(data?.stats?.creatorSpendViolationsLast7d ?? 0) === 0 ? "good" : "warn"} /></>}
                    >
                        <div className="mb-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Reward version" value={data?.taskRewardConfig?.rewardVersion ?? "--"} />
                                    <Pill label="Multiplier" value={`${data?.taskRewardConfig?.multiplierPercent ?? 0}%`} />
                                    <Pill label="Built-in avg" value={data?.taskRewardConfig?.builtInAverageReward ?? 0} />
                                    <Pill label="Legacy custom" value={data?.taskRewardConfig?.legacyRewardVersionCount ?? 0} tone={(data?.taskRewardConfig?.legacyRewardVersionCount ?? 0) === 0 ? "good" : "warn"} />
                                </div>
                                <p className="mt-3 text-xs leading-6 text-gray-400">
                                    Reward settings are normalized under one active version so built-ins, legacy custom tasks, receipts, and admin task tools stay aligned after economy tuning.
                                </p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Tracked creator spends" value={data?.creatorSpendParity?.trackedTransactions ?? 0} />
                                    <Pill label="Purchased spent" value={data?.creatorSpendParity?.totalPurchasedSpent ?? 0} />
                                    <Pill label="Reward spent" value={data?.creatorSpendParity?.totalRewardSpent ?? 0} tone={(data?.creatorSpendParity?.totalRewardSpent ?? 0) === 0 ? "good" : "warn"} />
                                    <Pill label="Amount mismatches" value={data?.creatorSpendParity?.amountMismatchCount ?? 0} tone={(data?.creatorSpendParity?.amountMismatchCount ?? 0) === 0 ? "good" : "warn"} />
                                </div>
                                <p className="mt-3 text-xs leading-6 text-gray-400">
                                    Creator chat, subscriptions, requests, and bookings are expected to consume purchased Gum Drops only. Reward-spend or amount mismatch remains a parity warning.
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.assignmentIssues || []).length ? (data?.assignmentIssues || []).map((issue: any) => (
                                        <div key={issue.uid} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{issue.username}</p>
                                                    <p className="text-xs text-gray-400">{issue.uid}</p>
                                                </div>
                                                <Pill label="Issues" value={issue.issueCount} tone="warn" />
                                            </div>
                                            <div className="flex flex-wrap gap-2">{(issue.taskIds || []).map((taskId: string) => <Pill key={taskId} label="Task" value={taskId} />)}</div>
                                            <div className="space-y-1 text-sm text-amber-100">{(issue.issues || []).map((entry: string) => <div key={entry}>- {entry}</div>)}</div>
                                        </div>
                                    )) : <div className="px-4 py-4 text-sm text-emerald-100">No assignment integrity issues were detected in the sampled users.</div>}
                                </div>
                            </ScrollWrap>
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.taskParity || []).map((entry: any) => (
                                        <div key={entry.taskId} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.title}</p>
                                                    <p className="text-xs text-gray-400">{entry.taskId}</p>
                                                </div>
                                                <Pill label="Completed" value={entry.completedCount} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Rewarded" value={entry.rewardedCount} tone={entry.completedCount !== entry.rewardedCount ? "warn" : "good"} />
                                                <Pill label="Receipts" value={entry.receiptCount} />
                                                <Pill label="Reward total" value={entry.rewardTotal} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                        </div>
                        {(data?.creatorSpendParity?.byType || []).length ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {(data?.creatorSpendParity?.byType || []).map((entry: any) => (
                                    <div key={entry.type} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">{entry.label}</p>
                                                <p className="text-xs text-gray-400">{entry.type}</p>
                                            </div>
                                            <Pill label="Count" value={entry.count} />
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Pill label="Purchased" value={entry.purchasedSpent} />
                                            <Pill label="Reward" value={entry.rewardSpent} tone={entry.rewardSpent ? "warn" : "good"} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </Section>

                    <Section
                        title="Runtime task sample and custom-task drift"
                        subtitle="Sampled runtime state from assignments, task events, receipts, reward claims, and rollups."
                        defaultOpen={false}
                        summary={<><Pill label="Sampled users" value={data?.runtimeTaskAudit?.summary?.sampledUsers ?? 0} /><Pill label="Assignments" value={data?.stats?.runtimeAssignedTasks ?? 0} /><Pill label="Custom assigned" value={data?.stats?.runtimeCustomAssignments ?? 0} tone={(data?.stats?.runtimeCustomAssignments ?? 0) > 0 ? "good" : "warn"} /><Pill label="Cooldown drift" value={data?.stats?.runtimeCooldownConflictUsers ?? 0} tone={(data?.stats?.runtimeCooldownConflictUsers ?? 0) === 0 ? "good" : "warn"} /><Pill label="Unsupported runtime" value={data?.stats?.runtimeUnsupportedTaskRecords ?? 0} tone={(data?.stats?.runtimeUnsupportedTaskRecords ?? 0) === 0 ? "good" : "warn"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.runtimeTaskAudit?.distribution || []).slice(0, 24).map((entry: any) => (
                                        <div key={entry.taskId} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.title}</p>
                                                    <p className="text-xs text-gray-400">{entry.taskId} | {entry.eventLabel}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Origin" value={entry.definitionOrigin} tone={entry.definitionOrigin === "custom" ? "warn" : "good"} />
                                                    <Pill label="Assigned users" value={entry.assignedUsers} />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Mode" value={entry.actionMode === "runtime" ? "runtime" : "route"} />
                                                <Pill label="Scope" value={entry.scope} />
                                                <Pill label="Claimed" value={entry.claimedAssignments} />
                                                <Pill label="Completed" value={entry.recentCompletedCount} />
                                                <Pill label="Rewards" value={entry.recentRewardClaimCount} tone={entry.recentCompletedCount !== entry.recentRewardClaimCount ? "warn" : "good"} />
                                                <Pill label="Cooldown" value={`${entry.cooldownDays}d`} />
                                                {entry.active === false ? <Pill label="Status" value="inactive" tone="warn" /> : null}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {entry.usersWithRefreshIssues ? <Pill label="Refresh issues" value={entry.usersWithRefreshIssues} tone="warn" /> : null}
                                                {entry.cooldownConflictUsers ? <Pill label="Cooldown drift" value={entry.cooldownConflictUsers} tone="warn" /> : null}
                                                {entry.recentReceiptCount ? <Pill label="Receipts" value={entry.recentReceiptCount} /> : null}
                                                {entry.rollupCompletedCount ? <Pill label="Rollup completed" value={entry.rollupCompletedCount} /> : null}
                                                {entry.eventStatTotalCount ? <Pill label="Event stats" value={compactNumber(entry.eventStatTotalCount)} /> : null}
                                            </div>
                                            {entry.driftReasons?.length ? (
                                                <div className="space-y-1 text-sm text-amber-100">
                                                    {entry.driftReasons.map((reason: string) => (
                                                        <div key={reason}>- {reason.replaceAll("_", " ")}</div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs leading-6 text-gray-400">
                                                    {entry.actionLabel} {"->"} {entry.destinationHref}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <div className="space-y-4">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Custom defs" value={data?.taskRewardConfig?.customTaskCount ?? 0} />
                                        <Pill label="Custom with assignments" value={data?.runtimeTaskAudit?.summary?.customDefinitionsWithAssignments ?? 0} />
                                        <Pill label="Custom drift" value={data?.stats?.runtimeCustomTaskDrift ?? 0} tone={(data?.stats?.runtimeCustomTaskDrift ?? 0) === 0 ? "good" : "warn"} />
                                        <Pill label="No runtime signal" value={data?.runtimeTaskAudit?.summary?.customDefinitionsWithoutRuntimeSignals ?? 0} />
                                    </div>
                                    <p className="mt-3 text-xs leading-6 text-gray-400">
                                        Custom and admin-authored tasks stay on the same runtime truth model as built-ins. This panel surfaces assignments, drift, reward visibility, cooldown pressure, and definitions that still exist only on paper.
                                    </p>
                                </div>
                                <ScrollWrap>
                                    <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                        {(data?.runtimeTaskAudit?.customDistribution || []).length ? (data?.runtimeTaskAudit?.customDistribution || []).map((entry: any) => (
                                            <div key={entry.taskId} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.title}</p>
                                                        <p className="text-xs text-gray-400">{entry.taskId}</p>
                                                    </div>
                                                    <Pill label="Assigned" value={entry.assignedUsers} tone={entry.assignedUsers > 0 ? "good" : "warn"} />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Scope" value={entry.scope} />
                                                    <Pill label="Tracking" value={entry.trackingSource} tone={entry.trackingSource === "unsupported" ? "bad" : "good"} />
                                                    {entry.targetUserId ? <Pill label="Target user" value={entry.targetUserId} /> : null}
                                                    {entry.oneTime ? <Pill label="Mode" value="one-time" /> : null}
                                                </div>
                                            </div>
                                        )) : <div className="px-4 py-4 text-sm text-emerald-100">No custom task definitions are present in the sampled runtime data.</div>}
                                    </div>
                                </ScrollWrap>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Task telemetry mapping"
                        subtitle="Canonical task facts, telemetry event stats, and shared-event ambiguity."
                        defaultOpen={false}
                        summary={<><Pill label="Alignment warnings" value={data?.stats?.telemetryAlignmentWarnings ?? 0} tone={(data?.stats?.telemetryAlignmentWarnings ?? 0) === 0 ? "good" : "warn"} /><Pill label="Shared events" value={data?.stats?.runtimeSharedEventMappings ?? 0} tone={(data?.stats?.runtimeSharedEventMappings ?? 0) === 0 ? "good" : "warn"} /><Pill label="Unsupported runtime" value={data?.stats?.runtimeUnsupportedTaskRecords ?? 0} tone={(data?.stats?.runtimeUnsupportedTaskRecords ?? 0) === 0 ? "good" : "warn"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                            <ScrollWrap>
                                <div className="divide-y divide-white/10">
                                    {(data?.runtimeTaskAudit?.telemetryAlignment || []).slice(0, 24).map((entry: any) => (
                                        <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.eventLabel}</p>
                                                    <p className="text-xs text-gray-400">{entry.eventName}</p>
                                                </div>
                                                <Pill label="Mapped tasks" value={entry.mappedTaskCount} tone={entry.mappedTaskCount ? "good" : "warn"} />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Built-in" value={entry.builtInTaskCount} />
                                                <Pill label="Custom" value={entry.customTaskCount} />
                                                <Pill label="Assigned" value={entry.runtimeAssignedCount} />
                                                <Pill label="Event stats" value={compactNumber(entry.eventStatTotalCount)} />
                                                <Pill label="Receipts" value={entry.recentReceiptCount} />
                                                <Pill label="Tracking" value={entry.trackingSource} tone={entry.trackingSource === "unsupported" ? "bad" : "good"} />
                                            </div>
                                            {entry.driftReasons?.length ? (
                                                <div className="space-y-1 text-sm text-amber-100">
                                                    {entry.driftReasons.map((reason: string) => (
                                                        <div key={reason}>- {reason.replaceAll("_", " ")}</div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </ScrollWrap>
                            <div className="space-y-4">
                                <ScrollWrap>
                                    <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                        {(data?.runtimeTaskAudit?.ambiguousEventMappings || []).length ? (data?.runtimeTaskAudit?.ambiguousEventMappings || []).map((entry: any) => (
                                            <div key={entry.eventName} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.eventLabel}</p>
                                                        <p className="text-xs text-gray-400">{entry.eventName}</p>
                                                    </div>
                                                    <Pill label="Shared by" value={entry.mappedTaskCount} tone="warn" />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Assigned" value={entry.runtimeAssignedCount} />
                                                    <Pill label="Receipts" value={entry.recentReceiptCount} />
                                                    <Pill label="Event stats" value={compactNumber(entry.eventStatTotalCount)} />
                                                </div>
                                                <p className="text-xs leading-6 text-gray-400">{(entry.taskTitles || []).join(", ")}</p>
                                            </div>
                                        )) : <div className="px-4 py-4 text-sm text-emerald-100">No shared event-name mappings are distorting task attribution in the sampled data.</div>}
                                    </div>
                                </ScrollWrap>
                                <ScrollWrap>
                                    <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                        {(data?.runtimeTaskAudit?.unsupportedRuntimeRecords || []).length ? (data?.runtimeTaskAudit?.unsupportedRuntimeRecords || []).slice(0, 24).map((entry: any, index: number) => (
                                            <div key={`${entry.kind}-${entry.taskId || entry.eventName || index}`} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.title || entry.taskId || entry.eventName || "Runtime drift"}</p>
                                                        <p className="text-xs text-gray-400">{entry.kind} {entry.taskId ? `| ${entry.taskId}` : entry.eventName ? `| ${entry.eventName}` : ""}</p>
                                                    </div>
                                                    <Pill label="Kind" value={entry.kind} tone="warn" />
                                                </div>
                                                <p className="text-sm text-amber-100">{entry.detail}</p>
                                            </div>
                                        )) : <div className="px-4 py-4 text-sm text-emerald-100">No unsupported runtime task records were detected in the sampled data.</div>}
                                    </div>
                                </ScrollWrap>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Telemetry coverage sample"
                        subtitle="Tracked events, task mappings, and last-seen visibility in one bounded sample."
                        defaultOpen={false}
                        summary={<><Pill label="Tracked events" value={data?.stats?.trackedTelemetryEvents ?? 0} /><Pill label="Orphaned" value={data?.stats?.orphanedTelemetryEvents ?? 0} tone={data?.stats?.orphanedTelemetryEvents ? "warn" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.eventStats || []).map((event: any) => (
                                    <div key={event.eventName} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{event.label}</p>
                                                <p className="text-xs text-gray-400">{event.eventName}</p>
                                            </div>
                                            <Pill label="Total" value={compactNumber(event.totalCount)} />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Tasks" value={event.mappedTaskCount} tone={event.mappedTaskCount ? "good" : "warn"} />
                                            <Pill label="Last seen" value={formatRelative(event.lastSeenAt)} />
                                            <Pill label="Source" value={event.trackingSource} />
                                        </div>
                                        {event.mappedTaskTitles?.length ? <p className="text-xs text-gray-400">{event.mappedTaskTitles.join(", ")}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Tracked events with no task mapping"
                        subtitle="Tracked task-related events that do not currently map to a task."
                        defaultOpen={false}
                        summary={<><Pill label="Orphaned" value={(data?.orphanedEventStats || []).length} tone={(data?.orphanedEventStats || []).length ? "warn" : "good"} /></>}
                    >
                        {(data?.orphanedEventStats || []).length ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {(data?.orphanedEventStats || []).map((event: any) => (
                                    <div key={event.eventName} className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">{event.label}</p>
                                                <p className="text-xs text-gray-400">{event.eventName}</p>
                                            </div>
                                            <Pill label="Count" value={compactNumber(event.totalCount)} tone="warn" />
                                        </div>
                                        <p className="mt-3 text-sm text-amber-100">Last seen {formatRelative(event.lastSeenAt)}. This event is tracked, but it does not currently power any task mapping.</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Every tracked telemetry event in this slice is mapped to at least one task.</div>
                        )}
                    </Section>

                    <Section
                        title="Behavioral Intelligence"
                        subtitle="Profile snapshot coverage plus drop-level ranking inputs used before any ML dependence."
                        defaultOpen={false}
                        summary={<><Pill label="User profiles" value={data?.stats?.behavioralUserProfiles ?? 0} /><Pill label="Drop profiles" value={data?.stats?.behavioralDropProfiles ?? 0} /><Pill label="Freshness" value={data?.behavioralSnapshotStatus?.freshnessLabel || "unknown"} tone={data?.behavioralSnapshotStatus?.freshnessLabel === "live" ? "good" : "warn"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
                            <div className="space-y-3">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Snapshot status</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Users" value={data?.stats?.behavioralUserProfiles ?? 0} />
                                        <Pill label="Guests" value={data?.stats?.behavioralGuestProfiles ?? 0} />
                                        <Pill label="Drops" value={data?.stats?.behavioralDropProfiles ?? 0} />
                                    </div>
                                    <p className="mt-3 text-sm text-gray-300">Latest rebuild {formatRelative(data?.behavioralSnapshotStatus?.updatedAtMs)}. Source window starts {formatTimestamp(data?.behavioralSnapshotStatus?.sourceWindowStartMs)}.</p>
                                </div>
                            </div>

                            <ScrollWrap>
                                <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                    {(data?.behavioralDrops || []).length ? (data?.behavioralDrops || []).map((entry: any) => (
                                        <div key={entry.dropId} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{entry.dropTitle || entry.dropId}</p>
                                                    <p className="text-xs text-gray-400">{entry.dropId} · {entry.dropCategory || "unknown"}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="State" value={entry.freshnessLabel || "unknown"} tone={entry.freshnessLabel === "live" ? "good" : "warn"} />
                                                    <Pill label="Confidence" value={`${Math.round((entry.confidenceScore || 0) * 100)}%`} />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Previews" value={entry.previewOpens ?? 0} />
                                                <Pill label="Viewer opens" value={entry.viewerOpens ?? 0} />
                                                <Pill label="Unlocks" value={entry.unlocks ?? 0} />
                                                <Pill label="Completion" value={`${Math.round((entry.completionRate || 0) * 100)}%`} />
                                                <Pill label="Negative" value={`${Math.round((entry.negativeSignalRate || 0) * 100)}%`} tone={(entry.negativeSignalRate || 0) > 0.25 ? "warn" : "good"} />
                                            </div>
                                        </div>
                                    )) : <div className="px-4 py-4 text-sm text-amber-100">No behavioral drop-intelligence rows are available yet. Rebuild the snapshots or wait for the scheduled pass.</div>}
                                </div>
                            </ScrollWrap>
                        </div>
                    </Section>

                    <Section
                        title="Telemetry Truth Recovery"
                        subtitle="Raw, validated, finalized, and estimated analytics layers with repair visibility for delayed, duplicate, or legacy-broken telemetry."
                        defaultOpen={false}
                        summary={<><Pill label="Drop metrics" value={data?.stats?.analyticsTruthDropMetrics ?? 0} /><Pill label="User metrics" value={data?.stats?.analyticsTruthUserMetrics ?? 0} /><Pill label="Repairs" value={data?.stats?.analyticsTruthRepairs ?? 0} tone={(data?.stats?.analyticsTruthRepairs ?? 0) > 0 ? "warn" : "good"} /><Pill label="Quality" value={data?.analyticsTruthRecovery?.global?.qualityLabel || "unknown"} tone={data?.analyticsTruthRecovery?.global?.qualityLabel === "exact" ? "good" : data?.analyticsTruthRecovery?.global?.qualityLabel === "estimated" ? "warn" : "neutral"} /></>}
                    >
                        <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
                            <div className="space-y-3">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Global truth summary</p>
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <StatCard label="Raw views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.raw?.raw_view_count ?? 0} meta="Observed viewer-open/session-start events" />
                                        <StatCard label="Validated views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.deduped_view_count ?? 0} meta="Duplicate hydration/remount noise collapsed" />
                                        <StatCard label="Finalized views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.finalized?.finalized_view_count ?? 0} meta="Historical reporting truth after reconciliation" />
                                        <StatCard label="Estimated ratio" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.estimated_data_ratio ?? 0) as number) * 100)}%`} meta="Recovered or inferred share of finalized metrics" />
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Confidence" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.confidenceScore ?? 0) as number) * 100)}%`} />
                                        <Pill label="Duplicate rate" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) * 100)}%`} tone={((data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) > 0.1 ? "warn" : "good"} />
                                        <Pill label="Recovered sessions" value={data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.recovered_sessions_count ?? 0} tone={(data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.recovered_sessions_count ?? 0) > 0 ? "warn" : "good"} />
                                        <Pill label="Freshness" value={data?.analyticsTruthRecovery?.status?.freshnessLabel || "unknown"} tone={data?.analyticsTruthRecovery?.status?.freshnessLabel === "live" ? "good" : "warn"} />
                                    </div>
                                    <p className="mt-3 text-sm text-gray-300">Last rebuild {formatRelative(data?.analyticsTruthRecovery?.status?.lastComputedAtMs)}. Raw observations stay append-only; validated, finalized, and estimated truth are kept separate and explicitly labeled.</p>
                                </div>

                                <ScrollWrap>
                                    <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                        {(data?.analyticsTruthRepairs || []).length ? (data?.analyticsTruthRepairs || []).map((entry: any) => (
                                            <div key={entry.repairId} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.repairType}</p>
                                                        <p className="text-xs text-gray-400">{entry.scopeType || "scope"} · {entry.scopeKey || entry.repairId}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Layer" value={entry.truthLabel || "unknown"} tone={entry.truthLabel === "estimated" ? "warn" : "neutral"} />
                                                        <Pill label="Confidence" value={`${Math.round(((entry.confidenceScore || 0) as number) * 100)}%`} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Recovered watch" value={`${Math.round(((entry.recoveredWatchTimeMs || 0) as number) / 1000)}s`} />
                                                    <Pill label="Completion repairs" value={entry.repairedCompletionCount || 0} />
                                                    <Pill label="Provenance" value={entry.provenance || "unknown"} />
                                                </div>
                                            </div>
                                        )) : <div className="px-4 py-4 text-sm text-emerald-100">No telemetry repair rows are present in the current truth window.</div>}
                                    </div>
                                </ScrollWrap>
                            </div>

                            <div className="space-y-4">
                                <ScrollWrap>
                                    <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                        {(data?.analyticsTruthDrops || []).length ? (data?.analyticsTruthDrops || []).map((entry: any) => (
                                            <div key={entry.dropId} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.dropId}</p>
                                                        <p className="text-xs text-gray-400">Finalized views {entry.truthLayers?.finalized?.finalized_view_count ?? 0} · watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} />
                                                        <Pill label="Repaired" value={`${Math.round(((entry.repairedDataRatio || 0) as number) * 100)}%`} tone={((entry.repairedDataRatio || 0) as number) > 0.15 ? "warn" : "good"} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Raw views" value={entry.truthLayers?.raw?.raw_view_count ?? 0} />
                                                    <Pill label="Validated" value={entry.truthLayers?.validated?.deduped_view_count ?? 0} />
                                                    <Pill label="Estimated views" value={entry.truthLayers?.estimated?.estimated_recovered_view_count ?? 0} />
                                                    <Pill label="Dupes" value={`${Math.round(((entry.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) * 100)}%`} />
                                                </div>
                                            </div>
                                        )) : <div className="px-4 py-4 text-sm text-amber-100">No per-drop analytics truth rows are available yet. Run the reconciliation job or wait for the scheduled pass.</div>}
                                    </div>
                                </ScrollWrap>

                                <ScrollWrap>
                                    <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                        {(data?.analyticsTruthUsers || []).length ? (data?.analyticsTruthUsers || []).map((entry: any) => (
                                            <div key={entry.userId} className="space-y-2 px-4 py-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.userId}</p>
                                                        <p className="text-xs text-gray-400">Watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s · unique viewers {entry.truthLayers?.finalized?.finalized_unique_viewers ?? 0}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} />
                                                        <Pill label="Confidence" value={`${Math.round(((entry.confidenceScore || 0) as number) * 100)}%`} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Pill label="Sessions" value={entry.truthLayers?.validated?.total_drop_view_sessions ?? 0} />
                                                    <Pill label="Unlocks" value={entry.truthLayers?.finalized?.unlock_count ?? 0} />
                                                    <Pill label="Estimated watch" value={`${Math.round(((entry.truthLayers?.estimated?.estimated_watch_time_ms ?? 0) as number) / 1000)}s`} />
                                                    <Pill label="Raw gaps" value={entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0} tone={(entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0) > 0 ? "warn" : "good"} />
                                                </div>
                                            </div>
                                        )) : <div className="px-4 py-4 text-sm text-amber-100">No per-user analytics truth rows are available yet.</div>}
                                    </div>
                                </ScrollWrap>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Experiment and rollout registry"
                        subtitle="Current experimentation footprint and sample actor resolution."
                        defaultOpen={false}
                        summary={<><Pill label="Configured rollouts" value={(data?.rollouts || []).length} /><Pill label="Sample actors" value={data?.stats?.rolloutSamples ?? 0} /></>}
                    >
                        <div className="space-y-4">
                            {data?.release ? (
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">{data.release.label}</p>
                                            <p className="mt-1 text-xs text-gray-400">{data.release.id}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Channel" value={data.release.channel} tone={data.release.channel === "alpha" ? "warn" : "good"} />
                                            <Pill label="Status" value={data.release.status} tone={data.release.status === "active" ? "good" : "neutral"} />
                                            <Pill label="Declared" value={data.release.declaredAt} />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-sm text-gray-300">{data.release.summary}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Train" value={data.release.train} />
                                        <Pill label="Notes" value={(data.release.releaseNotes || []).length} />
                                        <Pill label="Changelog" value={(data.changeLog || []).length} />
                                    </div>
                                    {(data.release.releaseNotes || []).length ? (
                                        <ul className="mt-4 space-y-2 text-sm text-gray-300">
                                            {(data.release.releaseNotes || []).map((note: string) => (
                                                <li key={note} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">{note}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ) : null}

                            {(data?.changeLog || []).length ? (
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Recent changelog</p>
                                            <p className="mt-1 text-xs text-gray-400">Codebase-native release notes for the current train.</p>
                                        </div>
                                        <Pill label="Entries" value={(data?.changeLog || []).length} />
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {(data?.changeLog || []).map((entry: any) => (
                                            <div key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{entry.title}</p>
                                                        <p className="mt-1 text-xs text-gray-400">{entry.date}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(entry.areas || []).slice(0, 4).map((area: string) => (
                                                            <Pill key={area} label="Area" value={area} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="mt-2 text-sm text-gray-300">{entry.summary}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid gap-3 lg:grid-cols-2">
                                {(data?.rollouts || []).map((rollout: any) => (
                                    <div key={rollout.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-white">{rollout.label}</p>
                                                <p className="mt-1 text-xs text-gray-400">{rollout.id}</p>
                                            </div>
                                            <Pill label="Enabled" value={rollout.enabled ? "Yes" : "No"} tone={rollout.enabled ? "good" : "warn"} />
                                        </div>
                                        <p className="mt-3 text-sm text-gray-300">{rollout.description}</p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Pill label="Kind" value={rollout.kind} />
                                            <Pill label="Stage" value={rollout.stage} tone={rollout.stage === "alpha" ? "warn" : "good"} />
                                            <Pill label="Owner" value={rollout.owner} />
                                            <Pill label="Audience" value={rollout.audience} />
                                            <Pill label="Rollout" value={`${rollout.rolloutPercent}%`} />
                                            <Pill label="Default" value={rollout.defaultVariant} />
                                            <Pill label="Kill switch" value={rollout.killSwitchable ? "Ready" : "Locked"} tone={rollout.killSwitchable ? "good" : "warn"} />
                                        </div>
                                        {(rollout.requiredSegments || []).length ? <p className="mt-3 text-xs text-gray-400">Requires: {(rollout.requiredSegments || []).join(", ")}</p> : null}
                                        {(rollout.excludedSegments || []).length ? <p className="mt-1 text-xs text-gray-500">Excludes: {(rollout.excludedSegments || []).join(", ")}</p> : null}
                                    </div>
                                ))}
                            </div>

                            {(data?.rolloutSamples || []).length ? (
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Sample actor evaluation</p>
                                            <p className="mt-1 text-xs text-gray-400">Shows how the current registry resolves for representative guest, member, creator, and admin contexts.</p>
                                        </div>
                                        <Pill label="Actors" value={(data?.rolloutSamples || []).length} />
                                    </div>
                                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                        {(data?.rolloutSamples || []).map((sample: any) => (
                                            <div key={sample.key} className="rounded-xl border border-white/10 bg-black/20 p-3">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <div>
                                                        <p className="font-semibold text-white">{sample.label}</p>
                                                        <p className="mt-1 text-xs text-gray-400">{sample.path}</p>
                                                    </div>
                                                    <Pill label="Role" value={sample.role} />
                                                </div>
                                                <div className="mt-3 space-y-2">
                                                    {(sample.assignments || []).map((assignment: any) => (
                                                        <div key={`${sample.key}:${assignment.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                                                            <span className="font-medium text-gray-200">{assignment.id}</span>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Pill label="Variant" value={assignment.variant} />
                                                                <Pill label="Reason" value={assignment.reason} tone={assignment.active ? "good" : assignment.reason === "ineligible" ? "warn" : "neutral"} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </Section>
                </div>
            ) : null}
        </div>
    );
}
