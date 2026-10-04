"use client";

import { buildAdminDebugSystemHealthNowModel } from "@/lib/admin-debug-summary-cards";
import { resolveControlTowerBusinessTruthState } from "@/lib/admin/debug/control-tower-truth";
import { Pill, Section, labelForPanelStatus, toneForPanelStatus, truthStateForPanelStatus } from "./DebugPrimitives";
import { DebugCreatorLane } from "./DebugCreatorLane";
import { DebugControlTower } from "./DebugControlTower";
import { DebugNowDiagnostics } from "./DebugNowDiagnostics";
import { DebugRecoveryEvidenceSummary } from "./DebugRuntimeEvidenceGroups";
import { DebugTelemetryHealthSummary } from "./DebugTelemetryHealthSummary";
import { DebugTrackingSummaryPanel } from "./DebugTrackingSummaryPanel";
import { formatRecentActivity as formatRelative, formatUtcTimestamp as formatUtc } from "./DebugTime";

/* ─── Props ─── */
export interface DebugTabNowProps {
    data: any;
    isCompactViewport: boolean;
    freshestLoadedSignalAt: number;
    activePipelineFailureCount: number;
    recentPipelineFailureCount: number;
    sampledPipelineFailureCount: number;
    activeDiagnosticCount: number;
    recentDiagnosticCount: number;
    sampledDiagnosticCount: number;
    panelLogWarnCount: number;
    panelLogFailCount: number;
    trackingSummary: any;
    isLocalAdminUiTestSession?: boolean;
}

/* ─── Component ─── */
export function DebugTabNow({
    data,
    isCompactViewport,
    freshestLoadedSignalAt,
    activePipelineFailureCount,
    recentPipelineFailureCount,
    sampledPipelineFailureCount,
    activeDiagnosticCount,
    recentDiagnosticCount,
    sampledDiagnosticCount,
    panelLogWarnCount,
    panelLogFailCount,
    trackingSummary,
    isLocalAdminUiTestSession = false,
}: DebugTabNowProps) {
    const writerWarnCount = data?.opsHealth?.materializerSummary?.warn ?? 0;
    const writerFailCount = data?.opsHealth?.materializerSummary?.fail ?? 0;
    const writerSampleCount = (data?.opsHealth?.materializers || []).length;
    const freshestLoadedSignalTruthState = freshestLoadedSignalAt ? "live" : "unavailable";
    const healthGeneratedAtUtc = formatUtc(freshestLoadedSignalAt);
    const healthFreshnessState = freshestLoadedSignalAt ? "live" : "unavailable";
    const systemHealthNow = buildAdminDebugSystemHealthNowModel({
        score: data?.opsHealth?.score,
        scorePenalties: data?.opsHealth?.scorePenalties || [],
        pipelineStatus: data?.opsHealth?.pipeline?.status,
        activePipelineFailureCount,
        recentPipelineFailureCount,
        sampledPipelineFailureCount,
        activePipelineWindowMs: data?.opsHealth?.pipeline?.activeWindowMs,
        lastPipelineFailureAt: data?.opsHealth?.pipeline?.lastFailureAt,
        activeDiagnosticCount,
        recentDiagnosticCount,
        sampledDiagnosticCount,
        activeIssueClusterCount: data?.opsHealth?.diagnostics?.activeIssueClusterCount ?? 0,
        activeDiagnosticClusters: data?.opsHealth?.diagnostics?.activeIssueClusters || [],
        routeFailureCount: (data?.opsHealth?.pipeline?.routes || []).length,
        writerSampleCount,
        writerWarnCount,
        writerFailCount,
        runtimeWarningCount: (data?.opsHealth?.runtime?.warnings || []).length,
    });
    const adminUserTruthSnapshot = data?.adminUserTruthSnapshot;
    const controlTowerBusinessTruthState = resolveControlTowerBusinessTruthState(adminUserTruthSnapshot);
    const systemHealthTruthState = systemHealthNow.pipeline.truthState === "failed" || systemHealthNow.writers.truthState === "failed"
        ? "failed"
        : systemHealthNow.pipeline.truthState === "degraded" || systemHealthNow.diagnostics.truthState === "degraded" || systemHealthNow.writers.truthState === "degraded"
            ? "degraded"
            : healthFreshnessState;
    const currentSourceSummary = (
        <>
            <Pill label="Health" value={systemHealthNow.pipeline.value} tone={systemHealthNow.pipeline.tone} truthState={systemHealthNow.pipeline.truthState} />
            <Pill label="Diagnostics" value={systemHealthNow.diagnostics.value} tone={systemHealthNow.diagnostics.tone} truthState={systemHealthNow.diagnostics.truthState} />
            <Pill label="Writers" value={systemHealthNow.writers.summaryValue} tone={systemHealthNow.writers.tone} truthState={systemHealthNow.writers.truthState} />
            <Pill label="Freshest signal" value={freshestLoadedSignalAt ? formatRelative(freshestLoadedSignalAt) : "Not loaded"} tone={freshestLoadedSignalAt ? "good" : "neutral"} truthState={freshestLoadedSignalTruthState} />
        </>
    );
    return (
        <div
            className="min-w-0 space-y-6"
            data-admin-debug-now-layout="triage_strip_plus_source_drawer"
            data-admin-debug-now-density="single_drilldown_drawer"
            data-admin-debug-now-detail-default="collapsed"
            data-admin-debug-source-heavy-default="collapsed"
            data-admin-debug-source-drawer-count="1"
        >
            {/* canonical wiring guard: <DebugControlTower businessSnapshot={adminUserTruthSnapshot} /> */}
            <DebugControlTower
                businessSnapshot={adminUserTruthSnapshot}
                isLocalAdminUiTestSession={isLocalAdminUiTestSession}
            />

            <Section
                title="Current source drilldowns"
                subtitle="Detailed health, telemetry, recovery, creator, and diagnostics panels stay collapsed until review."
                defaultOpen={false}
                summary={currentSourceSummary}
            >
                <div className="min-w-0 space-y-6">
                    <div
                        data-debug-health-freshness={healthFreshnessState}
                        data-debug-health-generated-at-utc={healthGeneratedAtUtc}
                        data-debug-route-failure-count={systemHealthNow.routeFailures.value}
                        data-debug-diagnostics-cluster-count={systemHealthNow.diagnostics.clusterCount}
                        data-debug-writer-count={writerSampleCount}
                        data-debug-score-penalty-count={systemHealthNow.score.penaltyCount}
                        data-debug-truth-state={systemHealthTruthState}
                        data-debug-business-truth-state={controlTowerBusinessTruthState}
                    >
                        <div
                            className="space-y-2"
                            data-admin-debug-health-layout="compact_strip"
                            data-admin-debug-health-summary-card-count="4"
                            data-admin-debug-raw-samples-default="collapsed"
                        >
                            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-x-6 gap-y-4">
                                {[
                                    {
                                        label: "Route pipeline",
                                        value: systemHealthNow.pipeline.value,
                                        detail: systemHealthNow.pipeline.detail,
                                        tone: systemHealthNow.pipeline.tone,
                                        truthState: systemHealthNow.pipeline.truthState,
                                    },
                                    {
                                        label: "Diagnostics",
                                        value: systemHealthNow.diagnostics.value,
                                        detail: systemHealthNow.diagnostics.detail,
                                        tone: systemHealthNow.diagnostics.tone,
                                        truthState: systemHealthNow.diagnostics.truthState,
                                    },
                                    {
                                        label: "Writers",
                                        value: systemHealthNow.writers.summaryValue,
                                        detail: `${systemHealthNow.writers.detail} | ${systemHealthNow.writers.writerCountSource} | ${systemHealthNow.writers.writerTruthState}`,
                                        tone: systemHealthNow.writers.tone,
                                        truthState: systemHealthNow.writers.truthState,
                                    },
                                    {
                                        label: "Runtime warnings",
                                        value: systemHealthNow.runtimeWarnings.value,
                                        detail: systemHealthNow.runtimeWarnings.detail,
                                        tone: systemHealthNow.runtimeWarnings.tone,
                                        truthState: systemHealthNow.runtimeWarnings.truthState,
                                    },
                                ].map((item) => (
                                    <div key={item.label} className="min-w-0 space-y-2 border-b border-border py-4">
                                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                            <p className="min-w-0 wrap-anywhere text-sm font-medium text-muted-foreground">{item.label}</p>
                                            <Pill label="State" value={item.value} tone={item.tone} truthState={item.truthState} />
                                        </div>
                                        <p className="mt-1 wrap-anywhere text-sm leading-6 text-muted-foreground">{item.detail}</p>
                                    </div>
                                ))}
                            </div>

                            <Section
                                title="Raw health samples"
                                subtitle={`generatedAtUtc ${healthGeneratedAtUtc} | source /api/admin/debug | freshnessState ${healthFreshnessState}`}
                                defaultOpen={false}
                                summary={
                                    <>
                                        <Pill label="Route failures" value={systemHealthNow.routeFailures.value} tone={systemHealthNow.routeFailures.tone} truthState={systemHealthNow.routeFailures.truthState} />
                                        <Pill label="Writers needing review" value={(data?.opsHealth?.materializers || []).filter((materializer: any) => materializer.status !== "healthy").length} tone={(data?.opsHealth?.materializers || []).some((materializer: any) => materializer.status !== "healthy") ? "warn" : "good"} truthState={systemHealthNow.writers.truthState} />
                                        <Pill label="Diagnostic clusters" value={systemHealthNow.diagnostics.clusters.length} tone={systemHealthNow.diagnostics.clusters.length ? "warn" : "good"} truthState={systemHealthNow.diagnostics.truthState} />
                                    </>
                                }
                            >
                                <div className="space-y-2 text-sm">
                                    {systemHealthNow.diagnostics.clusters.length ? (
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Diagnostic clusters</p>
                                            {systemHealthNow.diagnostics.clusters.slice(0, 3).map((cluster) => (
                                                <div key={cluster.id} className="min-w-0 space-y-1 border-b border-border py-3 text-sm text-muted-foreground">
                                                    <p className="font-semibold text-foreground">{cluster.fingerprint}</p>
                                                    <p>{cluster.severity} | {cluster.count}x | lastSeenAtUtc {formatUtc(cluster.lastSeenAt)}</p>
                                                    <p>{cluster.sourceRouteOrComponent} | {cluster.suggestedValidator}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div className="min-w-0 space-y-3 border-t border-border py-4">
                                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-foreground">Route failure sample</p>
                                                <p className="mt-1 text-xs text-muted-foreground">Recent route failures from the loaded health sample.</p>
                                            </div>
                                            <Pill label="Failures" value={systemHealthNow.routeFailures.value} tone={systemHealthNow.routeFailures.tone} truthState={systemHealthNow.routeFailures.truthState} />
                                        </div>
                                        {(data?.opsHealth?.pipeline?.routes || []).length ? (
                                            <div className="mt-2 space-y-1.5">
                                                {(data?.opsHealth?.pipeline?.routes || []).slice(0, 6).map((route: any) => (
                                                    <div key={route.routeKey} className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm">
                                                        <div>
                                                            <p className="font-semibold text-foreground">{route.label}</p>
                                                            <p className="text-muted-foreground">{route.routeKey}</p>
                                                        </div>
                                                        <Pill label="Failures" value={route.count} tone={route.count ? "warn" : "good"} />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-muted-foreground">{systemHealthNow.routeFailures.emptyDetail}</p>
                                        )}
                                    </div>

                                    <div className="min-w-0 space-y-3 border-t border-border py-4">
                                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-foreground">Downstream writers needing review</p>
                                                <p className="mt-1 text-xs text-muted-foreground">Only tracked writer jobs are represented here.</p>
                                            </div>
                                            <Pill label="Needs review" value={(data?.opsHealth?.materializers || []).filter((materializer: any) => materializer.status !== "healthy").length} tone={(data?.opsHealth?.materializers || []).some((materializer: any) => materializer.status !== "healthy") ? "warn" : "good"} truthState={systemHealthNow.writers.truthState} />
                                        </div>
                                        {(data?.opsHealth?.materializers || []).length ? (
                                            <div className="mt-2 space-y-1.5">
                                                {(data?.opsHealth?.materializers || []).slice(0, 6).map((materializer: any) => (
                                                    <div key={materializer.key} className="min-w-0 space-y-2 border-b border-border py-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold text-foreground">{materializer.label}</p>
                                                                <p className="text-xs text-muted-foreground">{materializer.engine}</p>
                                                            </div>
                                                            <Pill label="Status" value={labelForPanelStatus(materializer.status)} tone={toneForPanelStatus(materializer.status)} truthState={truthStateForPanelStatus(materializer.status)} />
                                                        </div>
                                                        <p className="mt-1 text-xs text-muted-foreground">{materializer.detail}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-muted-foreground">No downstream materializer sample is loaded right now.</p>
                                        )}
                                    </div>
                                </div>
                            </Section>
                        </div>
                    </div>

                    <DebugTelemetryHealthSummary telemetryHealth={data?.telemetryHealth} />

                    <DebugTrackingSummaryPanel trackingSummary={trackingSummary} />

                    <DebugRecoveryEvidenceSummary recoveryEvidence={data?.adminAnalyticsRecoveryEvidence} />

                    <DebugCreatorLane data={data} />

                    <DebugNowDiagnostics
                        data={data}
                        isCompactViewport={isCompactViewport}
                        panelLogWarnCount={panelLogWarnCount}
                        panelLogFailCount={panelLogFailCount}
                    />
                </div>
            </Section>
        </div>
    );
}
