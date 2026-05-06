"use client";

import { coerceAdminSurfaceState, formatAdminSurfaceStateLabel, type AdminSurfaceState } from "@/lib/admin-parity";
import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

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
function formatWindowHours(windowMs?: number) {
    if (!windowMs) return "current";
    return `${Math.max(1, Math.round(windowMs / 3_600_000))}h`;
}
function formatUtc(timestamp?: number | null) {
    return timestamp ? new Date(timestamp).toISOString() : "unavailable";
} function toneForChannelState(state?: string) {
    if (state === "error" || state === "expired") return "bad" as const;
    if (state === "review" || state === "stale" || state === "sample_error_history" || state === "sample_has_history") return "warn" as const;
    if (state === "live" || state === "clean_sample") return "good" as const;
    return "neutral" as const;
}
function truthStateForChannelState(state?: string): AdminSurfaceState {
    if (state === "error" || state === "expired") return "failed";
    if (state === "stale") return "stale";
    if (state === "review" || state === "sample_error_history" || state === "sample_has_history") return "degraded";
    if (state === "unknown" || state === "empty_sample") return "unavailable";
    return "live";
}
function toneForWriterState(state?: string) {
    if (state === "error") return "bad" as const;
    if (state === "review" || state === "stale") return "warn" as const;
    if (state === "live") return "good" as const;
    return "neutral" as const;
}
function truthStateForWriterState(state?: string): AdminSurfaceState {
    if (state === "error") return "failed";
    if (state === "stale") return "stale";
    if (state === "review") return "degraded";
    if (state === "quiet" || state === "unknown") return "unavailable";
    return "live";
}
function badgeLabelForWriterState(state?: string) {
    if (state === "quiet") return "QUIET";
    if (state === "unknown") return "UNKNOWN";
    return undefined;
} function writerTruth(materializer: any) {
    if (materializer?.truth) return materializer.truth;
    return {
        id: materializer?.key ?? "unknown",
        label: materializer?.label ?? "Unknown",
        lane: materializer?.engine === "functions" ? "functions" : "route",
        tracked: true,
        count: materializer?.count ?? 0,
        lastSeenAtUtc: materializer?.lastSeenAt ? new Date(materializer.lastSeenAt).toISOString() : null,
        expectedActivity: "scheduled",
        freshnessState: materializer?.lastSeenAt ? "unknown" : "unknown",
        errorState: materializer?.status === "fail" ? "error" : materializer?.status === "warn" ? "warn" : "healthy",
        displayState: materializer?.status === "fail" ? "error" : materializer?.status === "warn" ? "review" : "unknown",
        explanation: materializer?.detail ?? "Writer truth unavailable.",
    };
}
function channelTruth(channel: any, activeWindowMs?: number, recentWindowMs?: number) {
    if (channel?.truth) return channel.truth;
    return {
        channel: channel?.key ?? "unknown",
        lastSeenAtUtc: channel?.lastSeenAt ? new Date(channel.lastSeenAt).toISOString() : null,
        freshnessState: channel?.lastSeenAt ? "unknown" : "unknown",
        currentWindow: {
            windowMs: activeWindowMs ?? 0,
            errors: channel?.activeErrorCount ?? 0,
            warns: channel?.activeWarnCount ?? 0,
            info: channel?.activeInfoCount ?? 0,
            state: (channel?.activeErrorCount ?? 0) > 0 ? "error" : (channel?.activeWarnCount ?? 0) > 0 ? "review" : "empty",
        },
        recentWindow: {
            windowMs: recentWindowMs ?? 0,
            errors: channel?.recentErrorCount ?? 0,
            warns: channel?.recentWarnCount ?? 0,
            info: channel?.recentInfoCount ?? 0,
            state: (channel?.recentErrorCount ?? 0) > 0 ? "error" : (channel?.recentWarnCount ?? 0) > 0 ? "review" : "empty",
        },
        loadedSample: {
            sampleSize: channel?.count ?? 0,
            errors: channel?.errorCount ?? 0,
            warns: channel?.warnCount ?? 0,
            info: channel?.infoCount ?? 0,
            state: (channel?.errorCount ?? 0) > 0 ? "sample_error_history" : (channel?.count ?? 0) > 0 ? "sample_has_history" : "empty_sample",
        },
        overallState: (channel?.activeErrorCount ?? 0) > 0 ? "error" : (channel?.errorCount ?? 0) > 0 ? "review" : "live",
        explanation: "Current, recent, and loaded sample windows are separated.",
    };
}
function toneForPanelStatus(status?: string) {
    if (status === "healthy") return "good" as const;
    if (status === "warn") return "warn" as const;
    if (status === "fail" || status === "failed") return "bad" as const;
    return "neutral" as const;
}
function truthStateForPanelStatus(status?: string): AdminSurfaceState {
    if (status === "warn") return "degraded";
    if (status === "fail" || status === "failed") return "failed";
    return coerceAdminSurfaceState(status);
}
function labelForPanelStatus(status?: string) {
    return formatAdminSurfaceStateLabel(truthStateForPanelStatus(status));
}

/* ─── Props ─── */
export interface DebugNowDiagnosticsProps {
    data: any;
    isCompactViewport: boolean;
    panelLogWarnCount: number;
    panelLogFailCount: number;
}

/* ─── Component ─── */
export function DebugNowDiagnostics({
    data,
    isCompactViewport,
    panelLogWarnCount,
    panelLogFailCount,
}: DebugNowDiagnosticsProps) {
    return (
        <>
            <Section
                title="Recent diagnostics and downstream writers"
                subtitle="Current window, recent window, loaded sample history, and writer freshness from the loaded sample."
                defaultOpen={!isCompactViewport && ((data?.opsHealth?.diagnostics?.errorCount ?? 0) > 0 || (data?.opsHealth?.pipeline?.failureCount ?? 0) > 0)}
                summary={<><Pill label="Channels" value={(data?.opsHealth?.diagnostics?.channels || []).length} /><Pill label="Recent diagnostics" value={(data?.opsHealth?.diagnostics?.recent || []).length} /><Pill label="Routes" value={(data?.opsHealth?.pipeline?.routes || []).length} /></>}
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <ScrollWrap>
                        <div className="divide-y divide-white/10">
                            {(data?.opsHealth?.diagnostics?.channels || []).map((channel: any) => {
                                const truth = channelTruth(channel, data?.opsHealth?.diagnostics?.activeWindowMs, data?.opsHealth?.diagnostics?.recentWindowMs);
                                return (
                                <div
                                    key={channel.key}
                                    className="space-y-2 px-4 py-3"
                                    data-debug-diagnostics-channel={truth.channel}
                                    data-debug-current-window-state={truth.currentWindow.state}
                                    data-debug-recent-window-state={truth.recentWindow.state}
                                    data-debug-sample-history-state={truth.loadedSample.state}
                                    data-debug-channel-freshness={truth.freshnessState}
                                    data-debug-channel-overall-state={truth.overallState}
                                    data-debug-last-seen-at-utc={truth.lastSeenAtUtc ?? "unavailable"}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{channel.label}</p>
                                            <p className="text-xs text-gray-400">
                                                Last seen {formatRelative(channel.lastSeenAt)} | {truth.lastSeenAtUtc ?? "unavailable"}
                                            </p>
                                        </div>
                                        <Pill
                                            label="Overall"
                                            value={truth.overallState}
                                            tone={toneForChannelState(truth.overallState)}
                                            truthState={truthStateForChannelState(truth.overallState)}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label={`Current ${formatWindowHours(truth.currentWindow.windowMs)}`} value={`${truth.currentWindow.errors} err / ${truth.currentWindow.warns} warn`} tone={toneForChannelState(truth.currentWindow.state)} truthState={truthStateForChannelState(truth.currentWindow.state)} />
                                        <Pill label="Recent window" value={`${truth.recentWindow.errors} err / ${truth.recentWindow.warns} warn`} tone={toneForChannelState(truth.recentWindow.state)} truthState={truthStateForChannelState(truth.recentWindow.state)} />
                                        <Pill label="Loaded sample history" value={`${truth.loadedSample.errors} err / ${truth.loadedSample.warns} warn`} tone={toneForChannelState(truth.loadedSample.state)} truthState={truthStateForChannelState(truth.loadedSample.state)} />
                                        <Pill label="Sample size" value={truth.loadedSample.sampleSize} tone={truth.loadedSample.sampleSize > 0 ? "good" : "warn"} truthState={truth.loadedSample.sampleSize > 0 ? "live" : "unavailable"} />
                                        <Pill label="Last seen" value={formatRelative(channel.lastSeenAt)} tone={toneForChannelState(truth.freshnessState)} truthState={truthStateForChannelState(truth.freshnessState)} />
                                    </div>
                                    <details className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">Window details</summary>
                                        <div className="mt-2 grid gap-2 text-xs text-gray-300 md:grid-cols-3">
                                            <p>Current window: {formatWindowHours(truth.currentWindow.windowMs)} | {truth.currentWindow.errors} errors | {truth.currentWindow.warns} warns | {truth.currentWindow.info} info | {truth.currentWindow.state}</p>
                                            <p>Recent window: {formatWindowHours(truth.recentWindow.windowMs)} | {truth.recentWindow.errors} errors | {truth.recentWindow.warns} warns | {truth.recentWindow.info} info | {truth.recentWindow.state}</p>
                                            <p>Loaded sample history: {truth.loadedSample.sampleSize} records | {truth.loadedSample.errors} errors | {truth.loadedSample.warns} warns | {truth.loadedSample.info} info | {truth.loadedSample.state}</p>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-400">Freshness {truth.freshnessState} | lastSeenAtUtc {truth.lastSeenAtUtc ?? "unavailable"}</p>
                                    </details>
                                    <p className="text-sm text-gray-300">{truth.explanation}</p>
                                </div>
                            );})}
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
                            {(data?.opsHealth?.diagnostics?.recentClusters || []).map((cluster: any) => (
                                <div
                                    key={cluster.fingerprint}
                                    className="space-y-2 px-4 py-3"
                                    data-debug-diagnostic-cluster-key={cluster.fingerprint}
                                    data-debug-diagnostic-cluster-count={cluster.count}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{cluster.message}</p>
                                            <p className="text-xs text-gray-400">{cluster.source} | firstSeenAtUtc {cluster.firstSeenAtUtc ?? "unavailable"} | lastSeenAtUtc {cluster.lastSeenAtUtc ?? "unavailable"}</p>
                                        </div>
                                        <Pill label="Cluster" value={cluster.count} tone={cluster.severity === "error" ? "bad" : cluster.severity === "warn" ? "warn" : "neutral"} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Severity" value={cluster.severity} tone={cluster.severity === "error" ? "bad" : cluster.severity === "warn" ? "warn" : "neutral"} truthState={cluster.severity === "error" ? "failed" : cluster.severity === "warn" ? "degraded" : "live"} />
                                        <Pill label="Route context" value={cluster.routeContext ?? cluster.sourceRouteOrComponent ?? "unknown"} />
                                        <Pill label="Error name" value={cluster.errorName ?? "none"} tone={cluster.errorName ? "warn" : "neutral"} />
                                    </div>
                                    <p className="text-sm text-gray-300">{cluster.suggestedAction ?? "Review the clustered diagnostic source."}</p>
                                    <details className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-gray-300">Individual events</summary>
                                        <p className="mt-2 text-xs text-gray-400">{(cluster.eventIds || []).join(", ")}</p>
                                    </details>
                                </div>
                            ))}
                            {!(data?.opsHealth?.diagnostics?.recentClusters || []).length ? (
                                <div className="px-4 py-4 text-sm text-gray-300">No recent diagnostic clusters are loaded.</div>
                            ) : null}
                            {(data?.opsHealth?.materializers || []).map((materializer: any) => {
                                const truth = writerTruth(materializer);
                                return (
                                <div
                                    key={materializer.key}
                                    className="space-y-2 px-4 py-3"
                                    data-debug-writer-id={truth.id}
                                    data-debug-writer-tracked={truth.tracked ? "true" : "false"}
                                    data-debug-writer-freshness={truth.freshnessState}
                                    data-debug-writer-error-state={truth.errorState}
                                    data-debug-writer-display-state={truth.displayState}
                                    data-debug-writer-expected-activity={truth.expectedActivity}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{materializer.label}</p>
                                            <p className="text-xs text-gray-400">{truth.lane} | {truth.expectedActivity}</p>
                                        </div>
                                        <Pill label="Status" value={String(truth.displayState).toUpperCase()} tone={toneForWriterState(truth.displayState)} truthState={truthStateForWriterState(truth.displayState)} badgeLabel={badgeLabelForWriterState(truth.displayState)} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Count" value={truth.count} tone="neutral" truthState={truth.tracked ? "live" : "unavailable"} />
                                        <Pill label="Last seen" value={formatRelative(materializer.lastSeenAt)} tone={toneForWriterState(truth.freshnessState)} truthState={truthStateForWriterState(truth.freshnessState)} badgeLabel={badgeLabelForWriterState(truth.freshnessState)} />
                                        <Pill label="Last seen UTC" value={truth.lastSeenAtUtc ?? formatUtc(materializer.lastSeenAt)} />
                                        <Pill label="Errors" value={truth.errorState} tone={toneForWriterState(truth.errorState)} truthState={truthStateForWriterState(truth.errorState)} />
                                    </div>
                                    <p className="text-sm text-gray-300">{truth.explanation}</p>
                                </div>
                            );})}
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
                                    <Pill label="Status" value={labelForPanelStatus(entry.status)} tone={toneForPanelStatus(entry.status)} truthState={truthStateForPanelStatus(entry.status)} />
                                </div>
                                <p className="text-sm text-gray-200">{entry.summary}</p>
                                <p className="text-xs text-gray-400">{entry.action}</p>
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Signals" value={entry.signalCount ?? 0} tone={(entry.signalCount ?? 0) > 0 ? (entry.status === "fail" ? "bad" : "warn") : "good"} />
                                    {(entry.signalCount ?? 0) > 0 ? (entry.signalKeys || []).slice(0, 3).map((signalKey: string) => (
                                        <Pill key={`${entry.id}:${signalKey}`} label="Signal" value={signalKey} tone={toneForPanelStatus(entry.status)} />
                                    )) : null}
                                </div>
                            </div>
                        ))}
                        {(data?.panelSystemLogs || []).length === 0 ? (
                            <div className="px-4 py-4 text-sm text-gray-300">No persisted panel logs are loaded yet.</div>
                        ) : null}
                    </div>
                </ScrollWrap>
            </Section>
        </>
    );
}
