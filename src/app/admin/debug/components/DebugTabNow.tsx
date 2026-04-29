"use client";

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

function formatWindowHours(windowMs?: number) {
    if (!windowMs) return "current";
    return `${Math.max(1, Math.round(windowMs / 3_600_000))}h`;
}

function getPipelineStatusLabel(status?: string) {
    if (status === "fail") return "Active";
    if (status === "warn") return "Recent";
    return "Clear";
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
    const writerTruthState = writerSampleCount > 0
        ? writerFailCount > 0
            ? "failed"
            : writerWarnCount > 0
                ? "degraded"
                : "live"
        : "unavailable";
    const freshestLoadedSignalTruthState = freshestLoadedSignalAt ? "live" : "unavailable";

    return (
        <div className="space-y-4">
                    <Section
                        title="System health now"
                        subtitle="Canonical system truth, current diagnostics, and sampled pipeline freshness."
                        defaultOpen
                        summary={<><Pill label="Score" value={`${data?.opsHealth?.score ?? 0}%`} tone={(data?.opsHealth?.score ?? 0) >= 90 ? "good" : (data?.opsHealth?.score ?? 0) >= 70 ? "warn" : "bad"} /><Pill label="Pipeline" value={getPipelineStatusLabel(data?.opsHealth?.pipeline?.status)} tone={data?.opsHealth?.pipeline?.status === "fail" ? "bad" : data?.opsHealth?.pipeline?.status === "warn" ? "warn" : "good"} /><Pill label="Active diagnostics" value={(data?.opsHealth?.diagnostics?.activeErrorCount ?? 0) + (data?.opsHealth?.diagnostics?.activeWarnCount ?? 0)} tone={((data?.opsHealth?.diagnostics?.activeErrorCount ?? 0) + (data?.opsHealth?.diagnostics?.activeWarnCount ?? 0)) > 0 ? "warn" : "good"} /><Pill label="Writers" value={writerSampleCount > 0 ? `${writerWarnCount}/${writerFailCount}` : "No sample"} tone={writerFailCount > 0 ? "bad" : writerWarnCount > 0 ? "warn" : writerSampleCount > 0 ? "good" : "neutral"} truthState={writerTruthState} /><Pill label="Freshest loaded signal" value={freshestLoadedSignalAt ? formatRelative(freshestLoadedSignalAt) : "Not loaded"} tone={freshestLoadedSignalAt ? "good" : "neutral"} truthState={freshestLoadedSignalTruthState} /></>}
                    >
                        <div className="grid gap-4 lg:grid-cols-1">
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Pipeline</p>
                                    <p className="mt-2 text-xl font-black text-white">{getPipelineStatusLabel(data?.opsHealth?.pipeline?.status)}</p>
                                    <p className="mt-1 text-sm text-gray-400">{data?.opsHealth?.pipeline?.status === "healthy" ? `No active incident in the last ${formatWindowHours(data?.opsHealth?.pipeline?.activeWindowMs)}.` : `Last failure ${formatRelative(data?.opsHealth?.pipeline?.lastFailureAt)}.`} Active ${activePipelineFailureCount}, recent ${recentPipelineFailureCount}, sample ${sampledPipelineFailureCount}.</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Diagnostics</p>
                                    <p className="mt-2 text-xl font-black text-white">{activeDiagnosticCount}</p>
                                    <p className="mt-1 text-sm text-gray-400">{data?.opsHealth?.diagnostics?.activeIssueClusterCount ?? 0} current issue clusters. Active {activeDiagnosticCount}, recent {recentDiagnosticCount}, sample {sampledDiagnosticCount}.</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Downstream writers</p>
                                    <p className="mt-2 text-xl font-black text-white">{(data?.opsHealth?.materializers || []).length}</p>
                                    <p className="mt-1 text-sm text-gray-400">Materializers tracked in this health slice. Warn {data?.opsHealth?.materializerSummary?.warn ?? 0}, fail {data?.opsHealth?.materializerSummary?.fail ?? 0}. Missing writers outside this slice are still possible.</p>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime warnings</p>
                                    <p className="mt-2 text-xl font-black text-white">{(data?.opsHealth?.runtime?.warnings || []).length}</p>
                                    <p className="mt-1 text-sm text-gray-400">Environment and runtime warnings from the current backend configuration check.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Top failing routes</p>
                                            <p className="mt-1 text-xs text-gray-400">Recent route failures from the loaded pipeline sample.</p>
                                        </div>
                                        <Pill label="Routes" value={(data?.opsHealth?.pipeline?.routes || []).length} tone={(data?.opsHealth?.pipeline?.routes || []).length ? "warn" : "good"} />
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
                                        <p className="mt-4 text-sm text-emerald-100">No route failures are present in the loaded pipeline sample.</p>
                                    )}
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-white">Degraded downstream writers</p>
                                            <p className="mt-1 text-xs text-gray-400">Only materializers tracked by the current health builder are represented here.</p>
                                        </div>
                                        <Pill label="Degraded" value={(data?.opsHealth?.materializers || []).filter((materializer: any) => materializer.status !== "healthy").length} tone={(data?.opsHealth?.materializers || []).some((materializer: any) => materializer.status !== "healthy") ? "warn" : "good"} />
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
                                                        <Pill label="Status" value={materializer.status} tone={materializer.status === "healthy" ? "good" : materializer.status === "warn" ? "warn" : "bad"} />
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
                                <p className="mt-1 text-sm text-gray-400">Canonical onboarding exists but the roster review queue entry is missing.</p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Missing source records</p>
                                <p className="mt-2 text-xl font-black text-white">{(data?.creatorOnboardingDiagnostics?.summary?.missingSourceCount ?? 0) + (data?.creatorOnboardingDiagnostics?.summary?.projectionWithoutSourceCount ?? 0)}</p>
                                <p className="mt-1 text-sm text-gray-400">Queue or projection exists without a canonical onboarding record behind it.</p>
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
                                    <p className="text-xs text-gray-400">Live backend mismatches from the current debug load.</p>
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
                                                    <p className="text-xs text-gray-400">{issue.creatorDisplayName} · {issue.userId}</p>
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
