"use client";

import { coerceAdminSurfaceState, formatAdminSurfaceStateLabel, type AdminSurfaceState } from "@/lib/admin-parity";
import {
    adminTruthStateForNoSampleStatus,
    badgeLabelForNoSampleStatus,
    classifyNoSampleStatus,
} from "@/lib/debug/no-sample-status-classifier";
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
    const panelLogCount = (data?.panelSystemLogs || []).length;
    const panelLogStatus = classifyNoSampleStatus({
        lane: "panel_logs",
        loadedCount: panelLogCount,
        sampleLoaded: panelLogCount > 0,
        sourceReady: Boolean(data),
        failureCount: panelLogFailCount,
        warningCount: panelLogWarnCount,
        sourceWindow: data?.panelSystemLogsProvenZero === true
            ? {
                generatedAtUtc: data?.generatedAtUtc ?? null,
                windowLabel: "panelSystemLogs",
                provesZero: true,
            }
            : null,
        emptyStateText: "No persisted panel logs are loaded yet.",
        nextAction: "Load persisted panel logs or record a bounded panel log source window before showing zero.",
    });
    const panelLogIssueCount = panelLogWarnCount + panelLogFailCount;
    const panelLogSummary = panelLogCount === 0
        ? "No panel logs loaded"
        : panelLogIssueCount > 0
            ? `${panelLogCount} panels / ${panelLogIssueCount} need review`
            : `${panelLogCount} panels / no review items`;
    return (
        <Section
            title="Panel status by section"
            subtitle="Saved panel summaries with concrete next actions."
            defaultOpen={(panelLogWarnCount + panelLogFailCount) > 0}
            summary={<Pill label="Panel logs" value={panelLogSummary} tone={panelLogFailCount > 0 ? "bad" : panelLogWarnCount > 0 ? "warn" : "neutral"} truthState={adminTruthStateForNoSampleStatus(panelLogStatus.status)} badgeLabel={badgeLabelForNoSampleStatus(panelLogStatus.status)} />}
        >
            <ScrollWrap>
                <div className="divide-y divide-white/10">
                    {(data?.panelSystemLogs || []).map((entry: any) => {
                        const totalSignals = entry.totalSignalCount ?? entry.signalCount ?? 0;
                        const reviewableSignals = entry.reviewableSignalCount ?? entry.signalCount ?? 0;
                        const signalPreview = (entry.signals || []).slice(0, 3);
                        return (
                            <div
                                key={entry.id}
                                className="space-y-2 px-4 py-3"
                                data-debug-section-status={entry.sectionStatus?.status ?? labelForPanelStatus(entry.status).toLowerCase()}
                                data-debug-section-severity={entry.sectionStatus?.severity ?? entry.status}
                                data-debug-current-counts={JSON.stringify(entry.sectionStatus?.currentCounts ?? {})}
                                data-debug-historical-counts={JSON.stringify(entry.sectionStatus?.historicalCounts ?? {})}
                                data-debug-inventory-counts={JSON.stringify(entry.sectionStatus?.inventoryCounts ?? {})}
                                data-debug-reviewable-signal-count={reviewableSignals}
                                data-debug-total-signal-count={totalSignals}
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
                                <p className="text-xs text-gray-500">
                                    Signals total: {totalSignals} / Needs review: {reviewableSignals}
                                    {signalPreview.length > 0 ? " / " : ""}
                                    {signalPreview.map((signal: any, index: number) => (
                                        <span key={`${entry.id}:${signal.key}`} data-debug-signal-type={signal.signalType}>
                                            {index > 0 ? ", " : ""}
                                            {signal.signalType}: {signal.key}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        );
                    })}
                    {(data?.panelSystemLogs || []).length === 0 ? (
                        <div
                            className="px-4 py-4 text-sm text-gray-300"
                            data-debug-panel-log-empty-status={panelLogStatus.status}
                            data-debug-panel-log-empty-display-state={panelLogStatus.displayState}
                            data-debug-panel-log-proven-zero={panelLogStatus.provenZero ? "true" : "false"}
                        >
                            No persisted panel logs are loaded yet. {panelLogStatus.reason} Next: {panelLogStatus.nextAction}
                        </div>
                    ) : null}
                </div>
            </ScrollWrap>
        </Section>
    );
}
