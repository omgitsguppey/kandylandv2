"use client";

import { buildAdminDebugSystemHealthNowModel } from "@/lib/admin-debug-summary-cards";
import { coerceAdminSurfaceState, formatAdminSurfaceStateLabel, type AdminSurfaceState } from "@/lib/admin-parity";
import { Pill, Section } from "./DebugPrimitives";
import { DebugCreatorLane } from "./DebugCreatorLane";
import { DebugControlTower } from "./DebugControlTower";
import { DebugNowDiagnostics } from "./DebugNowDiagnostics";

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
function formatUtc(timestamp?: number) {
    return timestamp ? new Date(timestamp).toISOString() : "unavailable";
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
function formatCompactCurrency(value?: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value ?? 0);
}
function formatCompactWatch(valueMs?: number) {
    const totalMinutes = Math.round((valueMs ?? 0) / 60_000);
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
function businessTruthState(snapshot?: any): AdminSurfaceState {
    if (!snapshot) return "unavailable";
    if (
        snapshot.sourceFreshness === "failed"
        || snapshot.sourceFreshness === "unavailable"
        || (snapshot.issues || []).some((issue: any) => issue.severity === "fail")
    ) {
        return "failed";
    }
    if (
        snapshot.sourceFreshness === "stale"
        || snapshot.sourceFreshness === "degraded"
        || snapshot.sourceTruth === "legacy_fallback"
        || (snapshot.issues || []).some((issue: any) => issue.severity === "warn")
    ) {
        return "stale";
    }
    return "live";
}

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
    const businessTruth = businessTruthState(adminUserTruthSnapshot);
    const systemHealthTruthState = systemHealthNow.pipeline.truthState === "failed" || systemHealthNow.writers.truthState === "failed"
        ? "failed"
        : systemHealthNow.pipeline.truthState === "degraded" || systemHealthNow.diagnostics.truthState === "degraded" || systemHealthNow.writers.truthState === "degraded"
            ? "degraded"
            : healthFreshnessState;

    return (
        <div className="space-y-4">
            <DebugControlTower businessSnapshot={adminUserTruthSnapshot} />

            <div
                data-debug-health-freshness={healthFreshnessState}
                data-debug-health-generated-at-utc={healthGeneratedAtUtc}
                data-debug-route-failure-count={systemHealthNow.routeFailures.value}
                data-debug-diagnostics-cluster-count={systemHealthNow.diagnostics.clusterCount}
                data-debug-writer-count={writerSampleCount}
                data-debug-score-penalty-count={systemHealthNow.score.penaltyCount}
                data-debug-truth-state={systemHealthTruthState}
            >
            <Section
                        title="System health now"
                        subtitle="Current admin health, open diagnostics, and recent route checks."
                        defaultOpen
                        summary={<><Pill label="Score" value={`${systemHealthNow.score.value ?? 0}%`} tone={(systemHealthNow.score.value ?? 0) >= 90 ? "good" : (systemHealthNow.score.value ?? 0) >= 70 ? "warn" : "bad"} /><Pill label="Penalties" value={systemHealthNow.score.penaltyCount} tone={systemHealthNow.score.penaltyCount > 0 ? "warn" : "good"} truthState={systemHealthNow.score.penaltyCount > 0 ? "degraded" : "live"} /><Pill label="Pipeline sample" value={systemHealthNow.pipeline.value} tone={systemHealthNow.pipeline.tone} truthState={systemHealthNow.pipeline.truthState} /><Pill label="Active diagnostics" value={systemHealthNow.diagnostics.value} tone={systemHealthNow.diagnostics.tone} truthState={systemHealthNow.diagnostics.truthState} /><Pill label="Writers" value={systemHealthNow.writers.summaryValue} tone={systemHealthNow.writers.tone} truthState={systemHealthNow.writers.truthState} /><Pill label="Freshest loaded signal" value={freshestLoadedSignalAt ? formatRelative(freshestLoadedSignalAt) : "Not loaded"} tone={freshestLoadedSignalAt ? "good" : "neutral"} truthState={freshestLoadedSignalTruthState} /></>}
                    >
                        <div className="grid gap-4 lg:grid-cols-1">
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Route pipeline sample</p>
                                    <p className="mt-2 text-xl font-black text-white">{systemHealthNow.pipeline.value}</p>
                                    <p className="mt-1 text-sm text-gray-400">{systemHealthNow.pipeline.detail}</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Diagnostics</p>
                                    <p className="mt-2 text-xl font-black text-white">{systemHealthNow.diagnostics.value}</p>
                                    <p className="mt-1 text-sm text-gray-400">{systemHealthNow.diagnostics.detail}</p>
                                    {systemHealthNow.diagnostics.clusters.length ? (
                                        <div className="mt-3 space-y-2">
                                            {systemHealthNow.diagnostics.clusters.slice(0, 3).map((cluster) => (
                                                <div key={cluster.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                                    <p className="font-semibold text-white">{cluster.fingerprint}</p>
                                                    <p>{cluster.severity} | {cluster.count}x | lastSeenAtUtc {formatUtc(cluster.lastSeenAt)}</p>
                                                    <p>{cluster.sourceRouteOrComponent} | {cluster.suggestedValidator}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Downstream writers</p>
                                    <p className="mt-2 text-xl font-black text-white">{systemHealthNow.writers.value}</p>
                                    <p className="mt-1 text-sm text-gray-400">{systemHealthNow.writers.detail}</p>
                                    <p className="mt-1 text-xs text-gray-500">{systemHealthNow.writers.writerCountSource} | {systemHealthNow.writers.writerTruthState}</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime warnings</p>
                                    <p className="mt-2 text-xl font-black text-white">{systemHealthNow.runtimeWarnings.value}</p>
                                    <p className="mt-1 text-sm text-gray-400">{systemHealthNow.runtimeWarnings.detail}</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Score penalties</p>
                                    <p className="mt-2 text-sm text-gray-300">{systemHealthNow.score.detail}</p>
                                    <p className="mt-1 text-xs text-gray-500">generatedAtUtc {healthGeneratedAtUtc} | source /api/admin/debug | freshnessState {healthFreshnessState}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Route failure sample</p>
                                            <p className="mt-1 text-xs text-gray-400">Recent route failures from the loaded health sample.</p>
                                        </div>
                                        <Pill label="Route failures" value={systemHealthNow.routeFailures.value} tone={systemHealthNow.routeFailures.tone} truthState={systemHealthNow.routeFailures.truthState} />
                                    </div>
                                    {(data?.opsHealth?.pipeline?.routes || []).length ? (
                                        <div className="mt-4 space-y-2">
                                            {(data?.opsHealth?.pipeline?.routes || []).slice(0, 6).map((route: any) => (
                                                <div key={route.routeKey} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                                                    <div>
                                                        <p className="font-semibold text-white">{route.label}</p>
                                                        <p className="text-xs text-gray-400">{route.routeKey}</p>
                                                    </div>
                                                    <Pill label="Failures" value={route.count} tone={route.count ? "warn" : "good"} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-sm text-gray-300">{systemHealthNow.routeFailures.emptyDetail}</p>
                                    )}
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Downstream writers needing review</p>
                                            <p className="mt-1 text-xs text-gray-400">Only tracked writer jobs are represented here.</p>
                                        </div>
                                        <Pill label="Needs review" value={(data?.opsHealth?.materializers || []).filter((materializer: any) => materializer.status !== "healthy").length} tone={(data?.opsHealth?.materializers || []).some((materializer: any) => materializer.status !== "healthy") ? "warn" : "good"} />
                                    </div>
                                    {(data?.opsHealth?.materializers || []).length ? (
                                        <div className="mt-4 space-y-2">
                                            {(data?.opsHealth?.materializers || []).slice(0, 6).map((materializer: any) => (
                                                <div key={materializer.key} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold text-white">{materializer.label}</p>
                                                            <p className="text-xs text-gray-400">{materializer.engine}</p>
                                                        </div>
                                                        <Pill label="Status" value={labelForPanelStatus(materializer.status)} tone={toneForPanelStatus(materializer.status)} truthState={truthStateForPanelStatus(materializer.status)} />
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-300">{materializer.detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-sm text-gray-300">No downstream materializer sample is loaded right now.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Section>
            </div>

            <Section
                title="Business truth now"
                subtitle="Canonical user and business metrics from the admin-user truth snapshot."
                defaultOpen={!isCompactViewport}
                summary={<>
                    <Pill label="Freshness" value={adminUserTruthSnapshot?.sourceFreshness || "unavailable"} tone={businessTruth === "live" ? "good" : businessTruth === "stale" ? "warn" : "bad"} truthState={businessTruth} />
                    <Pill label="Truth" value={adminUserTruthSnapshot?.sourceTruth || "unavailable"} tone={businessTruth === "live" ? "good" : businessTruth === "stale" ? "warn" : "bad"} truthState={businessTruth} />
                    <Pill label="Users" value={adminUserTruthSnapshot?.totalUsers ?? "--"} truthState={businessTruth} />
                    <Pill label="Revenue" value={adminUserTruthSnapshot ? formatCompactCurrency(adminUserTruthSnapshot.totalRevenueUsd) : "--"} truthState={businessTruth} />
                    <Pill label="Watch" value={adminUserTruthSnapshot ? formatCompactWatch(adminUserTruthSnapshot.validWatchTimeMs) : "--"} truthState={businessTruth} />
                </>}
            >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Total users</p>
                        <p className="mt-2 text-xl font-black text-white">{adminUserTruthSnapshot?.totalUsers ?? "--"}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Verified purchases</p>
                        <p className="mt-2 text-xl font-black text-white">{adminUserTruthSnapshot?.verifiedPurchases ?? "--"}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Revenue</p>
                        <p className="mt-2 text-xl font-black text-white">{adminUserTruthSnapshot ? formatCompactCurrency(adminUserTruthSnapshot.totalRevenueUsd) : "--"}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Tracked unwraps</p>
                        <p className="mt-2 text-xl font-black text-white">{adminUserTruthSnapshot?.trackedUnwraps ?? "--"}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Valid watch time</p>
                        <p className="mt-2 text-xl font-black text-white">{adminUserTruthSnapshot ? formatCompactWatch(adminUserTruthSnapshot.validWatchTimeMs) : "--"}</p>
                    </div>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                    Debug reports and ops health cannot mark these business metrics healthy. This lane stays tied to the canonical admin-user truth snapshot only.
                </p>
                {(adminUserTruthSnapshot?.issues || []).length ? (
                    <div className="mt-3 space-y-2">
                        {(adminUserTruthSnapshot?.issues || []).slice(0, 4).map((issue: any) => (
                            <div key={issue.code} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                <p className="font-semibold text-white">{issue.severity}</p>
                                <p className="mt-1">{issue.message}</p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </Section>

                    <DebugCreatorLane data={data} />

                    <DebugNowDiagnostics
                        data={data}
                        isCompactViewport={isCompactViewport}
                        panelLogWarnCount={panelLogWarnCount}
                        panelLogFailCount={panelLogFailCount}
                    />
                </div>
    );
}
