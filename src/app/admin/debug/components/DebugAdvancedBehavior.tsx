"use client";

import { Pill, StatCard, Section, ScrollWrap, badgeForSourceStatus, toneForSourceStatus, truthStateForSourceStatus } from "./DebugPrimitives";

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

function formatSecondsLabel(seconds?: number) {
    const totalSeconds = Math.max(0, Math.round(seconds ?? 0));
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    if (minutes <= 0) return `${remainingSeconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
}

function formatUserWatchQualityReason(reason?: string) {
    switch (reason) {
        case "raw_gaps_present":
            return "raw_gaps_present: raw watch evidence gaps were found in this user sample.";
        case "exact_invalid_due_to_raw_gaps":
            return "exact_invalid_due_to_raw_gaps: raw gaps prevent this row from staying exact quality.";
        case "confidence_formula_missing":
            return "confidence_formula_missing: confidence could not be fully justified from the current evidence pack.";
        case "exact_quality_downgraded":
            return "exact_quality_downgraded: estimated or fallback watch forced this row out of exact quality.";
        default:
            return reason || "unknown";
    }
}

const DEBUG_VALUE_NOT_LOADED = "Not loaded";

function countWhenPanelLoaded(panelLoaded: boolean, value: unknown) {
    return panelLoaded && typeof value === "number" ? value : DEBUG_VALUE_NOT_LOADED;
}

function valueWhenPanelLoaded(panelLoaded: boolean, value: unknown, fallback = "unknown"): string | number {
    if (!panelLoaded) return DEBUG_VALUE_NOT_LOADED;
    if (typeof value === "number" || typeof value === "string") return value;
    return fallback;
}

export function DebugAdvancedBehavior({ data }: DebugAdvancedBehaviorProps) {
    const panel = data?.behavioralIntelligencePanel;
    const recoveryPanel = data?.telemetryTruthRecoveryPanel;
    const behaviorPanelLoaded = Boolean(panel);
    const recoveryPanelLoaded = Boolean(recoveryPanel);
    const behavioralSourceStatus = panel?.sourceStatus?.status;
    const recoverySourceStatus = recoveryPanel?.sourceStatus?.status;
    const behavioralTruthState = truthStateForSourceStatus(behavioralSourceStatus?.status);
    const behavioralBadgeLabel = badgeForSourceStatus(behavioralSourceStatus?.status);
    const recoveryTruthState = truthStateForSourceStatus(recoverySourceStatus?.status);
    const recoveryBadgeLabel = badgeForSourceStatus(recoverySourceStatus?.status);
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
                        <Pill label="Source state" value={behavioralSourceStatus?.status || "unknown"} tone={toneForSourceStatus(behavioralSourceStatus?.status)} truthState={behavioralTruthState} badgeLabel={behavioralBadgeLabel} />
                        <Pill label="User profiles" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.userProfiles)} truthState={behavioralTruthState} badgeLabel={behavioralBadgeLabel} />
                        <Pill label="Drop profiles" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.dropProfiles)} truthState={behavioralTruthState} badgeLabel={behavioralBadgeLabel} />
                        <Pill label="Ranking mode" value={behaviorPanelLoaded ? rankingModeLabel : DEBUG_VALUE_NOT_LOADED} tone={behaviorPanelLoaded && panel?.activeRankingMode !== "unknown" ? "good" : "warn"} truthState={behaviorPanelLoaded ? (panel?.activeRankingMode === "unknown" ? "degraded" : "live") : behavioralTruthState} badgeLabel={behaviorPanelLoaded ? "LOADED" : behavioralBadgeLabel} />
                        <Pill label="Freshness" value={valueWhenPanelLoaded(behaviorPanelLoaded, panel?.overallFreshnessState)} tone={panel?.overallFreshnessState === "live" ? "good" : "warn"} truthState={behaviorPanelLoaded ? (panel?.overallFreshnessState === "live" ? "live" : "degraded") : behavioralTruthState} badgeLabel={behaviorPanelLoaded ? "LOADED" : behavioralBadgeLabel} />
                    </>
                }
            >
                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="space-y-3">
                        <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Snapshot status</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Pill label="Users" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.userProfiles)} truthState={behavioralTruthState} badgeLabel={behavioralBadgeLabel} />
                                <Pill label="Guests" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.guestProfiles)} truthState={behavioralTruthState} badgeLabel={behavioralBadgeLabel} />
                                <Pill label="Drops" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.dropProfiles)} truthState={behavioralTruthState} badgeLabel={behavioralBadgeLabel} />
                                <Pill label="Rebuild freshness" value={valueWhenPanelLoaded(behaviorPanelLoaded, panel?.rebuildFreshnessState)} tone={panel?.rebuildFreshnessState === "live" ? "good" : "warn"} truthState={behaviorPanelLoaded ? (panel?.rebuildFreshnessState === "live" ? "live" : "degraded") : behavioralTruthState} badgeLabel={behaviorPanelLoaded ? "LOADED" : behavioralBadgeLabel} />
                                <Pill label="Drop freshness" value={valueWhenPanelLoaded(behaviorPanelLoaded, panel?.dropProfileFreshnessState)} tone={panel?.dropProfileFreshnessState === "live" ? "good" : "warn"} truthState={behaviorPanelLoaded ? (panel?.dropProfileFreshnessState === "live" ? "live" : "degraded") : behavioralTruthState} badgeLabel={behaviorPanelLoaded ? "LOADED" : behavioralBadgeLabel} />
                                <Pill label="ML validation" value={behaviorPanelLoaded ? mlValidationLabel : DEBUG_VALUE_NOT_LOADED} tone={panel?.mlValidationState === "active" ? "good" : panel?.mlValidationState === "missing" ? "bad" : "warn"} truthState={behaviorPanelLoaded ? (panel?.mlValidationState === "active" ? "live" : panel?.mlValidationState === "missing" ? "failed" : "degraded") : behavioralTruthState} badgeLabel={behaviorPanelLoaded ? "LOADED" : behavioralBadgeLabel} />
                                <Pill label="Connected modules" value={behaviorPanelLoaded ? `${panel?.connectedModuleCount ?? 0}/9` : DEBUG_VALUE_NOT_LOADED} tone={behaviorPanelLoaded && (panel?.missingModuleCount ?? 0) === 0 ? "good" : "warn"} truthState={behaviorPanelLoaded ? ((panel?.missingModuleCount ?? 0) === 0 ? "live" : "degraded") : behavioralTruthState} badgeLabel={behaviorPanelLoaded ? "LOADED" : behavioralBadgeLabel} />
                            </div>
                            <p className="mt-3 text-sm text-gray-300">
                                Latest rebuild {panel?.latestRebuildAtUtc ? formatRelative(Date.parse(panel.latestRebuildAtUtc)) : "unknown"}.
                                Source window starts {panel?.sourceWindowStartUtc || "unknown"} and ends {panel?.sourceWindowEndUtc || "unknown"}.
                            </p>
                            <p className="mt-2 text-sm text-gray-400">{panel?.overallFreshnessExplanation || "Behavioral freshness is not available."}</p>
                            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <StatCard label="Sample size" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.sampleSize)} meta={`${behavioralSourceStatus?.nextAction || "ML stays deterministic below 50 samples and experimental below 200."}`} truthState={behavioralTruthState} />
                                <StatCard label="Precision@5" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.validationMetrics?.precisionAt5)} meta={`Baseline ${behaviorPanelLoaded ? panel?.validationMetrics?.baselineComparison || "not_tested" : "not loaded"}`} truthState={behaviorPanelLoaded ? "live" : behavioralTruthState} />
                                <StatCard label="Calibration error" value={countWhenPanelLoaded(behaviorPanelLoaded, panel?.validationMetrics?.calibrationError)} meta={`Confidence formula: ${behaviorPanelLoaded ? panel?.confidenceFormula || "missing" : "not loaded"}`} truthState={behaviorPanelLoaded ? "live" : behavioralTruthState} />
                                <StatCard label="Deterministic baseline" value={valueWhenPanelLoaded(behaviorPanelLoaded, panel?.deterministicBaselineState, "missing")} meta={`Model v${behaviorPanelLoaded ? panel?.modelVersion || "unknown" : "not loaded"}`} truthState={behaviorPanelLoaded ? (panel?.deterministicBaselineState === "available" ? "live" : "failed") : behavioralTruthState} />
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
                        <Pill label="Source state" value={recoverySourceStatus?.status || "unknown"} tone={toneForSourceStatus(recoverySourceStatus?.status)} truthState={recoveryTruthState} badgeLabel={recoveryBadgeLabel} />
                        <Pill label="Drop metrics" value={countWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.dropMetricCount)} truthState={recoveryTruthState} badgeLabel={recoveryBadgeLabel} />
                        <Pill label="User metrics" value={countWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.userMetricCount)} truthState={recoveryTruthState} badgeLabel={recoveryBadgeLabel} />
                        <Pill label="Repairs" value={countWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.openRepairCount)} tone={recoveryPanelLoaded && (recoveryPanel?.openRepairCount ?? 0) > 0 ? "warn" : "good"} truthState={recoveryPanelLoaded ? ((recoveryPanel?.openRepairCount ?? 0) > 0 ? "degraded" : "live") : recoveryTruthState} badgeLabel={recoveryPanelLoaded ? "LOADED" : recoveryBadgeLabel} />
                        <Pill label="Quality" value={valueWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.qualityState)} tone={recoveryPanel?.qualityState === "verified" ? "good" : "warn"} truthState={recoveryPanelLoaded ? (recoveryPanel?.qualityState === "verified" ? "live" : "degraded") : recoveryTruthState} badgeLabel={recoveryPanelLoaded ? "LOADED" : recoveryBadgeLabel} />
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
                                <Pill label="Freshness" value={valueWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.freshnessState)} tone={recoveryPanel?.freshnessState === "live" ? "good" : "warn"} truthState={recoveryPanelLoaded ? (recoveryPanel?.freshnessState === "live" ? "live" : "degraded") : recoveryTruthState} badgeLabel={recoveryPanelLoaded ? "LOADED" : recoveryBadgeLabel} />
                                <Pill label="Last rebuild" value={recoveryPanelLoaded && recoveryPanel?.lastRebuildAtUtc ? formatRelative(Date.parse(recoveryPanel.lastRebuildAtUtc)) : DEBUG_VALUE_NOT_LOADED} tone={recoveryPanel?.freshnessState === "live" ? "good" : "warn"} truthState={recoveryPanelLoaded ? (recoveryPanel?.freshnessState === "live" ? "live" : "degraded") : recoveryTruthState} badgeLabel={recoveryPanelLoaded ? "LOADED" : recoveryBadgeLabel} />
                                <Pill label="Formula state" value={valueWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.formulaState)} tone={recoveryPanel?.formulaState === "documented" ? "good" : "warn"} truthState={recoveryPanelLoaded ? (recoveryPanel?.formulaState === "documented" ? "live" : "degraded") : recoveryTruthState} badgeLabel={recoveryPanelLoaded ? "LOADED" : recoveryBadgeLabel} />
                                <Pill label="Actionable repairs" value={countWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.actionableRepairCount)} tone={recoveryPanelLoaded && (recoveryPanel?.actionableRepairCount ?? 0) > 0 ? "warn" : "good"} truthState={recoveryPanelLoaded ? ((recoveryPanel?.actionableRepairCount ?? 0) > 0 ? "degraded" : "live") : recoveryTruthState} badgeLabel={recoveryPanelLoaded ? "LOADED" : recoveryBadgeLabel} />
                                <Pill label="Inspect-only" value={countWhenPanelLoaded(recoveryPanelLoaded, recoveryPanel?.inspectOnlyRepairCount)} tone="neutral" truthState={recoveryPanelLoaded ? "live" : recoveryTruthState} badgeLabel={recoveryPanelLoaded ? "LOADED" : recoveryBadgeLabel} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <StatCard label="Observed views" value={recoveryPanel?.observedViews ?? 0} meta={recoveryPanel?.formulas?.observedViews || "Observed formula missing. ACTIONABLE: document observed view formula."} truthState={truthStateForSourceStatus(recoverySourceStatus?.status)} />
                                <StatCard label="Checked views" value={recoveryPanel?.checkedViews ?? 0} meta={recoveryPanel?.formulas?.checkedViews || "Checked formula missing. ACTIONABLE: document checked view formula."} truthState={truthStateForSourceStatus(recoverySourceStatus?.status)} />
                                <StatCard label="Final views" value={recoveryPanel?.finalViews ?? 0} meta={recoveryPanel?.formulas?.finalViews || "Final formula missing. ACTIONABLE: document final view formula."} truthState={truthStateForSourceStatus(recoverySourceStatus?.status)} />
                                <StatCard label="Estimated ratio" value={`${recoveryPanel?.estimatedRatioPct ?? 0}%`} meta={recoveryPanel?.formulas?.estimatedRatio || "Estimated formula missing. ACTIONABLE: document estimated ratio formula."} truthState={recoveryPanel?.qualityState === "estimated" || recoveryPanel?.qualityState === "degraded" ? "legacy_fallback" : truthStateForSourceStatus(recoverySourceStatus?.status)} />
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
                                {(recoveryPanel?.dropRows || []).length ? (recoveryPanel?.dropRows || []).map((entry: any) => (
                                    <div
                                        key={entry.dropId}
                                        className="space-y-2 px-4 py-3"
                                        data-drop-recovery-drop-id={entry.dropId}
                                        data-drop-recovery-identity-state={entry.dropIdentityState || "missing"}
                                        data-drop-recovery-quality={entry.quality || "unknown"}
                                        data-drop-recovery-raw-views={entry.rawViews ?? 0}
                                        data-drop-recovery-validated-views={entry.validatedViews ?? 0}
                                        data-drop-recovery-estimated-views={entry.estimatedViews ?? 0}
                                        data-drop-recovery-finalized-views={entry.finalizedViews ?? 0}
                                        data-drop-recovery-duplicate-rate={entry.duplicateRatePct ?? 0}
                                        data-drop-recovery-repaired-pct={entry.repairedPct ?? 0}
                                        data-drop-recovery-formula-state={entry.warnings?.includes("finalized_formula_mismatch") ? "review" : "documented"}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.dropTitle || "Unknown drop"}</p>
                                                <p className="text-xs text-gray-400">
                                                    Creator: {entry.creatorName || "Unknown creator"} - Drop ID: {entry.shortDropId || "unknown"}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Final reporting views {entry.finalizedViews ?? 0} - watch {entry.watchDurationDisplay || "0s"}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.quality || "unknown"} tone={entry.quality === "verified" ? "good" : "warn"} truthState={entry.quality === "verified" ? "live" : "degraded"} badgeLabel="LOADED" />
                                                <Pill label="Recovery share" value={`${entry.repairedPct ?? 0}%`} tone={(entry.repairedPct ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Duplicate rate" value={`${entry.duplicateRatePct ?? 0}%`} tone={(entry.duplicateRatePct ?? 0) > 10 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Observed raw views" value={entry.rawViews ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Validated views" value={entry.validatedViews ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Estimated/recovered views" value={entry.estimatedViews ?? 0} tone={(entry.estimatedViews ?? 0) > 0 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Final reporting views" value={entry.finalizedViews ?? 0} truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        <p className="text-xs text-gray-300">Observed raw views: {entry.metricExplanation?.rawViews}</p>
                                        <p className="text-xs text-gray-300">Validated views: {entry.metricExplanation?.validatedViews}</p>
                                        <p className="text-xs text-gray-300">Estimated/recovered views: {entry.metricExplanation?.estimatedViews}</p>
                                        <p className="text-xs text-gray-300">Final reporting views: {entry.metricExplanation?.finalizedViews}</p>
                                        <p className="text-xs text-gray-300">Duplicate rate: {entry.metricExplanation?.duplicateRate}</p>
                                        <p className="text-xs text-gray-300">Recovery share: {entry.metricExplanation?.repairedPct}</p>
                                        {!!(entry.warnings || []).length && (
                                            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">
                                                {(entry.warnings || []).map((warning: string) => (
                                                    <p key={warning}>{warning}</p>
                                                ))}
                                            </div>
                                        )}
                                        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
                                            <summary className="cursor-pointer text-sm text-gray-200">Identity details</summary>
                                            <div className="mt-3 space-y-2 text-xs text-gray-400">
                                                <p>dropId: {entry.dropId}</p>
                                                <p>adminDropHref: {entry.adminDropHref || "none"}</p>
                                                <p>watchSeconds: {entry.watchSeconds ?? 0}</p>
                                                <p>dropIdentityState: {entry.dropIdentityState || "missing"}</p>
                                            </div>
                                        </details>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-amber-100">No per-drop analytics truth rows are available yet. Run the reconciliation job or wait for the scheduled pass.</div>}
                            </div>
                        </ScrollWrap>

                        <ScrollWrap>
                            <div className="divide-y divide-white/10 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                                {(recoveryPanel?.userRows || []).length ? (recoveryPanel?.userRows || []).map((entry: any) => (
                                    <div
                                        key={entry.userId || entry.shortUserId}
                                        className="space-y-2 px-4 py-3"
                                        data-user-watch-user-id={entry.userId || "missing"}
                                        data-user-watch-identity-state={entry.userIdentityState || "missing"}
                                        data-user-watch-total-seconds={entry.totalWatchSeconds ?? 0}
                                        data-user-watch-verified-seconds={entry.verifiedWatchSeconds ?? 0}
                                        data-user-watch-estimated-seconds={entry.estimatedWatchSeconds ?? 0}
                                        data-user-watch-fallback-seconds={entry.fallbackWatchSeconds ?? 0}
                                        data-user-watch-quality={entry.quality || "unknown"}
                                        data-user-watch-confidence={entry.confidencePct ?? 0}
                                        data-user-watch-raw-gaps={entry.rawGapCount ?? 0}
                                        data-user-watch-quality-reason={(entry.qualityReasons || []).join(" | ") || "none"}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{entry.userDisplayName || "Unknown user"}</p>
                                                <p className="text-xs text-gray-400">
                                                    {entry.username ? `@${entry.username} · ` : ""}UID {entry.shortUserId || "unknown"} · Watch {entry.watchDurationDisplay || formatSecondsLabel(entry.totalWatchSeconds)} · unique viewers {entry.uniqueViewerCount ?? 0}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Quality" value={entry.quality || "unknown"} tone={entry.quality === "exact" ? "good" : entry.quality === "estimated" || entry.quality === "fallback" || entry.quality === "mixed" ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Confidence" value={`${entry.confidencePct ?? 0}%`} tone={(entry.confidencePct ?? 0) >= 85 ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Sessions" value={entry.sessionCount ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Unlocks" value={entry.unlockCount ?? 0} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Verified watch" value={formatSecondsLabel(entry.verifiedWatchSeconds)} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Estimated watch" value={formatSecondsLabel(entry.estimatedWatchSeconds)} tone={(entry.estimatedWatchSeconds ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Fallback watch" value={formatSecondsLabel(entry.fallbackWatchSeconds)} tone={(entry.fallbackWatchSeconds ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                            <Pill label="Raw gaps" value={entry.rawGapCount ?? 0} tone={(entry.rawGapCount ?? 0) > 0 ? "warn" : "good"} truthState="live" badgeLabel="LOADED" />
                                        </div>
                                        <p className="text-xs text-gray-300">{entry.mathExplanation?.totalWatch}</p>
                                        <p className="text-xs text-gray-300">{entry.mathExplanation?.rawGaps}</p>
                                        <p className="text-xs text-gray-300">{entry.mathExplanation?.confidence}</p>
                                        {(entry.qualityReasons || []).length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {(entry.qualityReasons || []).map((reason: string) => (
                                                    <Pill key={`${entry.userId}-${reason}`} label="Reason" value={formatUserWatchQualityReason(reason)} tone="warn" truthState="live" badgeLabel="LOADED" />
                                                ))}
                                            </div>
                                        ) : null}
                                        <details className="rounded-xl border border-white/10 bg-black/10 p-3">
                                            <summary className="cursor-pointer text-sm text-gray-200">User watch math details</summary>
                                            <div className="mt-3 space-y-2 text-xs text-gray-400">
                                                <p>Verified watch: {formatSecondsLabel(entry.verifiedWatchSeconds)} ({entry.verifiedWatchSeconds ?? 0}s)</p>
                                                <p>Estimated watch: {formatSecondsLabel(entry.estimatedWatchSeconds)} ({entry.estimatedWatchSeconds ?? 0}s)</p>
                                                <p>Fallback watch: {formatSecondsLabel(entry.fallbackWatchSeconds)} ({entry.fallbackWatchSeconds ?? 0}s)</p>
                                                <p>Raw gaps: {entry.rawGapCount ?? 0}</p>
                                                <p>{entry.mathExplanation?.verifiedWatch}</p>
                                                <p>{entry.mathExplanation?.estimatedWatch}</p>
                                                <p>{entry.mathExplanation?.fallbackWatch}</p>
                                                <p>Admin user: {entry.adminUserHref || "none"}</p>
                                                <p>Full UID: {entry.userId || "missing"}</p>
                                            </div>
                                        </details>
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
