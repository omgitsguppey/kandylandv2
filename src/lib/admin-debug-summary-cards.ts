import type { AdminSurfaceState } from "@/lib/admin-parity";
import type { AdminDebugExplanation } from "@/lib/admin-copy/admin-truth-copy";
import { buildAdminDebugExplanation } from "@/lib/admin-copy/admin-truth-copy";

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

export type AdminDebugCardCopy = {
    operatorSummary: string;
    whyItMatters: string;
    recommendedNextCheck: string;
    technicalEvidence: string;
    sourceDetails: string;
    debugExplanation: AdminDebugExplanation;
};

export type AdminDebugDiagnosticClusterCard = {
    id: string;
    fingerprint: string;
    severity: string;
    count: number;
    lastSeenAt: number;
    source: string;
    sourceRouteOrComponent: string;
    message: string;
    suggestedValidator: string;
};

export type AdminDebugScorePenaltyCard = {
    id: string;
    label: string;
    points: number;
    source: string;
    truthState: AdminSurfaceState;
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

export function createAdminDebugCardCopy(input: {
    operatorSummary: string;
    whyItMatters: string;
    recommendedNextCheck: string;
    technicalEvidence: string;
    sourceDetails: string;
    technicalState: string;
    sourceMode?: string;
    routeName?: string;
    collectionName?: string;
    debugDetails?: unknown;
}): AdminDebugCardCopy {
    return {
        operatorSummary: input.operatorSummary,
        whyItMatters: input.whyItMatters,
        recommendedNextCheck: input.recommendedNextCheck,
        technicalEvidence: input.technicalEvidence,
        sourceDetails: input.sourceDetails,
        debugExplanation: buildAdminDebugExplanation({
            technicalState: input.technicalState,
            sourceMode: input.sourceMode,
            routeName: input.routeName,
            collectionName: input.collectionName,
            operatorImpact: input.whyItMatters,
            recommendedAction: input.recommendedNextCheck,
            debugDetails: input.debugDetails ?? input.technicalEvidence,
            debugPath: "/admin/debug",
        }),
    };
}

export function buildAdminDebugSystemHealthNowModel(input: {
    score?: number;
    scorePenalties?: AdminDebugScorePenaltyCard[];
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
    activeDiagnosticClusters?: AdminDebugDiagnosticClusterCard[];
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
    const routeAggregateWithoutBreakdown = input.activePipelineFailureCount > 0 && input.routeFailureCount === 0;
    const pipelineValue = input.activePipelineFailureCount > 0
        ? routeAggregateWithoutBreakdown ? "Active pipeline failures" : "Active route failures"
        : input.recentPipelineFailureCount > 0 || input.sampledPipelineFailureCount > 0
            ? "Recent route failures"
            : "No route failures";
    const pipelineTruthState: AdminSurfaceState = input.activePipelineFailureCount > 0
        ? "failed"
        : input.recentPipelineFailureCount > 0 || diagnosticsDegraded
            ? "degraded"
            : input.sampledPipelineFailureCount > 0 || (input.activePipelineWindowMs && input.activePipelineWindowMs > 0)
                ? "live"
                : "unavailable";
    const pipelineDetail = pipelineHasFailures
        ? `Route pipeline sample last failed ${formatRelative(input.lastPipelineFailureAt, nowMs)}. Active ${input.activePipelineFailureCount}, recent ${input.recentPipelineFailureCount}, sample ${input.sampledPipelineFailureCount}. ${routeAggregateWithoutBreakdown ? "No active route failures are present in the current per-route sample; the active aggregate came from a stale or incomplete route-count cluster/window." : ""}`.trim()
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
    const writerHealthyCount = Math.max(0, input.writerSampleCount - input.writerWarnCount - input.writerFailCount);
    const topScorePenalties = (input.scorePenalties || []).slice(0, 3);

    return {
        score: {
            value: typeof input.score === "number" ? input.score : null,
            penalties: topScorePenalties,
            penaltyCount: topScorePenalties.length,
            detail: topScorePenalties.length > 0
                ? topScorePenalties.map((penalty) => `${penalty.label} (-${penalty.points})`).join(" | ")
                : "No score penalties are present in the loaded health sample.",
        },
        pipeline: {
            value: pipelineValue,
            truthState: pipelineTruthState,
            tone: pipelineTruthState === "failed" ? "bad" as const : pipelineTruthState === "live" ? "good" as const : "warn" as const,
            detail: diagnosticsDegraded
                ? `${pipelineDetail} Diagnostics need review: ${input.activeDiagnosticCount} active across ${input.activeIssueClusterCount} clusters.`
                : pipelineDetail,
            sampleWindowMs: input.activePipelineWindowMs ?? 0,
            sampleDescription: routeAggregateWithoutBreakdown ? "aggregate_pipeline_without_route_breakdown" : "route_pipeline_sample",
        },
        diagnostics: {
            value: input.activeDiagnosticCount,
            truthState: diagnosticsDegraded ? "degraded" as AdminSurfaceState : (input.sampledDiagnosticCount > 0 || input.activeIssueClusterCount > 0 ? "live" as AdminSurfaceState : "unavailable" as AdminSurfaceState),
            tone: diagnosticsDegraded ? "warn" as const : "good" as const,
            detail: diagnosticDetail,
            clusters: input.activeDiagnosticClusters || [],
            clusterCount: input.activeIssueClusterCount,
        },
        writers: {
            value: input.writerSampleCount > 0 ? input.writerSampleCount : "No sample",
            summaryValue: input.writerSampleCount > 0 ? `${writerHealthyCount}/${input.writerSampleCount}` : "No sample",
            truthState: writerTruthState,
            writerTruthState,
            writerCountSource: "opsHealth.materializers",
            tone: writerTruthState === "failed" ? "bad" as const : writerTruthState === "degraded" ? "warn" as const : writerTruthState === "live" ? "good" as const : "neutral" as const,
            detail: input.writerSampleCount > 0
                ? `${input.writerSampleCount} tracked materializers. Warn ${input.writerWarnCount}, fail ${input.writerFailCount}. This does not prove untracked writers are healthy.`
                : "No downstream materializer sample is loaded for this health slice.",
        },
        runtimeWarnings: {
            value: input.runtimeWarningCount,
            truthState: input.runtimeWarningCount > 0 ? "degraded" as AdminSurfaceState : (input.sampledDiagnosticCount > 0 || input.sampledPipelineFailureCount > 0 ? "live" as AdminSurfaceState : "unavailable" as AdminSurfaceState),
            tone: input.runtimeWarningCount > 0 ? "warn" as const : "good" as const,
            detail: input.runtimeWarningCount > 0
                ? `${input.runtimeWarningCount} runtime configuration warnings are active.`
                : "No runtime configuration warnings are active in this backend check.",
        },
        routeFailures: {
            value: input.routeFailureCount,
            truthState: input.routeFailureCount > 0 ? "degraded" as AdminSurfaceState : (input.sampledPipelineFailureCount > 0 || (input.activePipelineWindowMs && input.activePipelineWindowMs > 0) ? "live" as AdminSurfaceState : "unavailable" as AdminSurfaceState),
            tone: input.routeFailureCount > 0 ? "warn" as const : "good" as const,
            emptyDetail: routeAggregateWithoutBreakdown
                ? "No active route failures in current sample; previous active count came from stale cluster/window."
                : diagnosticsDegraded
                ? "No route failures are present in the pipeline sample. Other active diagnostics still need review."
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
    const technicalSourceLabel = hasSnapshotRows && hasRealtimeRows
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
    const operatorSourceLabel = hasSnapshotRows && hasRealtimeRows
        ? "Live route checks are showing."
        : hasSnapshotRows && listenerState.routeHealthFailed
            ? "Live route checks are delayed. Showing last verified route data."
        : hasSnapshotRows && !listenerState.routeHealthLoaded
            ? "Showing last verified route data while live checks connect."
        : hasSnapshotRows
            ? "Showing last verified route data."
            : hasRealtimeRows
                ? "Live route checks are showing while the saved snapshot catches up."
                : listenerState.routeHealthFailed
                    ? "No verified route health data yet."
                    : isLoading
                        ? "Waiting for first route health snapshot."
                        : "No route health records are available.";
    const technicalEvidence = summary.total > 0
        ? `${technicalSourceLabel} | ${summary.total} tracked, ${observedCount} observed, ${summary.unobserved} unseen | slow ${summary.slow}, server ${summary.serverErrors}, client ${summary.clientErrors}`
        : technicalSourceLabel;

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
            ? `${operatorSourceLabel} ${issueCount > 0 ? `${issueCount} route check${issueCount === 1 ? "" : "s"} need review.` : "No action needed."}`
            : operatorSourceLabel,
        truthState,
        sourceLabel: technicalSourceLabel,
        operatorSourceLabel,
        technicalEvidence,
        copy: createAdminDebugCardCopy({
            operatorSummary: operatorSourceLabel,
            whyItMatters: summary.fail > 0
                ? "One or more admin routes failed in the current health sample."
                : summary.total > 0
                    ? "Route health tells operators whether admin tools are responding normally."
                    : "Without a route health snapshot, Debug cannot confirm route availability.",
            recommendedNextCheck: summary.fail > 0
                ? "Open the route health table and check the failed route response."
                : issueCount > 0
                    ? "Review the delayed or slow route checks below."
                    : "No action needed.",
            technicalEvidence,
            sourceDetails: technicalSourceLabel,
            technicalState: listenerState.routeHealthFailed ? "route_health_listener_failed" : "route_health_summary",
            sourceMode: hasSnapshotRows && !hasRealtimeRows ? "snapshot" : hasRealtimeRows ? "realtime" : "unavailable",
            routeName: "/api/admin/debug",
            collectionName: "route_runtime_health",
            debugDetails: { summary, observedCount, listenerState, hasRealtimeRows, hasSnapshotRows },
        }),
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
            ? `${count} open item${count === 1 ? "" : "s"} need review.`
            : "No open debug actions.",
        truthState,
        buckets,
        technicalEvidence: buckets.length > 0
            ? buckets.map(formatBucket).join(" | ")
            : "No actionable debug lanes in current snapshot",
        copy: createAdminDebugCardCopy({
            operatorSummary: buckets.length > 0
                ? `${count} open item${count === 1 ? "" : "s"} need review.`
                : "No open debug actions.",
            whyItMatters: buckets.length > 0
                ? "Open items point to admin areas that may need manual review."
                : "The current debug snapshot has no operator action items.",
            recommendedNextCheck: buckets.length > 0
                ? "Open the Action lane and address the highest severity item first."
                : "No action needed.",
            technicalEvidence: buckets.length > 0
                ? buckets.map(formatBucket).join(" | ")
                : "No actionable debug lanes in current snapshot",
            sourceDetails: "repair proposals, panel logs, route runtime, queue runtime",
            technicalState: input.hasError ? "debug_actions_load_failed" : "debug_actions_summary",
            sourceMode: input.isLoading ? "loading" : count > 0 ? "partial" : "verified",
            routeName: "/api/admin/debug",
            debugDetails: { buckets, count },
        }),
    };
}

export function buildAdminDebugAiAssistantCard(input: {
    hasSummary: boolean;
    hasError: boolean;
    enabled?: boolean;
    runtimeReady?: boolean;
    fallbackUsed?: boolean;
    responseState?: "live" | "saved" | "fallback" | null;
    configuredModel?: string | null;
    feedStatus?: AdminDebugAiFeedStatus | string | null;
    latencyMs?: number | null;
}) {
    const feedStatus = input.feedStatus || "polled";
    const configuredModel = input.configuredModel || "unknown model";
    const latency = typeof input.latencyMs === "number" && Number.isFinite(input.latencyMs)
        ? `${Math.max(0, Math.trunc(input.latencyMs))}ms`
        : "latency unknown";
    const baseSourceDetails = `${configuredModel} configured | feedStatus=${feedStatus} | ${latency}`;

    if (input.hasError) {
        const technicalEvidence = `assistant summary route failed | ${baseSourceDetails}`;
        return {
            value: "Unavailable",
            meta: "AI summary could not be loaded.",
            truthState: "failed" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "AI summary could not be loaded.",
                whyItMatters: "Debug can still be used, but the summary helper is unavailable.",
                recommendedNextCheck: "Check the assistant route response in Debug.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_route_failed",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    if (!input.hasSummary) {
        const technicalEvidence = `waiting for assistant summary | ${baseSourceDetails}`;
        return {
            value: "Loading",
            meta: "Waiting for first AI summary.",
            truthState: "loading" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "Waiting for first AI summary.",
                whyItMatters: "The helper cannot summarize issues until one response is verified.",
                recommendedNextCheck: "Wait briefly or refresh Debug.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_pending_first_summary",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    const runtimeLabel = input.runtimeReady ? "runtime ready" : "runtime unavailable";
    const sourceLabel = input.responseState === "saved"
        ? "saved live guidance"
        : input.fallbackUsed
            ? "deterministic fallback output"
            : "live model output";

    if (input.enabled === false) {
        const technicalEvidence = `${configuredModel} configured | ${runtimeLabel} | ${sourceLabel} | ${latency}`;
        return {
            value: "Off",
            meta: "AI summaries are turned off.",
            truthState: "degraded" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "AI summaries are turned off.",
                whyItMatters: "Debug works normally, but automatic summaries will not update.",
                recommendedNextCheck: "Turn the assistant on if summaries are needed.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_disabled",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    if (input.runtimeReady === false) {
        const technicalEvidence = `${configuredModel} configured | ${feedStatus} preflight lane | ${sourceLabel} | ${latency}`;
        return {
            value: "Runtime unavailable",
            meta: "AI summary cannot run right now.",
            truthState: "failed" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "AI summary cannot run right now.",
                whyItMatters: "Debug works normally, but AI-generated guidance may be missing.",
                recommendedNextCheck: "Check the configured model and runtime readiness.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_runtime_unavailable",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    if (input.fallbackUsed) {
        const technicalEvidence = `${configuredModel} configured | ${feedStatus === "failed" ? "preflight observers failed" : `${feedStatus} preflight lane`} | ${runtimeLabel} | deterministic fallback output | ${latency}`;
        return {
            value: "Fallback",
            meta: "Live AI summary delayed. Showing deterministic fallback.",
            truthState: "fallback" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "Live AI summary delayed. Showing deterministic fallback.",
                whyItMatters: "Operators can still read bounded guidance, but it is not generated from a live model call.",
                recommendedNextCheck: "Check assistant preflight and model runtime if this persists.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_fallback_output",
                sourceMode: "fallback",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    if (input.responseState === "saved") {
        const technicalEvidence = `${configuredModel} configured | ${feedStatus} status lane | ${runtimeLabel} | saved guidance | ${latency}`;
        return {
            value: "Saved summary",
            meta: "Showing the latest saved live guidance.",
            truthState: "degraded" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "Showing the latest saved live guidance.",
                whyItMatters: "No paid model call was made on page load. Refresh live guidance explicitly when needed.",
                recommendedNextCheck: "Run a live summary explicitly if the current saved guidance is stale.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_saved_guidance",
                sourceMode: "snapshot",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    if (feedStatus === "failed") {
        const technicalEvidence = `${configuredModel} configured | preflight observers failed | ${runtimeLabel} | live model output | ${latency}`;
        return {
            value: "Delayed",
            meta: "AI status is delayed. Showing the latest summary.",
            truthState: "degraded" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "AI status is delayed. Showing the latest summary.",
                whyItMatters: "The summary is available, but live status updates may arrive late.",
                recommendedNextCheck: "Check assistant preflight if the delay remains active.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_preflight_failed",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    if (feedStatus === "partial") {
        const technicalEvidence = `${configuredModel} configured | partial preflight lane | ${runtimeLabel} | live model output | ${latency}`;
        return {
            value: "Partial",
            meta: "AI status is partially updated.",
            truthState: "degraded" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "AI status is partially updated.",
                whyItMatters: "Some assistant status details may lag behind the summary.",
                recommendedNextCheck: "Review assistant source details below if this persists.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_partial_preflight",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    if (feedStatus === "polled") {
        const technicalEvidence = `${configuredModel} configured | polled preflight lane | ${runtimeLabel} | live model output | ${latency}`;
        return {
            value: "Updated",
            meta: "Showing the latest saved AI summary.",
            truthState: "fallback" as AdminSurfaceState,
            technicalEvidence,
            copy: createAdminDebugCardCopy({
                operatorSummary: "Showing the latest saved AI summary.",
                whyItMatters: "The helper is usable, but it is not streaming live status.",
                recommendedNextCheck: "No action needed unless live updates are expected.",
                technicalEvidence,
                sourceDetails: baseSourceDetails,
                technicalState: "ai_assistant_polled_status",
                sourceMode: "snapshot",
                routeName: "/api/admin/debug/assistant",
            }),
        };
    }

    const technicalEvidence = `${configuredModel} configured | realtime preflight lane | ${runtimeLabel} | live model output | ${latency}`;
    return {
        value: "Live",
        meta: "AI summary is current.",
        truthState: "live" as AdminSurfaceState,
        technicalEvidence,
        copy: createAdminDebugCardCopy({
            operatorSummary: "AI summary is current.",
            whyItMatters: "The helper can summarize current debug evidence.",
            recommendedNextCheck: "No action needed.",
            technicalEvidence,
            sourceDetails: baseSourceDetails,
            technicalState: "ai_assistant_live",
            sourceMode: "realtime",
            routeName: "/api/admin/debug/assistant",
        }),
    };
}
