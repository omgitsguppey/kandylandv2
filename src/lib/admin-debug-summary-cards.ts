import type { AdminSurfaceState } from "@/lib/admin-parity";

export type AdminDebugAiFeedStatus = "realtime" | "partial" | "polled" | "failed";

export type AdminDebugRouteRuntimeSummary = {
    total: number;
    healthy: number;
    warn: number;
    fail: number;
    stale: number;
    unobserved: number;
    slow: number;
    serverErrors: number;
    clientErrors: number;
};

export type AdminDebugRouteListenerState = {
    routeHealthFailed?: boolean;
    routeHealthLoaded?: boolean;
};

function formatWindowHours(windowMs?: number) {
    if (!windowMs) return "current window";
    return `${Math.max(1, Math.round(windowMs / 3_600_000))}h`;
}

function formatRelative(timestamp?: number, nowMs = Date.now()) {
    if (!timestamp) return "not recorded";
    const deltaMs = Math.max(0, nowMs - timestamp);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export function buildAdminDebugSystemHealthNowModel(input: {
    pipelineStatus?: string;
    activePipelineFailureCount: number;
    recentPipelineFailureCount: number;
    sampledPipelineFailureCount: number;
    activePipelineWindowMs?: number;
    lastPipelineFailureAt?: number;
    activeDiagnosticCount: number;
    recentDiagnosticCount: number;
    sampledDiagnosticCount: number;
    activeIssueClusterCount: number;
    routeFailureCount: number;
    writerSampleCount: number;
    writerWarnCount: number;
    writerFailCount: number;
    runtimeWarningCount: number;
    nowMs?: number;
}) {
    const nowMs = input.nowMs ?? Date.now();
    const diagnosticsDegraded = input.activeDiagnosticCount > 0 || input.activeIssueClusterCount > 0;
    const pipelineHasFailures = input.activePipelineFailureCount > 0 || input.recentPipelineFailureCount > 0 || input.sampledPipelineFailureCount > 0;
    const pipelineValue = input.activePipelineFailureCount > 0
        ? "Active route failures"
        : input.recentPipelineFailureCount > 0 || input.sampledPipelineFailureCount > 0
            ? "Recent route failures"
            : "No route failures";
    const pipelineTruthState: AdminSurfaceState = input.activePipelineFailureCount > 0
        ? "failed"
        : input.recentPipelineFailureCount > 0 || input.sampledPipelineFailureCount > 0 || diagnosticsDegraded
            ? "degraded"
            : "live";
    const pipelineDetail = pipelineHasFailures
        ? `Route pipeline sample last failed ${formatRelative(input.lastPipelineFailureAt, nowMs)}. Active ${input.activePipelineFailureCount}, recent ${input.recentPipelineFailureCount}, sample ${input.sampledPipelineFailureCount}.`
        : `Route pipeline sample has no failures in the last ${formatWindowHours(input.activePipelineWindowMs)}. Active ${input.activePipelineFailureCount}, recent ${input.recentPipelineFailureCount}, sample ${input.sampledPipelineFailureCount}.`;
    const diagnosticDetail = diagnosticsDegraded
        ? `${input.activeIssueClusterCount} current issue clusters. Active ${input.activeDiagnosticCount}, recent ${input.recentDiagnosticCount}, sample ${input.sampledDiagnosticCount}.`
        : `No active diagnostic clusters. Active ${input.activeDiagnosticCount}, recent ${input.recentDiagnosticCount}, sample ${input.sampledDiagnosticCount}.`;
    const writerTruthState: AdminSurfaceState = input.writerSampleCount > 0
        ? input.writerFailCount > 0
            ? "failed"
            : input.writerWarnCount > 0
                ? "degraded"
                : "live"
        : "unavailable";

    return {
        pipeline: {
            value: pipelineValue,
            truthState: pipelineTruthState,
            tone: pipelineTruthState === "failed" ? "bad" as const : pipelineTruthState === "live" ? "good" as const : "warn" as const,
            detail: diagnosticsDegraded
                ? `${pipelineDetail} Diagnostics remain degraded: ${input.activeDiagnosticCount} active across ${input.activeIssueClusterCount} clusters.`
                : pipelineDetail,
        },
        diagnostics: {
            value: input.activeDiagnosticCount,
            truthState: diagnosticsDegraded ? "degraded" as AdminSurfaceState : "live" as AdminSurfaceState,
            tone: diagnosticsDegraded ? "warn" as const : "good" as const,
            detail: diagnosticDetail,
        },
        writers: {
            value: input.writerSampleCount > 0 ? input.writerSampleCount : "No sample",
            summaryValue: input.writerSampleCount > 0 ? `${input.writerWarnCount}/${input.writerFailCount}` : "No sample",
            truthState: writerTruthState,
            tone: writerTruthState === "failed" ? "bad" as const : writerTruthState === "degraded" ? "warn" as const : writerTruthState === "live" ? "good" as const : "neutral" as const,
            detail: input.writerSampleCount > 0
                ? `${input.writerSampleCount} tracked materializers. Warn ${input.writerWarnCount}, fail ${input.writerFailCount}. This does not prove untracked writers are healthy.`
                : "No downstream materializer sample is loaded for this health slice.",
        },
        runtimeWarnings: {
            value: input.runtimeWarningCount,
            truthState: input.runtimeWarningCount > 0 ? "degraded" as AdminSurfaceState : "live" as AdminSurfaceState,
            tone: input.runtimeWarningCount > 0 ? "warn" as const : "good" as const,
            detail: input.runtimeWarningCount > 0
                ? `${input.runtimeWarningCount} runtime configuration warnings are active.`
                : "No runtime configuration warnings are active in this backend check.",
        },
        routeFailures: {
            value: input.routeFailureCount,
            truthState: input.routeFailureCount > 0 ? "degraded" as AdminSurfaceState : "live" as AdminSurfaceState,
            tone: input.routeFailureCount > 0 ? "warn" as const : "good" as const,
            emptyDetail: diagnosticsDegraded
                ? "No route failures are present in the pipeline sample. Active diagnostics are still degraded outside the route-failure lane."
                : "No route failures are present in the loaded pipeline sample.",
        },
    };
}

export function buildAdminDebugRouteHealthCard(input: {
    summary: AdminDebugRouteRuntimeSummary;
    observedCount: number;
    hasRealtimeRows: boolean;
    hasSnapshotRows: boolean;
    listenerState: AdminDebugRouteListenerState;
    isLoading: boolean;
    hasError: boolean;
}) {
    const { summary, observedCount, hasRealtimeRows, hasSnapshotRows, listenerState, isLoading, hasError } = input;
    const observedWarnCount = Math.max(0, summary.warn - summary.unobserved);
    const issueCount = observedWarnCount + summary.fail + summary.stale;
    const sourceLabel = hasSnapshotRows && hasRealtimeRows
        ? "[live] API snapshot + route listener"
        : hasSnapshotRows && listenerState.routeHealthFailed
            ? "[degraded] API snapshot; route listener failed"
        : hasSnapshotRows && !listenerState.routeHealthLoaded
            ? "[partial] API snapshot; route listener hydrating"
        : hasSnapshotRows
            ? "[live] API snapshot"
            : hasRealtimeRows
                ? "[partial] route listener; API snapshot empty"
                : listenerState.routeHealthFailed
                    ? "[failed] route listener and API snapshot empty"
                    : isLoading
                        ? "[loading] route sources"
                        : "[unavailable] no route runtime records";

    const truthState: AdminSurfaceState = isLoading && summary.total === 0
        ? "loading"
        : hasError || (listenerState.routeHealthFailed && summary.total === 0)
            ? "failed"
            : summary.fail > 0
                ? "failed"
        : listenerState.routeHealthFailed || (!hasRealtimeRows && !listenerState.routeHealthLoaded) || observedWarnCount > 0 || summary.stale > 0
                    ? "degraded"
                    : summary.total > 0
                        ? "live"
                        : "unavailable";

    return {
        value: summary.total > 0
            ? `${summary.healthy} ok / ${issueCount} action / ${summary.fail} fail`
            : "0 tracked",
        meta: summary.total > 0
            ? `${sourceLabel} | ${summary.total} tracked, ${observedCount} observed, ${summary.unobserved} unseen | slow ${summary.slow}, server ${summary.serverErrors}, client ${summary.clientErrors}`
            : sourceLabel,
        truthState,
        sourceLabel,
    };
}

export function buildAdminDebugOpenActionsCard(input: {
    proposalCount: number;
    panelWarnCount: number;
    panelFailCount: number;
    routeWarnCount: number;
    routeFailCount: number;
    routeStaleCount: number;
    queueStaleCount: number;
    queueFailedCount: number;
    missingNotificationOutcomes: number;
    isLoading: boolean;
    hasError: boolean;
}) {
    const buckets = [
        {
            key: "repairs",
            label: "repair proposals",
            count: input.proposalCount,
            detail: `${input.proposalCount} actionable proposal${input.proposalCount === 1 ? "" : "s"}`,
        },
        {
            key: "panel_logs",
            label: "panel logs",
            count: input.panelWarnCount + input.panelFailCount,
            detail: `${input.panelFailCount} fail, ${input.panelWarnCount} warn`,
        },
        {
            key: "route_runtime",
            label: "route runtime",
            count: input.routeWarnCount + input.routeFailCount + input.routeStaleCount,
            detail: `${input.routeFailCount} fail, ${input.routeStaleCount} stale, ${input.routeWarnCount} warn`,
        },
        {
            key: "queue_runtime",
            label: "queue runtime",
            count: input.queueStaleCount + input.queueFailedCount + input.missingNotificationOutcomes,
            detail: `${input.queueFailedCount} failed jobs, ${input.queueStaleCount} stale jobs, ${input.missingNotificationOutcomes} missing outcomes`,
        },
    ].filter((bucket) => bucket.count > 0);

    const count = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const truthState: AdminSurfaceState = input.isLoading
        ? "loading"
        : input.hasError
            ? "failed"
            : input.panelFailCount > 0 || input.routeFailCount > 0 || input.queueFailedCount > 0
                ? "failed"
                : count > 0
                    ? "degraded"
                    : "live";

    const formatBucket = (bucket: (typeof buckets)[number]) => {
        const label = bucket.count === 1 && bucket.label.endsWith("s")
            ? bucket.label.slice(0, -1)
            : bucket.label;
        return `${bucket.count} ${label} (${bucket.detail})`;
    };

    return {
        count,
        meta: buckets.length > 0
            ? buckets.map(formatBucket).join(" | ")
            : "No actionable debug lanes in current snapshot",
        truthState,
        buckets,
    };
}

export function buildAdminDebugAiAssistantCard(input: {
    hasSummary: boolean;
    hasError: boolean;
    enabled?: boolean;
    runtimeReady?: boolean;
    fallbackUsed?: boolean;
    configuredModel?: string | null;
    feedStatus?: AdminDebugAiFeedStatus | string | null;
    latencyMs?: number | null;
}) {
    const feedStatus = input.feedStatus || "polled";
    const configuredModel = input.configuredModel || "unknown model";
    const latency = typeof input.latencyMs === "number" && Number.isFinite(input.latencyMs)
        ? `${Math.max(0, Math.trunc(input.latencyMs))}ms`
        : "latency unknown";

    if (input.hasError) {
        return {
            value: "Unavailable",
            meta: "assistant summary route failed",
            truthState: "failed" as AdminSurfaceState,
        };
    }

    if (!input.hasSummary) {
        return {
            value: "Loading",
            meta: "waiting for assistant summary",
            truthState: "loading" as AdminSurfaceState,
        };
    }

    const runtimeLabel = input.runtimeReady ? "runtime ready" : "runtime unavailable";
    const sourceLabel = input.fallbackUsed ? "deterministic fallback output" : "live model output";

    if (input.enabled === false) {
        return {
            value: "Disabled",
            meta: `${configuredModel} configured | ${runtimeLabel} | ${sourceLabel} | ${latency}`,
            truthState: "degraded" as AdminSurfaceState,
        };
    }

    if (feedStatus === "failed") {
        return {
            value: "Preflight failed",
            meta: `${configuredModel} configured | preflight failed | ${runtimeLabel} | ${sourceLabel} | ${latency}`,
            truthState: "failed" as AdminSurfaceState,
        };
    }

    if (input.runtimeReady === false) {
        return {
            value: "Runtime unavailable",
            meta: `${configuredModel} configured | ${feedStatus} preflight lane | ${sourceLabel} | ${latency}`,
            truthState: "failed" as AdminSurfaceState,
        };
    }

    if (input.fallbackUsed) {
        return {
            value: "Fallback",
            meta: `${configuredModel} configured | ${feedStatus} preflight lane | ${runtimeLabel} | deterministic fallback output | ${latency}`,
            truthState: "fallback" as AdminSurfaceState,
        };
    }

    if (feedStatus === "partial") {
        return {
            value: "Partial",
            meta: `${configuredModel} configured | partial preflight lane | ${runtimeLabel} | live model output | ${latency}`,
            truthState: "degraded" as AdminSurfaceState,
        };
    }

    if (feedStatus === "polled") {
        return {
            value: "Polled",
            meta: `${configuredModel} configured | polled preflight lane | ${runtimeLabel} | live model output | ${latency}`,
            truthState: "fallback" as AdminSurfaceState,
        };
    }

    return {
        value: "Live",
        meta: `${configuredModel} configured | realtime preflight lane | ${runtimeLabel} | live model output | ${latency}`,
        truthState: "live" as AdminSurfaceState,
    };
}
