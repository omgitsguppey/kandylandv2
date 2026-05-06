"use client";

import { coerceAdminSurfaceState, formatAdminSurfaceStateLabel, type AdminSurfaceState } from "@/lib/admin-parity";
import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

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

export function DebugPanelStatusBySection({
    data,
    panelLogWarnCount,
    panelLogFailCount,
}: {
    data: any;
    panelLogWarnCount: number;
    panelLogFailCount: number;
}) {
    return (
        <Section
            title="Panel status by section"
            subtitle="Saved panel summaries with concrete next actions."
            defaultOpen={(panelLogWarnCount + panelLogFailCount) > 0}
            summary={<><Pill label="Panels" value={(data?.panelSystemLogs || []).length} /><Pill label="Warn" value={panelLogWarnCount} tone={panelLogWarnCount > 0 ? "warn" : "good"} /><Pill label="Fail" value={panelLogFailCount} tone={panelLogFailCount > 0 ? "bad" : "good"} /></>}
        >
            <ScrollWrap>
                <div className="divide-y divide-white/10">
                    {(data?.panelSystemLogs || []).map((entry: any) => (
                        <div
                            key={entry.id}
                            className="space-y-2 px-4 py-3"
                            data-debug-section-status={entry.sectionStatus?.status ?? labelForPanelStatus(entry.status).toLowerCase()}
                            data-debug-section-severity={entry.sectionStatus?.severity ?? entry.status}
                            data-debug-current-counts={JSON.stringify(entry.sectionStatus?.currentCounts ?? {})}
                            data-debug-historical-counts={JSON.stringify(entry.sectionStatus?.historicalCounts ?? {})}
                            data-debug-inventory-counts={JSON.stringify(entry.sectionStatus?.inventoryCounts ?? {})}
                            data-debug-reviewable-signal-count={entry.reviewableSignalCount ?? entry.signalCount ?? 0}
                            data-debug-total-signal-count={entry.totalSignalCount ?? entry.signalCount ?? 0}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="font-semibold text-white">{entry.panelTitle}</p>
                                    <p className="text-xs text-gray-400">{entry.tab} | {formatRelative(entry.updatedAtMs)}</p>
                                </div>
                                <Pill label="Status" value={labelForPanelStatus(entry.status)} tone={toneForPanelStatus(entry.status)} truthState={truthStateForPanelStatus(entry.status)} />
                            </div>
                            <p className="text-sm text-gray-200">{entry.summary}</p>
                            {entry.sectionStatus?.explanation ? <p className="text-xs text-gray-400">{entry.sectionStatus.explanation}</p> : null}
                            <p className="text-xs text-gray-400">{entry.action}</p>
                            <div className="flex flex-wrap gap-2">
                                <Pill label="Signals total" value={entry.totalSignalCount ?? entry.signalCount ?? 0} tone={(entry.totalSignalCount ?? entry.signalCount ?? 0) > 0 ? "neutral" : "good"} truthState={(entry.totalSignalCount ?? entry.signalCount ?? 0) > 0 ? "live" : "unavailable"} />
                                <Pill label="Needs review" value={`${entry.reviewableSignalCount ?? entry.signalCount ?? 0}/${entry.totalSignalCount ?? entry.signalCount ?? 0}`} tone={(entry.reviewableSignalCount ?? entry.signalCount ?? 0) > 0 ? toneForPanelStatus(entry.status) : "good"} truthState={(entry.reviewableSignalCount ?? entry.signalCount ?? 0) > 0 ? truthStateForPanelStatus(entry.status) : "live"} />
                                {(entry.signals || []).slice(0, 3).map((signal: any) => (
                                    <span key={`${entry.id}:${signal.key}`} data-debug-signal-type={signal.signalType}>
                                        <Pill label={signal.signalType} value={signal.key} tone={signal.reviewable ? toneForPanelStatus(entry.status) : "neutral"} truthState={signal.reviewable ? truthStateForPanelStatus(entry.status) : "live"} />
                                    </span>
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
    );
}
