"use client";

import { Pill, ScrollWrap } from "./DebugPrimitives";
import {
    ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS,
    type AdminDebugRouteRuntimeFilter,
} from "@/lib/admin-debug-preferences";
import { CREATOR_MESSAGES_COMPATIBILITY_REMOVE_AFTER } from "@/lib/creator-message-compatibility";
import {
    buildRouteRuntimeRecordTruth,
    getRouteRuntimeHealthCluster,
    getRouteRuntimeHealthCoverageState,
    getRouteRuntimeHealthFreshness,
    getRouteRuntimeHealthStatus,
    type RouteRuntimeSummaryTruth,
} from "@/lib/route-runtime-health";

/* ─── Helpers ─── */
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

/* ─── Props ─── */
export interface DebugMonitoringRoutesProps {
    routeRuntimeSummaryTruth?: RouteRuntimeSummaryTruth;
    routeRuntimeFilter: AdminDebugRouteRuntimeFilter;
    routeRuntimeHealth: any[];
    filteredRouteRuntimeHealth: any[];
    nativeChatRouteRuntimeHealth: any[];
    nativeChatRouteRuntimeRates: any;
    compatibilityChatRouteRuntimeHealth: any[];
    compatibilityChatRouteRuntimeRates: any;
    onRouteRuntimeFilterChange: (filter: AdminDebugRouteRuntimeFilter) => void;
}

function toneForRouteRuntimeHealthState(state?: string) {
    if (state === "error" || state === "slow") return "bad" as const;
    if (state === "review" || state === "stale" || state === "unseen") return "warn" as const;
    if (state === "healthy" || state === "fresh" || state === "observed" || state === "success") return "good" as const;
    return "neutral" as const;
}

function truthForRouteRuntimeHealthState(state?: string) {
    if (state === "error" || state === "slow" || state === "server_error") return "failed" as const;
    if (state === "review") return "degraded" as const;
    if (state === "stale") return "stale" as const;
    if (state === "unseen" || state === "unknown") return "unavailable" as const;
    return "live" as const;
}

function formatLatency(value: number | null) {
    return value === null ? "not observed" : `${value}ms`;
}

function formatChatTriple(label: string, summary: any) {
    return `${label}: ${summary.fail ?? 0} fail / ${summary.stale ?? 0} stale / ${summary.unobserved ?? 0} unseen`;
}

/* ─── Component ─── */
export function DebugMonitoringRoutes({
    routeRuntimeSummaryTruth,
    routeRuntimeFilter,
    routeRuntimeHealth,
    filteredRouteRuntimeHealth,
    nativeChatRouteRuntimeHealth,
    nativeChatRouteRuntimeRates,
    compatibilityChatRouteRuntimeHealth,
    compatibilityChatRouteRuntimeRates,
    onRouteRuntimeFilterChange,
}: DebugMonitoringRoutesProps) {
    const summaryTruth = routeRuntimeSummaryTruth ?? {
        trackedCount: routeRuntimeHealth.length,
        observedCount: routeRuntimeHealth.length,
        unseenCount: 0,
        staleCount: 0,
        warnCount: 0,
        failCount: 0,
        slowSampleCount: 0,
        sampleCount: 0,
        freshnessState: "unknown",
        coverageState: "unknown",
        healthState: "healthy",
        explanation: `${routeRuntimeHealth.length} tracked routes loaded.`,
    } satisfies RouteRuntimeSummaryTruth;
    return (
        <>
            <div className="mb-4 grid gap-3 lg:grid-cols-1">
                <div
                    className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4"
                    data-route-runtime-loaded={summaryTruth.trackedCount > 0 ? "true" : "false"}
                    data-route-runtime-tracked-count={summaryTruth.trackedCount}
                    data-route-runtime-observed-count={summaryTruth.observedCount}
                    data-route-runtime-unseen-count={summaryTruth.unseenCount}
                    data-route-runtime-stale-count={summaryTruth.staleCount}
                    data-route-runtime-warn-count={summaryTruth.warnCount}
                    data-route-runtime-fail-count={summaryTruth.failCount}
                    data-route-runtime-slow-count={summaryTruth.slowSampleCount}
                    data-route-runtime-health-state={summaryTruth.healthState}
                    data-route-runtime-summary-reason={summaryTruth.explanation}
                >
                    <p className="mb-3 text-sm text-gray-200">{summaryTruth.explanation}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Pill label="Native chat error rate" value={nativeChatRouteRuntimeRates.errorRateLabel} tone={nativeChatRouteRuntimeRates.errorSamples > 0 ? "warn" : "good"} />
                        <Pill label="Native chat observed" value={nativeChatRouteRuntimeHealth.length - nativeChatRouteRuntimeRates.unseenCount} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Native chat samples" value={nativeChatRouteRuntimeRates.totalSamples} truthState="live" badgeLabel="LOADED" />
                    </div>
                    <p className="mt-3 text-sm text-gray-300">
                        {formatChatTriple("Native chat", nativeChatRouteRuntimeRates)}. Native chat routes currently show {nativeChatRouteRuntimeRates.errorSamples} error samples across {nativeChatRouteRuntimeRates.totalSamples} tracked samples.
                    </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Pill label="Compat error rate" value={compatibilityChatRouteRuntimeRates.errorRateLabel} tone={compatibilityChatRouteRuntimeRates.errorSamples > 0 ? "warn" : "good"} />
                        <Pill label="Compat observed" value={compatibilityChatRouteRuntimeHealth.length - compatibilityChatRouteRuntimeRates.unseenCount} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Compat samples" value={compatibilityChatRouteRuntimeRates.totalSamples} truthState="live" badgeLabel="LOADED" />
                    </div>
                    <p className="mt-3 text-sm text-gray-300">
                        {formatChatTriple("Compat chat", compatibilityChatRouteRuntimeRates)}. Compatibility traffic stays visible until the legacy creator-messages route is removed after {CREATOR_MESSAGES_COMPATIBILITY_REMOVE_AFTER}.
                    </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Route filter</label>
                    <select
                        value={routeRuntimeFilter}
                        onChange={(event) => onRouteRuntimeFilterChange(event.target.value as AdminDebugRouteRuntimeFilter)}
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
                            const truth = buildRouteRuntimeRecordTruth(entry);
                            return (
                                <div
                                    key={entry.key}
                                    className="space-y-2 px-4 py-3"
                                    data-route-runtime-health-state={truth.status}
                                    data-route-runtime-latency-state={truth.latency.latencyState}
                                    data-route-runtime-summary-reason={truth.stateReasons.join(" | ") || "Current route runtime record is loaded."}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.title}</p>
                                            <p className="text-xs text-gray-400">{entry.routeName} | {entry.method} | {formatRelative(entry.updatedAtMs)}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Status" value={truth.status === "healthy" && truth.latency.latencyState === "review" ? "healthy with latency review" : status} tone={status === "healthy" ? "good" : status === "fail" ? "bad" : "warn"} truthState={truthForRouteRuntimeHealthState(truth.status)} />
                                            <Pill label="Coverage" value={coverageState} tone={coverageState === "observed" ? "good" : "warn"} />
                                            <Pill label="Freshness" value={freshness} tone={freshness === "fresh" ? "good" : freshness === "stale" ? "warn" : "neutral"} truthState={truthForRouteRuntimeHealthState(truth.freshness)} />
                                            <Pill label="Cluster" value={getRouteRuntimeHealthCluster(entry.key) === "native_chat" ? "native chat" : getRouteRuntimeHealthCluster(entry.key) === "compatibility_chat" ? "compatibility" : "other"} truthState="live" badgeLabel="INFO" />
                                            <Pill label="Last result" value={truth.lastResult} tone={entry.lastResult === "success" ? "good" : entry.lastResult === "client_error" ? "warn" : "bad"} truthState={truthForRouteRuntimeHealthState(truth.lastResult)} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Last latency" value={formatLatency(truth.latency.lastMs)} tone={truth.latency.latencyState === "slow" ? "warn" : "good"} />
                                        <Pill label="Avg latency" value={formatLatency(truth.latency.avgMs)} tone={truth.latency.avgMs !== null && truth.latency.avgMs >= truth.latency.slowThresholdMs ? "warn" : "good"} truthState="live" badgeLabel="INFO" />
                                        <Pill label="Max latency" value={formatLatency(truth.latency.maxMs)} tone={truth.latency.maxMs !== null && truth.latency.maxMs >= truth.latency.slowThresholdMs ? "warn" : "good"} truthState={truth.latency.maxMs !== null && truth.latency.maxMs >= truth.latency.slowThresholdMs ? "degraded" : "live"} badgeLabel={truth.latency.maxMs !== null && truth.latency.maxMs >= truth.latency.slowThresholdMs ? "SLOW" : undefined} />
                                        <Pill label="Success" value={truth.counts.success} tone="good" />
                                        <Pill label="Client errors" value={truth.counts.clientErrors} tone={truth.counts.clientErrors > 0 ? "warn" : "good"} />
                                        <Pill label="Server errors" value={truth.counts.serverErrors} tone={truth.counts.serverErrors > 0 ? "bad" : "good"} />
                                        <Pill label="Samples" value={truth.counts.samples} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Slow" value={truth.latency.slowCount} tone={truth.latency.slowCount > 0 ? "warn" : "good"} />
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {coverageState === "unseen"
                                            ? "No runtime sample has been recorded for this route yet."
                                            : freshness === "stale"
                                                ? `Last sample ${formatRelative(entry.updatedAtMs)}. This route needs a fresh runtime sample before the lane can be treated as current.`
                                                : `Slow threshold ${entry.slowThresholdMs ?? 0}ms. Last success ${formatRelative(entry.lastSuccessAtMs)}. Last server error ${formatRelative(entry.lastServerErrorAtMs)}. ${truth.latency.latencyState === "review" ? "Current result is healthy, but historical slow samples need latency review." : ""}`}
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
        </>
    );
}
