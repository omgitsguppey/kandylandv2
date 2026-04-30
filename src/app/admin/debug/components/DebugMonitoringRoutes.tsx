"use client";

import { Pill, ScrollWrap } from "./DebugPrimitives";
import {
    ADMIN_DEBUG_ROUTE_RUNTIME_FILTER_OPTIONS,
    type AdminDebugRouteRuntimeFilter,
} from "@/lib/admin-debug-preferences";
import { CREATOR_MESSAGES_COMPATIBILITY_REMOVE_AFTER } from "@/lib/creator-message-compatibility";
import {
    getRouteRuntimeHealthCluster,
    getRouteRuntimeHealthCoverageState,
    getRouteRuntimeHealthFreshness,
    getRouteRuntimeHealthStatus,
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
    routeRuntimeFilter: AdminDebugRouteRuntimeFilter;
    routeRuntimeHealth: any[];
    filteredRouteRuntimeHealth: any[];
    nativeChatRouteRuntimeHealth: any[];
    nativeChatRouteRuntimeRates: any;
    compatibilityChatRouteRuntimeHealth: any[];
    compatibilityChatRouteRuntimeRates: any;
    onRouteRuntimeFilterChange: (filter: AdminDebugRouteRuntimeFilter) => void;
}

/* ─── Component ─── */
export function DebugMonitoringRoutes({
    routeRuntimeFilter,
    routeRuntimeHealth,
    filteredRouteRuntimeHealth,
    nativeChatRouteRuntimeHealth,
    nativeChatRouteRuntimeRates,
    compatibilityChatRouteRuntimeHealth,
    compatibilityChatRouteRuntimeRates,
    onRouteRuntimeFilterChange,
}: DebugMonitoringRoutesProps) {
    return (
        <>
            <div className="mb-4 grid gap-3 lg:grid-cols-1">
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
                            return (
                                <div key={entry.key} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.title}</p>
                                            <p className="text-xs text-gray-400">{entry.routeName} | {entry.method} | {formatRelative(entry.updatedAtMs)}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Status" value={status === "healthy" ? "live" : status} tone={status === "healthy" ? "good" : status === "fail" ? "bad" : "warn"} />
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
        </>
    );
}
