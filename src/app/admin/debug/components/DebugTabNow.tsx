"use client";

import { buildAdminDebugSystemHealthNowModel } from "@/lib/admin-debug-summary-cards";
import { Pill, Section } from "./DebugPrimitives";
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
    const systemHealthNow = buildAdminDebugSystemHealthNowModel({
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
        routeFailureCount: (data?.opsHealth?.pipeline?.routes || []).length,
        writerSampleCount,
        writerWarnCount,
        writerFailCount,
        runtimeWarningCount: (data?.opsHealth?.runtime?.warnings || []).length,
    });

    return (
        <div className="space-y-4">
                    <Section
                        title="System health now"
                        subtitle="Current admin health, open diagnostics, and recent route checks."
                        defaultOpen
                        summary={<><Pill label="Score" value={`${data?.opsHealth?.score ?? 0}%`} tone={(data?.opsHealth?.score ?? 0) >= 90 ? "good" : (data?.opsHealth?.score ?? 0) >= 70 ? "warn" : "bad"} /><Pill label="Pipeline sample" value={systemHealthNow.pipeline.value} tone={systemHealthNow.pipeline.tone} truthState={systemHealthNow.pipeline.truthState} /><Pill label="Active diagnostics" value={systemHealthNow.diagnostics.value} tone={systemHealthNow.diagnostics.tone} truthState={systemHealthNow.diagnostics.truthState} /><Pill label="Writers" value={systemHealthNow.writers.summaryValue} tone={systemHealthNow.writers.tone} truthState={systemHealthNow.writers.truthState} /><Pill label="Freshest loaded signal" value={freshestLoadedSignalAt ? formatRelative(freshestLoadedSignalAt) : "Not loaded"} tone={freshestLoadedSignalAt ? "good" : "neutral"} truthState={freshestLoadedSignalTruthState} /></>}
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
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Downstream writers</p>
                                    <p className="mt-2 text-xl font-black text-white">{systemHealthNow.writers.value}</p>
                                    <p className="mt-1 text-sm text-gray-400">{systemHealthNow.writers.detail}</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime warnings</p>
                                    <p className="mt-2 text-xl font-black text-white">{systemHealthNow.runtimeWarnings.value}</p>
                                    <p className="mt-1 text-sm text-gray-400">{systemHealthNow.runtimeWarnings.detail}</p>
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
                                                        <Pill label="Status" value={materializer.status === "healthy" ? "Live" : materializer.status === "warn" ? "Degraded" : "Failed"} tone={materializer.status === "healthy" ? "good" : materializer.status === "warn" ? "warn" : "bad"} truthState={materializer.status === "healthy" ? "live" : materializer.status === "warn" ? "degraded" : "failed"} />
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

                    <Section
                        title="Creator intake blockers"
                        subtitle="Live cross-checks between onboarding records, queue entries, and user projections."
                        defaultOpen={(data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0) > 0}
                        summary={<><Pill label="Issues" value={data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0} tone={(data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0) > 0 ? "warn" : "good"} /><Pill label="Missing queue" value={data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0} tone={(data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0) > 0 ? "bad" : "good"} /><Pill label="Role mismatch" value={data?.creatorOnboardingDiagnostics?.summary?.roleMismatchCount ?? 0} tone={(data?.creatorOnboardingDiagnostics?.summary?.roleMismatchCount ?? 0) > 0 ? "warn" : "good"} /></>}
                    >
                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Missing queue links</p>
                                <p className="mt-2 text-xl font-black text-white">{data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0}</p>
                                <p className="mt-1 text-sm text-gray-400">Creator intake exists, but the review queue entry is missing.</p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Missing source records</p>
                                <p className="mt-2 text-xl font-black text-white">{(data?.creatorOnboardingDiagnostics?.summary?.missingSourceCount ?? 0) + (data?.creatorOnboardingDiagnostics?.summary?.projectionWithoutSourceCount ?? 0)}</p>
                                <p className="mt-1 text-sm text-gray-400">Queue or user state exists without a matching creator intake record.</p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Blocked in limbo</p>
                                <p className="mt-2 text-xl font-black text-white">{(data?.creatorOnboardingDiagnostics?.summary?.stuckAwaitingReviewCount ?? 0) + (data?.creatorOnboardingDiagnostics?.summary?.roleMismatchCount ?? 0)}</p>
                                <p className="mt-1 text-sm text-gray-400">Applicants waiting with no clear next state, or with approval and role state out of sync.</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                                <div>
                                    <p className="font-semibold text-white">Current creator onboarding issues</p>
                                    <p className="text-xs text-gray-400">Current creator intake records that need review.</p>
                                </div>
                                <Pill label="Rows" value={(data?.creatorOnboardingDiagnostics?.issues || []).length} />
                            </div>
                            <div className="divide-y divide-white/10">
                                {(data?.creatorOnboardingDiagnostics?.issues || []).length === 0 ? (
                                    <div className="px-4 py-6 text-sm text-gray-300">No creator onboarding anomalies are currently detected.</div>
                                ) : (
                                    (data?.creatorOnboardingDiagnostics?.issues || []).slice(0, 12).map((issue: any) => (
                                        <div key={`${issue.key}-${issue.userId}`} className="space-y-2 px-4 py-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{issue.message}</p>
                                                    <p className="text-xs text-gray-400">{issue.creatorDisplayName} - {issue.userId}</p>
                                                </div>
                                                <Pill label="Severity" value={issue.severity} tone={issue.severity === "error" ? "bad" : "warn"} />
                                            </div>
                                            <p className="text-sm text-gray-300">{issue.detail}</p>
                                            <a href={issue.link} className="text-xs font-semibold text-brand-purple hover:text-white">
                                                Open creator record
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </Section>

                    <DebugNowDiagnostics
                        data={data}
                        isCompactViewport={isCompactViewport}
                        panelLogWarnCount={panelLogWarnCount}
                        panelLogFailCount={panelLogFailCount}
                    />
                </div>
    );
}
