"use client";

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
function toneForPanelStatus(status?: string) {
    if (status === "healthy") return "good" as const;
    if (status === "warn") return "warn" as const;
    if (status === "fail") return "bad" as const;
    return "neutral" as const;
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
                subtitle="Recent diagnostics, route failures, and materializer freshness from the loaded sample."
                defaultOpen={!isCompactViewport && ((data?.opsHealth?.diagnostics?.errorCount ?? 0) > 0 || (data?.opsHealth?.pipeline?.failureCount ?? 0) > 0)}
                summary={<><Pill label="Channels" value={(data?.opsHealth?.diagnostics?.channels || []).length} /><Pill label="Recent diagnostics" value={(data?.opsHealth?.diagnostics?.recent || []).length} /><Pill label="Routes" value={(data?.opsHealth?.pipeline?.routes || []).length} /></>}
            >
                <div className="grid gap-4 lg:grid-cols-1">
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
