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
    const recoveryPanel = data?.telemetryTruthRecoveryPanel;
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
                                            <p className="text-xs text-gray-400">{entry.creatorName || "Unknown creator"} - {entry.dropId}</p>
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
                                    <p className="text-xs text-gray-400">Top reasons: {(entry.topReasons || []).length ? entry.topReasons.join(" - ") : "No strong ranking reason surfaced in the sampled profile."}</p>
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
                summary={
                    <>
                        <Pill label="Drop metrics" value={recoveryPanel?.dropMetricCount ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="User metrics" value={recoveryPanel?.userMetricCount ?? 0} truthState="live" badgeLabel="LOADED" />
                        <Pill label="Repairs" value={recoveryPanel?.openRepairCount ?? 0} tone={(recoveryPanel?.openRepairCount ?? 0) > 0 ? "warn" : "good"} truthState={(recoveryPanel?.openRepairCount ?? 0) > 0 ? "degraded" : "live"} badgeLabel="LOADED" />
                        <Pill label="Quality" value={recoveryPanel?.qualityState || "unknown"} tone={recoveryPanel?.qualityState === "verified" ? "good" : "warn"} truthState={recoveryPanel?.qualityState === "verified" ? "live" : "degraded"} badgeLabel="LOADED" />
                    </>
                }
            >
                <div
                    className="grid gap-4 lg:grid-cols-1"
                    data-telemetry-truth-last-rebuild-at-utc={recoveryPanel?.lastRebuildAtUtc || "unknown"}
                    data-telemetry-truth-freshness-state={recoveryPanel?.freshnessState || "unknown"}
                    data-telemetry-truth-quality-state={recoveryPanel?.qualityState || "unknown"}
                    data-telemetry-truth-estimated-ratio={recoveryPanel?.estimatedRatioPct ?? 0}
                    data-telemetry-truth-duplicate-rate={recoveryPanel?.duplicateRatePct ?? 0}
                    data-telemetry-truth-recovered-sessions={recoveryPanel?.recoveredSessionCount ?? 0}
                    data-telemetry-truth-formula-state={recoveryPanel?.formulaState || "unknown"}
                    data-telemetry-truth-open-repairs={recoveryPanel?.openRepairCount ?? 0}
                >
                    <div className="space-y-3">
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Global truth summary</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Freshness" value={recoveryPanel?.freshnessState || "unknown"} tone={recoveryPanel?.freshnessState === "live" ? "good" : "warn"} truthState={recoveryPanel?.freshnessState === "live" ? "live" : "degraded"} badgeLabel="LOADED" />
                                <Pill label="Last rebuild" value={recoveryPanel?.lastRebuildAtUtc ? formatRelative(Date.parse(recoveryPanel.lastRebuildAtUtc)) : "unknown"} tone={recoveryPanel?.freshnessState === "live" ? "good" : "warn"} truthState={recoveryPanel?.freshnessState === "live" ? "live" : "degraded"} badgeLabel="LOADED" />
                                <Pill label="Formula state" value={recoveryPanel?.formulaState || "unknown"} tone={recoveryPanel?.formulaState === "documented" ? "good" : "warn"} truthState={recoveryPanel?.formulaState === "documented" ? "live" : "degraded"} badgeLabel="LOADED" />
                                <Pill label="Actionable repairs" value={recoveryPanel?.actionableRepairCount ?? 0} tone={(recoveryPanel?.actionableRepairCount ?? 0) > 0 ? "warn" : "good"} truthState={(recoveryPanel?.actionableRepairCount ?? 0) > 0 ? "degraded" : "live"} badgeLabel="LOADED" />
                                <Pill label="Inspect-only" value={recoveryPanel?.inspectOnlyRepairCount ?? 0} tone="neutral" truthState="live" badgeLabel="LOADED" />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <StatCard label="Observed views" value={recoveryPanel?.observedViews ?? 0} meta={recoveryPanel?.formulas?.observedViews || "Observed formula missing."} truthState={recoveryPanel ? "live" : "unavailable"} />
                                <StatCard label="Checked views" value={recoveryPanel?.checkedViews ?? 0} meta={recoveryPanel?.formulas?.checkedViews || "Checked formula missing."} truthState={recoveryPanel ? "live" : "unavailable"} />
                                <StatCard label="Final views" value={recoveryPanel?.finalViews ?? 0} meta={recoveryPanel?.formulas?.finalViews || "Final formula missing."} truthState={recoveryPanel ? "live" : "unavailable"} />
                                <StatCard label="Estimated ratio" value={`${recoveryPanel?.estimatedRatioPct ?? 0}%`} meta={recoveryPanel?.formulas?.estimatedRatio || "Estimated formula missing."} truthState={recoveryPanel?.qualityState === "estimated" || recoveryPanel?.qualityState === "degraded" ? "fallback" : recoveryPanel ? "live" : "unavailable"} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Confidence" value={`${recoveryPanel?.confidencePct ?? 0}%`} tone={(recoveryPanel?.confidencePct ?? 0) >= 85 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Duplicate rate" value={`${recoveryPanel?.duplicateRatePct ?? 0}%`} tone={(recoveryPanel?.duplicateRatePct ?? 0) > 10 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Recovered sessions" value={recoveryPanel?.recoveredSessionCount ?? 0} tone={(recoveryPanel?.recoveredSessionCount ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                <Pill label="Estimated views" value={recoveryPanel?.estimatedViews ?? 0} tone={(recoveryPanel?.estimatedViews ?? 0) > 0 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                            </div>
                            <p className="mt-3 text-sm text-gray-300">
                                Last rebuild {recoveryPanel?.lastRebuildAtUtc ? formatRelative(Date.parse(recoveryPanel.lastRebuildAtUtc)) : "unknown"}.
                                Observed, checked, final, and estimated layers stay separate and explicitly labeled.
                            </p>
                            <p className="mt-2 text-sm text-gray-400">
                                Verified watch excludes estimated timeout recovery. Final reporting may still include estimated watch when quality is mixed or estimated.
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                                {(recoveryPanel?.sourceLayers || []).map((layer: any) => (
                                    <StatCard
                                        key={layer.layer}
                                        label={layer.layer}
                                        value={layer.count ?? 0}
                                        meta={`${layer.source} - ${layer.explanation}`}
                                        truthState={layer.freshnessState === "live" ? "live" : "degraded"}
                                    />
                                ))}
                            </div>
                            {!!(recoveryPanel?.warnings || []).length && (
                                <div className="mt-3 space-y-1 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                                    {(recoveryPanel?.warnings || []).map((warning: string) => (
                                        <p key={warning}>{warning}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(recoveryPanel?.estimatedWatchRecoveryGroups || []).length ? (recoveryPanel?.estimatedWatchRecoveryGroups || []).map((entry: any) => (
                                    <div key={`${entry.recoveryKind}:${entry.provenance}:${entry.recoveredWatchSecondsPerSession?.mode ?? 0}`} className="space-y-3 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">Estimated session ends - {entry.provenance}</p>
                                                <p className="text-xs text-gray-400">{entry.explanation}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Layer" value={entry.layer || "estimated"} tone="warn" truthState="degraded" badgeLabel="LOADED" />
                                                <Pill label="Count" value={entry.count ?? 0} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="State" value={entry.state || "review"} tone={entry.state === "error" ? "bad" : "warn"} truthState={entry.state === "error" ? "failed" : "degraded"} badgeLabel="LOADED" />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Confidence range" value={`${entry.confidenceMin ?? 0}% - ${entry.confidenceMax ?? 0}%`} tone="warn" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Confidence avg" value={`${entry.confidenceAvg ?? 0}%`} tone="warn" truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Recovered watch total" value={`${entry.recoveredWatchSecondsTotal ?? 0}s`} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Per session mode" value={`${entry.recoveredWatchSecondsPerSession?.mode ?? 0}s`} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Completion repairs" value={entry.completionRepairCount ?? 0} truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Verified watch" value={entry.countsTowardVerifiedWatch ? "yes" : "no"} tone={entry.countsTowardVerifiedWatch ? "bad" : "good"} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Estimated watch" value={entry.countsTowardEstimatedWatch ? "yes" : "no"} tone={entry.countsTowardEstimatedWatch ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="First seen" value={entry.firstSeenAtUtc ? formatRelative(Date.parse(entry.firstSeenAtUtc)) : "unknown"} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Last seen" value={entry.lastSeenAtUtc ? formatRelative(Date.parse(entry.lastSeenAtUtc)) : "unknown"} truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        <p className="text-xs text-gray-300">Estimation formula: {entry.estimationFormula}</p>
                                        <p className="text-xs text-gray-300">Confidence factors: {entry.confidenceFactors}</p>
                                        <p className="text-xs text-gray-300">
                                            {entry.completionRepairCount > 0
                                                ? `Completion repairs changed ${entry.completionRepairCount} state(s).`
                                                : "No completion state changed. This recovery estimated session end time only; it did not mark content complete."}
                                        </p>
                                        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
                                            <summary className="cursor-pointer text-sm text-gray-200">Affected sessions (first 5)</summary>
                                            <div className="mt-3 space-y-2">
                                                {(entry.affectedSessionSample || []).map((sample: any) => (
                                                    <div key={sample.sessionId} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <Pill label="Session" value={sample.shortSessionId || "unknown"} truthState="live" badgeLabel="LOADED" />
                                                            <Pill label="Confidence" value={`${sample.confidence ?? 0}%`} tone="warn" truthState="live" badgeLabel="LOADED" />
                                                            <Pill label="Recovered watch" value={`${sample.recoveredWatchSeconds ?? 0}s`} truthState="live" badgeLabel="LOADED" />
                                                            <Pill label="Provenance" value={sample.provenance || "unknown"} truthState="live" badgeLabel="LOADED" />
                                                        </div>
                                                        <p className="mt-2 text-xs text-gray-400">
                                                            {(sample.dropTitle || sample.dropId || "Unknown drop")} · {(sample.actorDisplayName || sample.userId || "Unknown user")} · {sample.createdAtUtc || "Unknown repair time"}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No estimated session-end recovery groups are present in the current truth window.</div>}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(recoveryPanel?.repairGroups || []).length ? (recoveryPanel?.repairGroups || []).map((entry: any) => (
                                    <div key={`${entry.repairType}:${entry.actionability}`} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.repairType}</p>
                                                <p className="text-xs text-gray-400">{entry.explanation}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Count" value={entry.count ?? 0} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Actionability" value={entry.actionability === "actionable" ? "Actionable repairs" : "Inspect-only"} tone={entry.actionability === "actionable" ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Latest" value={entry.latestAtUtc ? formatRelative(Date.parse(entry.latestAtUtc)) : "unknown"} truthState="live" badgeLabel="LOADED" />
                                            </div>
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
                                                <p className="text-xs text-gray-400">Finalized views {entry.truthLayers?.finalized?.finalized_view_count ?? 0} - watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Repaired" value={`${Math.round(((entry.repairedDataRatio || 0) as number) * 100)}%`} tone={((entry.repairedDataRatio || 0) as number) > 0.15 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Raw views" value={entry.truthLayers?.raw?.raw_view_count ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Validated" value={entry.truthLayers?.validated?.deduped_view_count ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Estimated views" value={entry.truthLayers?.estimated?.estimated_recovered_view_count ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Dupes" value={`${Math.round(((entry.truthLayers?.validated?.duplicate_event_rate ?? 0) as number) * 100)}%`} truthState="live" badgeLabel="LOADED" />
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
                                                <p className="text-xs text-gray-400">Watch {Math.round(((entry.truthLayers?.finalized?.finalized_watch_time_ms ?? 0) as number) / 1000)}s - unique viewers {entry.truthLayers?.finalized?.finalized_unique_viewers ?? 0}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.qualityLabel || "unknown"} tone={entry.qualityLabel === "exact" ? "good" : entry.qualityLabel === "estimated" ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Confidence" value={`${Math.round(((entry.confidenceScore || 0) as number) * 100)}%`} truthState="live" badgeLabel="LOADED" />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Sessions" value={entry.truthLayers?.validated?.total_drop_view_sessions ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Unlocks" value={entry.truthLayers?.finalized?.unlock_count ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Estimated watch" value={`${Math.round(((entry.truthLayers?.estimated?.estimated_watch_time_ms ?? 0) as number) / 1000)}s`} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Raw gaps" value={entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0} tone={(entry.truthLayers?.estimated?.raw_coverage_gap_count ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
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
