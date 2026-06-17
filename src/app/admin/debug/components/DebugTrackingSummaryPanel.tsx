"use client";

import { Pill, Section } from "./DebugPrimitives";

const DEBUG_TRACKING_NOT_LOADED = "Not loaded";

type TrackingLane = {
    id: string;
    label: string;
    trackingSystem: string;
    sourceOwner: string;
    sourceOfTruth: string;
    status: string;
    severity: "p1" | "p2" | "p3" | "info";
    scoreImpact: "high" | "medium" | "low" | "none";
    primarySignal: string;
    criticalCount: number;
    warningCount: number;
    drilldownTarget: string;
    rawDetailsDefaultOpen: false;
    oneSourceOfTruth: true;
};

type TrackingSummary = {
    defaultView: "tracking_summary_lanes";
    rawDetailsDefaultOpen: false;
    rawDetailPolicy: "drilldown_only";
    lanes: TrackingLane[];
    futureActivityCatalog?: {
        label: "Future activity catalog";
        defaultOpen: false;
        hiddenFromDefaultWarnings: true;
        quietFutureActivityCount: number;
        actionableActivitySignalCount: number;
        brokenActivityPathCount: number;
        scoreDragActivityCount: number;
        status?: string;
        artifactFreshness?: "current" | "stale" | "unknown";
        warningSeverity?: boolean;
        drilldownTarget: string;
        sourceOfTruth: string;
    };
    duplicateMonitorGroups: string[];
    validation?: {
        duplicateTrackingSystems?: string[];
        rawDumpsBeforeSummary?: false;
        p1P2BacklogSurfaced?: boolean;
    };
};

function toneForStatus(status?: string) {
    if (
        status === "live"
        || status === "healthy_current"
        || status === "healthy_proven_zero"
        || status === "config_healthy_current"
        || status === "runtime_sample_healthy_current"
        || status === "runtime_sample_proven_zero"
        || status === "quiet_catalog_current"
    ) return "good" as const;
    if (status === "failed") return "bad" as const;
    if (
        status === "degraded"
        || status === "stale"
        || status === "stale_artifact_refresh_required"
        || status === "source_missing_actionable"
        || status === "sample_source_missing"
        || status === "runtime_sample_missing"
        || status === "source_live_artifact_stale"
    ) return "warn" as const;
    return "neutral" as const;
}

function truthForStatus(status?: string) {
    if (
        status === "live"
        || status === "healthy_current"
        || status === "healthy_proven_zero"
        || status === "config_healthy_current"
        || status === "runtime_sample_healthy_current"
        || status === "runtime_sample_proven_zero"
        || status === "quiet_catalog_current"
    ) return "live" as const;
    if (status === "failed") return "failed" as const;
    if (
        status === "degraded"
        || status === "source_missing_actionable"
        || status === "sample_source_missing"
        || status === "runtime_sample_missing"
    ) return "degraded" as const;
    if (
        status === "stale"
        || status === "stale_artifact_refresh_required"
        || status === "source_live_artifact_stale"
    ) return "stale" as const;
    return "unavailable" as const;
}

function labelForSeverity(severity?: string) {
    if (severity === "p1") return "P1";
    if (severity === "p2") return "P2";
    if (severity === "p3") return "P3";
    return "Info";
}

function valueWhenTrackingLoaded(isLoaded: boolean, value: unknown): string | number {
    if (!isLoaded) return DEBUG_TRACKING_NOT_LOADED;
    if (typeof value === "number" || typeof value === "string") return value;
    return 0;
}

export function DebugTrackingSummaryPanel({ trackingSummary }: { trackingSummary: TrackingSummary | null | undefined }) {
    const lanes = Array.isArray(trackingSummary?.lanes) ? trackingSummary.lanes : [];
    const trackingLoaded = lanes.length > 0;
    const p1Count = lanes.filter((lane) => lane.severity === "p1").length;
    const p2Count = lanes.filter((lane) => lane.severity === "p2").length;
    const duplicateCount = trackingSummary?.validation?.duplicateTrackingSystems?.length ?? 0;
    const futureCatalog = trackingSummary?.futureActivityCatalog;
    const summaryTone = duplicateCount > 0 || p1Count > 0 ? "bad" : p2Count > 0 ? "warn" : lanes.length ? "good" : "neutral";

    return (
        <Section
            title="Tracking summary lanes"
            subtitle="One compact source of truth for identity, consent, events, behavior, feature coverage, legacy recovery, wallet, runtime, cost, and open backlog."
            defaultOpen
            summary={(
                <>
                    <Pill label="Lanes" value={lanes.length} tone={lanes.length ? "good" : "bad"} truthState={lanes.length ? "live" : "unavailable"} />
                    <Pill label="P1" value={valueWhenTrackingLoaded(trackingLoaded, p1Count)} tone={p1Count > 0 ? "bad" : trackingLoaded ? "good" : "neutral"} truthState={trackingLoaded ? p1Count > 0 ? "failed" : "live" : "unavailable"} />
                    <Pill label="P2" value={valueWhenTrackingLoaded(trackingLoaded, p2Count)} tone={p2Count > 0 ? "warn" : trackingLoaded ? "good" : "neutral"} truthState={trackingLoaded ? p2Count > 0 ? "degraded" : "live" : "unavailable"} />
                    <Pill label="Duplicates" value={valueWhenTrackingLoaded(trackingLoaded, duplicateCount)} tone={duplicateCount > 0 ? "bad" : trackingLoaded ? "good" : "neutral"} truthState={trackingLoaded ? duplicateCount > 0 ? "failed" : "live" : "unavailable"} />
                    <Pill label="Raw details" value="Drilldown only" tone="neutral" truthState="cached" />
                </>
            )}
        >
            {lanes.length ? (
                <div
                    className="grid gap-2 md:grid-cols-2"
                    data-admin-debug-tracking-summary="default"
                    data-admin-debug-tracking-default-view={trackingSummary?.defaultView || "missing"}
                    data-admin-debug-raw-default={String(Boolean(trackingSummary?.rawDetailsDefaultOpen))}
                    data-admin-debug-raw-policy={trackingSummary?.rawDetailPolicy || "missing"}
                    data-admin-debug-duplicate-tracking-systems={String(duplicateCount)}
                    data-admin-debug-p1p2-backlog-surfaced={String(trackingSummary?.validation?.p1P2BacklogSurfaced === true)}
                >
                    {lanes.map((lane) => (
                        <div key={lane.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white">{lane.label}</p>
                                    <p className="mt-1 text-xs leading-5 text-gray-400">{lane.primarySignal}</p>
                                </div>
                                <Pill label="Severity" value={labelForSeverity(lane.severity)} tone={lane.severity === "p1" ? "bad" : lane.severity === "p2" ? "warn" : "neutral"} truthState={truthForStatus(lane.status)} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Status" value={lane.status} tone={toneForStatus(lane.status)} truthState={truthForStatus(lane.status)} />
                                <Pill label="Owner" value={lane.sourceOwner} tone="neutral" truthState="cached" />
                                <Pill label="Impact" value={lane.scoreImpact} tone={lane.scoreImpact === "high" ? summaryTone : "neutral"} truthState={truthForStatus(lane.status)} />
                            </div>
                            <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-gray-300">
                                <summary className="cursor-pointer font-semibold text-gray-100">Source and drilldown</summary>
                                <p className="mt-2"><span className="text-gray-500">Source owner:</span> {lane.sourceOwner}</p>
                                <p className="mt-1"><span className="text-gray-500">Source of truth:</span> {lane.sourceOfTruth}</p>
                                <p className="mt-1"><span className="text-gray-500">Drilldown:</span> {lane.drilldownTarget}</p>
                                <p className="mt-1 text-gray-500">Raw tables and dumps stay collapsed until this drilldown is opened.</p>
                            </details>
                        </div>
                    ))}
                    {futureCatalog ? (
                        <details
                            className="md:col-span-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-gray-300"
                            open={futureCatalog.defaultOpen}
                            data-admin-debug-future-activity-catalog="collapsed"
                            data-admin-debug-quiet-future-activity-count={String(futureCatalog.quietFutureActivityCount)}
                            data-admin-debug-actionable-activity-signal-count={String(futureCatalog.actionableActivitySignalCount)}
                        >
                            <summary className="cursor-pointer text-sm font-semibold text-gray-100">{futureCatalog.label}</summary>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Quiet" value={futureCatalog.quietFutureActivityCount} tone="neutral" truthState="cached" />
                                <Pill label="Status" value={futureCatalog.status || "unknown"} tone={toneForStatus(futureCatalog.status)} truthState={truthForStatus(futureCatalog.status)} />
                                <Pill label="Freshness" value={futureCatalog.artifactFreshness || "unknown"} tone={futureCatalog.artifactFreshness === "stale" ? "warn" : "neutral"} truthState={futureCatalog.artifactFreshness === "stale" ? "stale" : "cached"} />
                                <Pill label="Actionable" value={futureCatalog.actionableActivitySignalCount} tone={futureCatalog.actionableActivitySignalCount > 0 ? "bad" : "good"} truthState={futureCatalog.actionableActivitySignalCount > 0 ? "failed" : "live"} />
                                <Pill label="Broken" value={futureCatalog.brokenActivityPathCount} tone={futureCatalog.brokenActivityPathCount > 0 ? "bad" : "good"} truthState={futureCatalog.brokenActivityPathCount > 0 ? "failed" : "live"} />
                                <Pill label="Score drag" value={futureCatalog.scoreDragActivityCount} tone={futureCatalog.scoreDragActivityCount > 0 ? "bad" : "good"} truthState={futureCatalog.scoreDragActivityCount > 0 ? "failed" : "live"} />
                            </div>
                            <p className="mt-2 text-gray-500">Quiet future activity is hidden from default warnings. Broken producers, bridges, materializers, metric consumers, and debug mappings stay actionable.</p>
                            <p className="mt-1"><span className="text-gray-500">Source of truth:</span> {futureCatalog.sourceOfTruth}</p>
                            <p className="mt-1"><span className="text-gray-500">Drilldown:</span> {futureCatalog.drilldownTarget}</p>
                        </details>
                    ) : null}
                </div>
            ) : (
                <p className="text-sm text-gray-300">Tracking summary is unavailable in this debug payload. Refresh the compact debug summary before using it for operator decisions.</p>
            )}
        </Section>
    );
}
