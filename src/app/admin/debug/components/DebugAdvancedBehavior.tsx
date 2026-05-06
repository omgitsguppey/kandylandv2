"use client";

import { Pill, StatCard, Section, ScrollWrap } from "./DebugPrimitives";

export interface DebugAdvancedBehaviorProps {
    data: any;
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

export function DebugAdvancedBehavior({ data }: DebugAdvancedBehaviorProps) {
    const panel = data?.behavioralIntelligencePanel;
    const dropRows = panel?.dropRows || [];
    const rankingModeLabel = panel?.activeRankingMode === "ml_active"
        ? "ML active"
        : panel?.activeRankingMode === "hybrid"
            ? "Hybrid active"
            : panel?.activeRankingMode === "ml_experimental"
                ? "ML experimental"
                : panel?.activeRankingMode === "deterministic"
                    ? "Deterministic active"
                    : "Unknown";
    const mlValidationLabel = panel?.mlValidationState === "not_enough_sample"
        ? "Not enough sample"
        : panel?.mlValidationState === "under_baseline"
            ? "Under baseline"
            : panel?.mlValidationState === "experimental"
                ? "Experimental"
                : panel?.mlValidationState === "active"
                    ? "Active"
                    : "Missing";

    return (
        <>
            <Section
                title="Behavioral Intelligence"
                subtitle="Profile snapshot coverage plus drop-level ranking inputs used before any ML dependence."
                defaultOpen={false}
                summary={
                    <>
                        <Pill label="User profiles" value={panel?.userProfiles ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Drop profiles" value={panel?.dropProfiles ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Ranking mode" value={rankingModeLabel} tone={panel?.activeRankingMode === "unknown" ? "warn" : "good"} truthState={panel?.activeRankingMode === "unknown" ? "degraded" : "live"} badgeLabel="LOADED" />
                        <Pill label="Freshness" value={panel?.overallFreshnessState || "unknown"} tone={panel?.overallFreshnessState === "live" ? "good" : "warn"} truthState={panel?.overallFreshnessState === "live" ? "live" : "degraded"} badgeLabel="LOADED" />
                    </>
                }
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="space-y-3">
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Snapshot status</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Users" value={panel?.userProfiles ?? 0} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Guests" value={panel?.guestProfiles ?? 0} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Drops" value={panel?.dropProfiles ?? 0} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Rebuild freshness" value={panel?.rebuildFreshnessState || "unknown"} tone={panel?.rebuildFreshnessState === "live" ? "good" : "warn"} truthState={panel?.rebuildFreshnessState === "live" ? "live" : "degraded"} badgeLabel="LOADED" />
                                <Pill label="Drop freshness" value={panel?.dropProfileFreshnessState || "unknown"} tone={panel?.dropProfileFreshnessState === "live" ? "good" : "warn"} truthState={panel?.dropProfileFreshnessState === "live" ? "live" : "degraded"} badgeLabel="LOADED" />
                                <Pill label="ML validation" value={mlValidationLabel} tone={panel?.mlValidationState === "active" ? "good" : panel?.mlValidationState === "missing" ? "bad" : "warn"} truthState={panel?.mlValidationState === "active" ? "live" : panel?.mlValidationState === "missing" ? "failed" : "degraded"} badgeLabel="LOADED" />
                                <Pill label="Connected modules" value={`${panel?.connectedModuleCount ?? 0}/9`} tone={(panel?.missingModuleCount ?? 0) === 0 ? "good" : "warn"} truthState={(panel?.missingModuleCount ?? 0) === 0 ? "live" : "degraded"} badgeLabel="LOADED" />
                            </div>
                            <p className="mt-3 text-sm text-gray-300">
                                Latest rebuild {panel?.latestRebuildAtUtc ? formatRelative(Date.parse(panel.latestRebuildAtUtc)) : "unknown"}.
                                Source window starts {panel?.sourceWindowStartUtc || "unknown"} and ends {panel?.sourceWindowEndUtc || "unknown"}.
                            </p>
                            <p className="mt-2 text-sm text-gray-400">{panel?.overallFreshnessExplanation || "Behavioral freshness is not available."}</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <StatCard label="Sample size" value={panel?.sampleSize ?? 0} meta="ML stays deterministic below 50 samples and experimental below 200." truthState="live" />
                                <StatCard label="Precision@5" value={panel?.validationMetrics?.precisionAt5 ?? 0} meta={`Baseline ${panel?.validationMetrics?.baselineComparison || "not_tested"}`} truthState="live" />
                                <StatCard label="Calibration error" value={panel?.validationMetrics?.calibrationError ?? 0} meta={`Confidence formula: ${panel?.confidenceFormula || "missing"}`} truthState="live" />
                                <StatCard label="Deterministic baseline" value={panel?.deterministicBaselineState || "missing"} meta={`Model v${panel?.modelVersion || "unknown"}`} truthState={panel?.deterministicBaselineState === "available" ? "live" : "failed"} />
                            </div>
                        </div>
                    </div>

                    <ScrollWrap>
                        <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                            {dropRows.length ? dropRows.map((entry: any) => (
                                <div key={entry.dropId} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-white">{entry.dropTitle || entry.dropId}</p>
                                            <p className="text-xs text-gray-400">{entry.creatorName || "Unknown creator"} · {entry.dropId}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Freshness" value={entry.profileFreshnessState || "unknown"} tone={entry.profileFreshnessState === "fresh" ? "good" : "warn"} truthState={entry.profileFreshnessState === "fresh" ? "live" : "degraded"} badgeLabel="LOADED" />
                                            <Pill label="Eligibility" value={entry.rankEligibility || "unknown"} tone={entry.rankEligibility === "eligible" ? "good" : "warn"} truthState={entry.rankEligibility === "eligible" ? "live" : "degraded"} badgeLabel="LOADED" />
                                            <Pill label="Confidence" value={`${entry.confidenceScore ?? 0}%`} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Source truth" value={`${entry.sourceTruthScore ?? 0}%`} truthState="live" badgeLabel="LOADED" />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Sample size" value={entry.sampleSize ?? 0} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Previews" value={entry.previews ?? 0} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Viewer opens" value={entry.viewerOpens ?? 0} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Unlocks" value={entry.unlocks ?? 0} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Purchases" value={entry.purchases ?? 0} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Completion" value={entry.completionRate === null ? "missing" : `${entry.completionRate}%`} tone={entry.completionRate === null ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Negative" value={entry.negativeRate === null ? "missing" : `${entry.negativeRate}%`} tone={(entry.negativeRate ?? 0) > 25 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Pill label="Purchase" value={entry.pPurchase7d === null || entry.pPurchase7d === undefined ? "n/a" : `${entry.pPurchase7d}%`} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Unlock" value={entry.pUnlock24h === null || entry.pUnlock24h === undefined ? "n/a" : `${entry.pUnlock24h}%`} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Watch" value={entry.pWatchComplete === null || entry.pWatchComplete === undefined ? "n/a" : `${entry.pWatchComplete}%`} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Return" value={entry.pReturn7d === null || entry.pReturn7d === undefined ? "n/a" : `${entry.pReturn7d}%`} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Suppression" value={entry.suppressionScore === null || entry.suppressionScore === undefined ? "n/a" : `${entry.suppressionScore}%`} tone={(entry.suppressionScore ?? 0) > 25 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                        <Pill label="Final rank" value={entry.finalRankScore === null || entry.finalRankScore === undefined ? "n/a" : entry.finalRankScore} truthState="live" badgeLabel="LOADED" />
                                    </div>
                                    <p className="text-xs text-gray-300">Confidence formula: {entry.confidenceFormula}</p>
                                    <p className="text-xs text-gray-300">Completion: {entry.completionExplanation}</p>
                                    <p className="text-xs text-gray-300">Negative: {entry.negativeExplanation}</p>
                                    <p className="text-xs text-gray-400">Top reasons: {(entry.topReasons || []).length ? entry.topReasons.join(" · ") : "No strong ranking reason surfaced in the sampled profile."}</p>
                                    <p className="text-xs text-gray-500">Missing inputs: {(entry.missingInputs || []).length ? entry.missingInputs.join(", ") : "none"}</p>
                                </div>
                            )) : <div className="px-4 py-4 text-sm text-amber-100">No behavioral drop-intelligence rows are available yet. Rebuild the snapshots or wait for the scheduled pass.</div>}
                        </div>
                    </ScrollWrap>
                </div>
            </Section>

            <Section
                title="Telemetry Truth Recovery"
                subtitle="Observed, checked, final, and estimated analytics layers with repair visibility."
                defaultOpen={false}
                summary={<><Pill label="Drop metrics" value={data?.stats?.analyticsTruthDropMetrics ?? 0} /><Pill label="User metrics" value={data?.stats?.analyticsTruthUserMetrics ?? 0} /><Pill label="Repairs" value={data?.stats?.analyticsTruthRepairs ?? 0} tone={(data?.stats?.analyticsTruthRepairs ?? 0) > 0 ? "warn" : "good"} /><Pill label="Quality" value={data?.analyticsTruthRecovery?.global?.qualityLabel || "unknown"} tone={data?.analyticsTruthRecovery?.global?.qualityLabel === "exact" ? "good" : data?.analyticsTruthRecovery?.global?.qualityLabel === "estimated" ? "warn" : "neutral"} /></>}
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="space-y-3">
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Global truth summary</p>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <StatCard label="Observed views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.raw?.raw_view_count ?? 0} meta="Observed viewer-open and session-start activity" truthState={data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                                <StatCard label="Checked views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.deduped_view_count ?? 0} meta="Duplicate page loads collapsed" truthState={data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                                <StatCard label="Final views" value={data?.analyticsTruthRecovery?.global?.truthLayers?.finalized?.finalized_view_count ?? 0} meta="Reporting value after review" truthState={data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                                <StatCard label="Estimated ratio" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.estimated_data_ratio ?? 0) as number) * 100)}%`} meta="Recovered or inferred share of final metrics" truthState={data?.analyticsTruthRecovery?.global?.qualityLabel === "estimated" ? "fallback" : data?.analyticsTruthRecovery ? "live" : "unavailable"} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Confidence" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.confidenceScore ?? 0) as number) * 100)}%`} />
                                <Pill label="Duplicate rate" value={`${Math.round(((data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) * 100)}%`} tone={((data?.analyticsTruthRecovery?.global?.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) > 0.1 ? "warn" : "good"} />
                                <Pill label="Recovered sessions" value={data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.recovered_sessions_count ?? 0} tone={(data?.analyticsTruthRecovery?.global?.truthLayers?.estimated?.recovered_sessions_count ?? 0) > 0 ? "warn" : "good"} />
                                <Pill label="Freshness" value={data?.analyticsTruthRecovery?.status?.freshnessLabel || "unknown"} tone={data?.analyticsTruthRecovery?.status?.freshnessLabel === "live" ? "good" : "warn"} />
                            </div>
                            <p className="mt-3 text-sm text-gray-300">Last rebuild {formatRelative(data?.analyticsTruthRecovery?.status?.lastComputedAtMs)}. Observed, checked, final, and estimated layers stay separate and explicitly labeled.</p>
                        </div>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.analyticsTruthRepairs || []).length ? (data?.analyticsTruthRepairs || []).map((entry: any) => (
                                    <div key={entry.repairId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.repairType}</p>
                                                <p className="text-xs text-gray-400">{entry.scopeType || "scope"} · {entry.scopeKey || entry.repairId}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Layer" value={entry.truthLabel || "unknown"} tone={entry.truthLabel === "estimated" ? "warn" : "neutral"} />
                                                <Pill label="Confidence" value={`${Math.round(((entry.confidenceScore || 0) as number) * 100)}%`} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Recovered watch" value={`${Math.round(((entry.recoveredWatchTimeMs || 0) as number) / 1000)}s`} />
                                            <Pill label="Completion repairs" value={entry.repairedCompletionCount || 0} />
                                            <Pill label="Provenance" value={entry.provenance || "unknown"} />
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No telemetry repair rows are present in the current truth window.</div>}
                            </div>
                        </ScrollWrap>
                    </div>

                    <div className="space-y-4">
                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.analyticsTruthDrops || []).length ? (data?.analyticsTruthDrops || []).map((entry: any) => (
                                    <div key={entry.dropId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.dropId}</p>
                                                <p className="text-xs text-gray-400">Finalized views {entry.truthLayers?.finalized?.finalized_view_count ?? 0} · watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} />
                                                <Pill label="Repaired" value={`${Math.round(((entry.repairedDataRatio || 0) as number) * 100)}%`} tone={((entry.repairedDataRatio || 0) as number) > 0.15 ? "warn" : "good"} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Raw views" value={entry.truthLayers?.raw?.raw_view_count ?? 0} />
                                            <Pill label="Validated" value={entry.truthLayers?.validated?.deduped_view_count ?? 0} />
                                            <Pill label="Estimated views" value={entry.truthLayers?.estimated?.estimated_recovered_view_count ?? 0} />
                                            <Pill label="Dupes" value={`${Math.round(((entry.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) * 100)}%`} />
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-amber-100">No per-drop analytics truth rows are available yet. Run the reconciliation job or wait for the scheduled pass.</div>}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(data?.analyticsTruthUsers || []).length ? (data?.analyticsTruthUsers || []).map((entry: any) => (
                                    <div key={entry.userId} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.userId}</p>
                                                <p className="text-xs text-gray-400">Watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s · unique viewers {entry.truthLayers?.finalized?.finalized_unique_viewers ?? 0}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} />
                                                <Pill label="Confidence" value={`${Math.round(((entry.confidenceScore || 0) as number) * 100)}%`} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Sessions" value={entry.truthLayers?.validated?.total_drop_view_sessions ?? 0} />
                                            <Pill label="Unlocks" value={entry.truthLayers?.finalized?.unlock_count ?? 0} />
                                            <Pill label="Estimated watch" value={`${Math.round(((entry.truthLayers?.estimated?.estimated_watch_time_ms ?? 0) as number) / 1000)}s`} />
                                            <Pill label="Raw gaps" value={entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0} tone={(entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0) > 0 ? "warn" : "good"} />
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-amber-100">No per-user analytics truth rows are available yet.</div>}
                            </div>
                        </ScrollWrap>
                    </div>
                </div>
            </Section>
        </>
    );
}
