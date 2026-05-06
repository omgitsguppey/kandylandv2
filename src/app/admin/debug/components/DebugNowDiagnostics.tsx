"use client";

import { coerceAdminSurfaceState, formatAdminSurfaceStateLabel, type AdminSurfaceState } from "@/lib/admin-parity";
import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

/* ─── Helpers ─── */
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
function formatUtc(timestamp?: number | null) {
    return timestamp ? new Date(timestamp).toISOString() : "unavailable";
}
function toneForChannelState(state?: string) {
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
                                        <Pill label="Status" value={labelForPanelStatus(materializer.status)} tone={toneForPanelStatus(materializer.status)} truthState={truthStateForPanelStatus(materializer.status)} />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Count" value={materializer.count} />
                                        <Pill label="Last seen" value={formatRelative(materializer.lastSeenAt)} />
                                        <Pill label="Last seen UTC" value={formatUtc(materializer.lastSeenAt)} />
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
