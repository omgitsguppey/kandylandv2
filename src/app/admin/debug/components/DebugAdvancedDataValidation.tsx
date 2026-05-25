"use client";

import { useMemo } from "react";

import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { buildAdvancedTelemetryParityUiState } from "@/lib/analytics/advanced-telemetry-parity-ui";
import { buildDataValidationUiSemantics, buildValidationReadinessSummary } from "@/lib/analytics/validation-readiness-contract";
import type { AnalyticsModuleCoverage, AnalyticsSourceHealth, DataValidationPanelState, TelemetryParityValidation, ValidationItem } from "@/types/admin-analytics";

import { Pill, ScrollWrap, Section, type PillTone } from "./DebugPrimitives";

type ValidationResponse = {
    success?: boolean;
    generatedAtMs?: number;
    cacheState?: "miss" | "fresh" | "stale";
    cacheRevalidating?: boolean;
    validations?: ValidationItem[];
    dataValidation?: DataValidationPanelState;
    analyticsSourceHealth?: AnalyticsSourceHealth;
    telemetryParityValidation?: TelemetryParityValidation;
    analyticsModuleCoverage?: AnalyticsModuleCoverage;
};

const DEBUG_VALIDATION_PATH = "/admin/debug?tab=advanced#data-validation";

function toneForStatus(status?: string): PillTone {
    if (status === "pass") return "good";
    if (status === "fail" || status === "unavailable") return "bad";
    return "warn";
}

function toneForPanelState(status: DataValidationPanelState["status"]): PillTone {
    if (status === "failed") return "bad";
    if (status === "stale" || status === "not_validated") return "warn";
    if (status === "loaded") return "good";
    return "neutral";
}

function groupForCheck(check: ValidationItem) {
    const key = check.checkKey || check.label.toLowerCase().replaceAll(" ", "_");
    if (key.includes("ga") || key.includes("freshness") || key.includes("legacy") || key.includes("continuity") || key.includes("recent_6_day") || key.includes("source_agreement_chart_readiness") || key.includes("historical_snapshot")) return "Analytics source health";
    if (key.includes("purchase") || key.includes("creator")) return "Commerce parity";
    if (key.includes("unlock") || key.includes("watch") || key.includes("viewer")) return "Unlock/watch parity";
    if (key.includes("onboarding") || key.includes("task")) return "Onboarding/task parity";
    if (key.includes("module")) return "Module coverage";
    return "Telemetry parity";
}

function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not validated";
    return new Date(timestamp).toLocaleString();
}

function formatUtcTimestamp(value?: string | null) {
    if (!value) return "Not validated";
    return new Date(value).toLocaleString();
}

function countDisplay(value: number | null) {
    return value === null ? "--" : value;
}

function formatConfidence(value?: number | null) {
    return value === null || value === undefined ? "n/a" : value;
}

function truthStateForValidationRow(check: ValidationItem) {
    if (check.passAllowed === false || check.status === "fail" || check.status === "unavailable") return "blocked" as const;
    if (check.status === "warn" || check.status === "unknown") return "review" as const;
    if (check.status === "stale" || check.freshnessState === "stale") return "stale" as const;
    return "live" as const;
}

function toneForContinuity(status?: AnalyticsSourceHealth["continuity"]["gapSeverity"] | AnalyticsSourceHealth["chartReadiness"]["state"]) {
    if (status === "error" || status === "gap_detected" || status === "source_disagreement") return "bad" as const;
    if (status === "review" || status === "info" || status === "partial") return "warn" as const;
    return "neutral" as const;
}

function toneForReadinessState(status?: string): PillTone {
    if (status === "ready" || status === "pass") return "good";
    if (status === "fail" || status === "failed" || status === "blocked" || status === "source_disagreement" || status === "unavailable") return "bad";
    if (status === "partial" || status === "review" || status === "stale" || status === "not_validated") return "warn";
    return "neutral";
}

function formatDayList(days: string[]) {
    return days.length > 0 ? days.join(", ") : "None";
}

function buildFallbackPanelState(response?: ValidationResponse): DataValidationPanelState {
    const validations = response?.validations ?? [];
    const generatedAtUtc = response?.generatedAtMs ? new Date(response.generatedAtMs).toISOString() : null;

    if (validations.length === 0) {
        return {
            status: "not_validated",
            checkCount: null,
            failCount: null,
            warnCount: null,
            staleCount: null,
            blockedPassCount: null,
            range: "30d",
            cacheState: response?.cacheState === "fresh" ? "hit" : response?.cacheState ?? (generatedAtUtc ? "unknown" : "not_loaded"),
            lastValidatedAtUtc: null,
            generatedAtUtc,
            sourcePath: DEBUG_VALIDATION_PATH,
            nextAction: "Validation has not run for this range yet.",
        };
    }

    const failCount = validations.filter((check) => check.status === "fail" || check.status === "unavailable").length;
    const warnCount = validations.filter((check) => check.status === "warn" || check.status === "unknown").length;
    const staleCount = validations.filter((check) => check.status === "stale" || check.freshnessState === "stale").length;
    const blockedPassCount = validations.filter((check) => check.passAllowed === false).length;
    const lastValidatedAtMs = validations.reduce((latest, check) => Math.max(latest, check.lastValidatedAt ?? 0), 0);

    return {
        status: failCount > 0 ? "failed" : staleCount > 0 ? "stale" : "loaded",
        checkCount: validations.length,
        failCount,
        warnCount,
        staleCount,
        blockedPassCount,
        range: validations[0]?.selectedRange || "30d",
        cacheState: response?.cacheState === "fresh" ? "hit" : response?.cacheState ?? "unknown",
        lastValidatedAtUtc: lastValidatedAtMs ? new Date(lastValidatedAtMs).toISOString() : null,
        generatedAtUtc,
        sourcePath: DEBUG_VALIDATION_PATH,
        nextAction: failCount > 0
            ? "Review failed validation rows before trusting analytics parity."
            : staleCount > 0 || warnCount > 0 || blockedPassCount > 0
                ? "Review warnings, stale checks, or blocked passes before treating validation as clean."
                : "No action required.",
    };
}

export function DebugAdvancedDataValidation() {
    const { data, error, isLoading } = useAdminPollingSWR<ValidationResponse>(
        "/api/admin/analytics/historical?section=dataValidation&period=30d",
        60000,
        {
            keepPreviousData: true,
            revalidateOnFocus: false,
        },
    );

    const validations = useMemo(() => data?.validations ?? [], [data?.validations]);
    const analyticsSourceHealth = data?.analyticsSourceHealth;
    const analyticsModuleCoverage = data?.analyticsModuleCoverage;
    const panelState = useMemo<DataValidationPanelState>(() => {
        if (error) {
            return {
                status: "failed",
                checkCount: null,
                failCount: null,
                warnCount: null,
                staleCount: null,
                blockedPassCount: null,
                range: data?.dataValidation?.range || "30d",
                cacheState: data?.dataValidation?.cacheState || "unknown",
                lastValidatedAtUtc: data?.dataValidation?.lastValidatedAtUtc || null,
                generatedAtUtc: data?.dataValidation?.generatedAtUtc || (data?.generatedAtMs ? new Date(data.generatedAtMs).toISOString() : null),
                sourcePath: data?.dataValidation?.sourcePath || DEBUG_VALIDATION_PATH,
                loadError: error instanceof Error ? error.message : "Validation route could not load.",
                nextAction: "Retry the validation route or inspect admin analytics historical route errors.",
            };
        }

        if (!data && isLoading) {
            return {
                status: "loading",
                checkCount: null,
                failCount: null,
                warnCount: null,
                staleCount: null,
                blockedPassCount: null,
                range: "30d",
                cacheState: "not_loaded",
                lastValidatedAtUtc: null,
                generatedAtUtc: null,
                sourcePath: DEBUG_VALIDATION_PATH,
                nextAction: "Loading validation checks...",
            };
        }

        return data?.dataValidation ?? buildFallbackPanelState(data);
    }, [data, error, isLoading]);

    const summary = useMemo(() => {
        const grouped = validations.reduce<Record<string, ValidationItem[]>>((accumulator, check) => {
            const group = groupForCheck(check);
            accumulator[group] = [...(accumulator[group] ?? []), check];
            return accumulator;
        }, {});

        return {
            grouped,
            issueCount: (panelState.failCount ?? 0) + (panelState.warnCount ?? 0) + (panelState.staleCount ?? 0),
        };
    }, [panelState.failCount, panelState.warnCount, panelState.staleCount, validations]);

    const semanticSummary = useMemo(() => {
        const sourceAgreementFailed = analyticsSourceHealth?.sourceAgreement.state === "failed";
        return buildValidationReadinessSummary({
            chartReadiness: {
                availability: analyticsSourceHealth
                    ? [analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("fail")
                        ? "fail"
                        : [analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("review")
                            ? "review"
                            : "pass"
                    : "unavailable",
                continuity: analyticsSourceHealth?.continuity.gapSeverity ?? "error",
                missingDays: analyticsSourceHealth?.continuity.missingDays ?? [],
                recentGaps: analyticsSourceHealth?.continuity.recentGapDays ?? [],
            },
            sourceAgreement: {
                sources: analyticsSourceHealth?.sourceAgreement.comparedSources ?? [],
                failedSources: sourceAgreementFailed ? analyticsSourceHealth?.sourceAgreement.failedSources ?? analyticsSourceHealth?.sourceAgreement.comparedSources ?? [] : [],
                reason: sourceAgreementFailed ? analyticsSourceHealth?.sourceAgreement.reason ?? "Compared analytics sources disagree for the selected range." : undefined,
            },
            validations,
        });
    }, [analyticsSourceHealth, validations]);

    const sourceAgreementFailureRows = useMemo(() => validations.filter((check) => (
        (check.checkKey || "").includes("source_agreement")
        || (check.source || "").toLowerCase().includes("source agreement")
    ) && (check.status === "fail" || check.passAllowed === false)), [validations]);

    const uiSemantics = useMemo(() => buildDataValidationUiSemantics({
        chartReadinessState: semanticSummary.chartReadiness.state,
        sourceAgreementState: semanticSummary.sourceAgreement.state,
        validationParityState: semanticSummary.validationParity.state,
        blockedPassCount: semanticSummary.validationParity.blockedPassCount,
        routeLoadedSuccessfully: Boolean(data && !error),
        failedRows: sourceAgreementFailureRows.map((row) => row.checkKey || row.label),
        cacheState: panelState.cacheState,
    }), [data, error, panelState.cacheState, semanticSummary, sourceAgreementFailureRows]);

    const effectiveNextAction = uiSemantics.nextAction || panelState.nextAction;
    const defaultOpen = summary.issueCount > 0 || panelState.status !== "loaded";

    return (
        <Section
            title="Data Validation"
            subtitle="Analytics validation and parity checks live in Debug, not the Analytics insight page."
            defaultOpen={defaultOpen}
            summary={(
                <>
                    <Pill
                        label="Checks"
                        value={panelState.status === "loading"
                            ? "Loading"
                            : panelState.status === "not_validated"
                                ? "Not validated"
                                : panelState.checkCount === null
                                    ? "Unavailable"
                                    : `Loaded ${panelState.checkCount}`}
                        tone={toneForPanelState(panelState.status)}
                    />
                    <Pill label="Fail" value={countDisplay(panelState.failCount)} tone={panelState.failCount && panelState.failCount > 0 ? "bad" : "neutral"} />
                    <Pill label="Warn" value={countDisplay(panelState.warnCount)} tone={panelState.warnCount && panelState.warnCount > 0 ? "warn" : "neutral"} />
                    <Pill label="Stale" value={countDisplay(panelState.staleCount)} tone={panelState.staleCount && panelState.staleCount > 0 ? "warn" : "neutral"} />
                    <Pill label="Blocked pass" value={countDisplay(panelState.blockedPassCount)} tone={panelState.blockedPassCount && panelState.blockedPassCount > 0 ? "warn" : "neutral"} />
                    <Pill label="Chart readiness" value={semanticSummary.chartReadiness.state} tone={toneForReadinessState(semanticSummary.chartReadiness.state)} />
                    <Pill label="Source agreement" value={semanticSummary.sourceAgreement.state} tone={toneForReadinessState(semanticSummary.sourceAgreement.state)} />
                    <Pill label="Validation parity" value={semanticSummary.validationParity.state} tone={toneForReadinessState(semanticSummary.validationParity.state)} />
                </>
            )}
        >
            <div id="data-validation" className="space-y-3">
                {panelState.status === "loading" ? (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] p-3 text-sm text-gray-100">
                        Loading validation checks...
                    </div>
                ) : null}
                {panelState.status === "not_validated" ? (
                    <div className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                        Validation has not run for this range yet.
                    </div>
                ) : null}
                {panelState.status === "failed" ? (
                    <div className="rounded-[1rem] border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                        Validation failed. {effectiveNextAction}
                    </div>
                ) : null}
                <div className="grid gap-2 md:grid-cols-4">
                    {uiSemantics.summaryPills.map((pill) => (
                        <div key={pill.label} className="rounded-[0.9rem] border border-white/10 bg-white/[0.03] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{pill.label}</p>
                            <p className="mt-1 text-sm font-semibold text-white">{String(pill.state)}</p>
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Pill label="Path" value={panelState.sourcePath} truthState="live" badgeLabel="INFO" />
                    <Pill label="Range" value={panelState.range} truthState="live" badgeLabel="INFO" />
                    <Pill
                        label="Cache"
                        value={panelState.cacheState}
                        tone={panelState.cacheState === "stale" ? "warn" : "neutral"}
                        truthState={panelState.cacheState === "unknown" || panelState.cacheState === "not_loaded" ? "unavailable" : "live"}
                        badgeLabel={panelState.cacheState === "unknown" ? "UNKNOWN" : panelState.cacheState === "not_loaded" ? "NOT LOADED" : panelState.cacheState === "stale" ? "STALE" : "INFO"}
                    />
                    <Pill
                        label="Last validated"
                        value={formatUtcTimestamp(panelState.lastValidatedAtUtc)}
                        tone={panelState.lastValidatedAtUtc ? "neutral" : "warn"}
                        truthState={panelState.lastValidatedAtUtc ? "live" : "unavailable"}
                        badgeLabel={panelState.lastValidatedAtUtc ? "INFO" : "NOT VALIDATED"}
                    />
                </div>
                <p className="text-xs text-gray-400">{effectiveNextAction}</p>
                {sourceAgreementFailureRows.length > 0 ? (
                    <div className="rounded-[1rem] border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100" data-source-agreement-failures="visible">
                        <p className="font-semibold text-white">Source agreement failures</p>
                        <p className="mt-1">Failed sources: {semanticSummary.sourceAgreement.failedSources.join(", ") || "source comparison rows"}</p>
                        <div className="mt-2 space-y-1">
                            {sourceAgreementFailureRows.map((row) => (
                                <p key={row.checkKey || row.label}>
                                    {row.title || row.label}: {row.passBlockedReason || row.action || row.recommendedNextCheck || "Review the source agreement row before trusting analytics parity."}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : null}
                {panelState.checkCount !== null ? Object.entries(summary.grouped).map(([group, checks]) => (
                    <div
                        key={group}
                        className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3"
                        data-analytics-availability-state={group === "Analytics source health" ? (
                            analyticsSourceHealth
                                ? [analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("fail")
                                    ? "fail"
                                    : [analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("review")
                                        ? "review"
                                        : "pass"
                                : "unknown"
                        ) : undefined}
                        data-analytics-continuity-state={group === "Analytics source health" ? analyticsSourceHealth?.continuity.gapSeverity : undefined}
                        data-analytics-missing-day-count={group === "Analytics source health" ? analyticsSourceHealth?.continuity.missingDays.length : undefined}
                        data-analytics-recent-gap-count={group === "Analytics source health" ? analyticsSourceHealth?.continuity.recentGapDays.length : undefined}
                        data-analytics-last-complete-day-utc={group === "Analytics source health" ? analyticsSourceHealth?.continuity.lastCompleteDayUtc : undefined}
                        data-analytics-source-agreement-state={group === "Analytics source health" ? analyticsSourceHealth?.sourceAgreement.state : undefined}
                        data-analytics-chart-readiness-state={group === "Analytics source health" ? analyticsSourceHealth?.chartReadiness.state : undefined}
                    >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-white">{group}</h3>
                            <Pill label="Rows" value={checks.length} />
                        </div>
                        {group === "Analytics source health" && analyticsSourceHealth ? (
                            <div className="mb-3 space-y-2 rounded-[0.9rem] border border-white/10 bg-black/20 p-3">
                                <div className="flex flex-wrap gap-2">
                                    <Pill
                                        label="Availability"
                                        value={[analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("fail")
                                            ? "fail"
                                            : [analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("review")
                                                ? "review"
                                                : "pass"}
                                        tone={([analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("fail")
                                            ? "bad"
                                            : [analyticsSourceHealth.availability.ga4.status, analyticsSourceHealth.availability.historicalSnapshot.status, analyticsSourceHealth.availability.legacySupport.status].includes("review")
                                                ? "warn"
                                                : "good")}
                                    />
                                    <Pill label="Continuity" value={analyticsSourceHealth.continuity.gapSeverity} tone={toneForContinuity(analyticsSourceHealth.continuity.gapSeverity)} />
                                    <Pill label="Recent gaps" value={analyticsSourceHealth.continuity.recentGapDays.length} tone={analyticsSourceHealth.continuity.recentGapDays.length > 0 ? "bad" : "neutral"} />
                                    <Pill label="Last complete day" value={formatUtcTimestamp(analyticsSourceHealth.continuity.lastCompleteDayUtc)} tone={analyticsSourceHealth.continuity.lastCompleteDayUtc ? "neutral" : "warn"} />
                                    <Pill label="Range" value={analyticsSourceHealth.range} tone="neutral" />
                                    <Pill label="Chart readiness" value={analyticsSourceHealth.chartReadiness.state} tone={toneForContinuity(analyticsSourceHealth.chartReadiness.state)} />
                                </div>
                                <div className="grid gap-2 text-xs text-gray-300 md:grid-cols-2">
                                    <p><span className="font-semibold text-white">Missing days:</span> {formatDayList(analyticsSourceHealth.continuity.missingDays)}</p>
                                    <p><span className="font-semibold text-white">Recent gaps:</span> {formatDayList(analyticsSourceHealth.continuity.recentGapDays)}</p>
                                    <p><span className="font-semibold text-white">Source agreement:</span> {analyticsSourceHealth.sourceAgreement.state} across {analyticsSourceHealth.sourceAgreement.comparedSources.join(", ")}</p>
                                    <p><span className="font-semibold text-white">Agreement tolerance:</span> {analyticsSourceHealth.sourceAgreement.tolerance || "10% review / 25% fail"}</p>
                                    <p><span className="font-semibold text-white">Agreement action:</span> {analyticsSourceHealth.sourceAgreement.nextAction || "Review source agreement before parity promotion."}</p>
                                    <p><span className="font-semibold text-white">Chart readiness:</span> {analyticsSourceHealth.chartReadiness.reason}</p>
                                </div>
                            </div>
                        ) : null}
                        {group === "Module coverage" && analyticsModuleCoverage ? (
                            <div className="mb-3 space-y-2 rounded-[0.9rem] border border-white/10 bg-black/20 p-3">
                                <div className="flex flex-wrap gap-2">
                                    <Pill label="Verified" value={`${analyticsModuleCoverage.verifiedModules}/${analyticsModuleCoverage.totalModules}`} tone={analyticsModuleCoverage.passAllowed ? "good" : "warn"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Partial" value={analyticsModuleCoverage.partialModules} tone={analyticsModuleCoverage.partialModules > 0 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Empty" value={analyticsModuleCoverage.emptyModules} tone={analyticsModuleCoverage.emptyModules > 0 ? "bad" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Required gaps" value={analyticsModuleCoverage.modules.filter((module) => module.requiredForBeta && module.status !== "verified").length} tone={analyticsModuleCoverage.modules.some((module) => module.requiredForBeta && module.status === "empty") ? "bad" : analyticsModuleCoverage.modules.some((module) => module.requiredForBeta && module.status !== "verified") ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Optional gaps" value={analyticsModuleCoverage.modules.filter((module) => !module.requiredForBeta && module.status !== "verified").length} tone={analyticsModuleCoverage.modules.some((module) => !module.requiredForBeta && module.status !== "verified") ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                    <Pill label="Parity score" value={`${analyticsModuleCoverage.parityScore}%`} tone={analyticsModuleCoverage.parityScore < 80 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                    {analyticsModuleCoverage.blockedReason ? <Pill label="Blocked" value={analyticsModuleCoverage.blockedReason} tone="warn" truthState="live" badgeLabel="REVIEW" /> : null}
                                </div>
                                <div className="space-y-2">
                                    {analyticsModuleCoverage?.modules.filter((module) => module.status !== "verified").map((module) => (
                                        <div
                                            key={module.moduleId}
                                            className="rounded-md border border-white/10 px-3 py-2 text-xs text-gray-300"
                                            data-module-coverage-id={module.moduleId}
                                            data-module-coverage-status={module.status}
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Pill label="Module" value={module.moduleLabel} truthState="live" badgeLabel="INFO" />
                                                <Pill label="Status" value={module.status} tone={module.severity === "error" ? "bad" : module.severity === "review" ? "warn" : "neutral"} truthState="live" badgeLabel={module.severity === "error" ? "ERROR" : module.severity === "review" ? "REVIEW" : "INFO"} />
                                                <Pill label="Required" value={module.requiredForBeta ? "yes" : "no"} tone={module.requiredForBeta ? "warn" : "neutral"} truthState="live" badgeLabel="INFO" />
                                                <Pill label="Samples" value={module.sampleCount} tone={module.sampleCount === 0 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Last seen" value={formatUtcTimestamp(module.lastSeenAtUtc)} tone={module.lastSeenAtUtc ? "neutral" : "warn"} truthState={module.lastSeenAtUtc ? "live" : "unavailable"} badgeLabel={module.lastSeenAtUtc ? "INFO" : "UNKNOWN"} />
                                            </div>
                                            <p className="mt-2"><span className="font-semibold text-white">Missing sources:</span> {module.missingSources.join(", ") || "None recorded"}</p>
                                            <p><span className="font-semibold text-white">Present sources:</span> {module.presentSources.join(", ") || "None recorded"}</p>
                                            <p><span className="font-semibold text-white">Dependent panels:</span> {module.dependentPanels.join(", ")}</p>
                                            <p><span className="font-semibold text-white">Next action:</span> {module.nextAction}</p>
                                            <p><span className="font-semibold text-white">Validator:</span> {module.nextValidator}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        <details className="rounded-lg border border-white/10 bg-black/20 text-xs text-gray-300" data-raw-validation-rows-default-open="false">
                            <summary className="cursor-pointer px-3 py-2 font-semibold text-gray-100">Raw validation rows</summary>
                            <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {checks.map((check) => {
                                    const telemetryUiState = buildAdvancedTelemetryParityUiState({
                                        row: check,
                                        failureClusters: check.failureClusters,
                                    });
                                    const blockingRow = check.passAllowed === false || check.status === "fail" || check.status === "unavailable";
                                    const statusBadgeLabel = check.checkKey === "pipeline_health" && check.status === "fail"
                                        ? telemetryUiState.refreshDiagnosticsBadgeLabel
                                        : blockingRow
                                            ? telemetryUiState.statusBadgeLabel
                                            : undefined;

                                    return (
                                    <div key={check.checkKey || check.label} className="space-y-2 px-3 py-2.5">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-white">{check.operatorSummary || check.title || check.label}</p>
                                                <p className="text-xs text-gray-400">{check.source || "source unknown"} | {check.selectedRange || "range unknown"} | {formatTimestamp(check.lastValidatedAt || data?.generatedAtMs)}</p>
                                            </div>
                                            <Pill label="Status" value={check.status} tone={toneForStatus(check.status)} truthState={truthStateForValidationRow(check)} badgeLabel={statusBadgeLabel} />
                                        </div>
                                        <p className="text-xs leading-5 text-gray-300">{check.detail}</p>
                                        {check.whyItMatters ? <p className="text-xs leading-5 text-gray-400">Why it matters: {check.whyItMatters}</p> : null}
                                        {check.eventSource || check.sampleSource ? (
                                            <div className="flex flex-wrap gap-2">
                                                {check.eventSource ? <Pill label="Event source" value={check.eventSource} truthState="live" badgeLabel="INFO" /> : null}
                                                {check.sampleSource ? <Pill label="Sample source" value={check.sampleSource} truthState="live" badgeLabel="INFO" /> : null}
                                            </div>
                                        ) : null}
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Confidence" value={formatConfidence(check.confidence)} tone={(check.confidence ?? 100) < 50 ? "bad" : (check.confidence ?? 100) < 70 ? "warn" : "neutral"} truthState={check.confidence === null || check.confidence === undefined ? "unavailable" : (check.confidence < 50 ? "blocked" : "live")} badgeLabel={telemetryUiState.confidenceBadgeLabel} />
                                            <Pill label="Samples" value={check.sampleCount ?? 0} tone={check.sampleRequired && !check.sampleCount ? "warn" : "neutral"} truthState={check.passAllowed === false ? "review" : "live"} badgeLabel={check.sampleRequired && !check.sampleCount ? "MISSING" : check.passAllowed === false ? "PRESENT" : "LOADED"} />
                                            <Pill label="Pass allowed" value={check.passAllowed === false ? "no" : "yes"} tone={check.passAllowed === false ? "warn" : "good"} truthState={check.passAllowed === false ? "blocked" : "live"} badgeLabel={telemetryUiState.passAllowedBadgeLabel} />
                                            {check.passBlockedReason ? <Pill label="Blocked" value={check.passBlockedReason} tone="warn" truthState="blocked" badgeLabel="BLOCKED" /> : null}
                                        </div>
                                        {check.checkKey === "module_coverage" && check.moduleCoverage ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Verified modules" value={`${check.moduleCoverage.verifiedModules}/${check.moduleCoverage.totalModules}`} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Partial modules" value={check.moduleCoverage.partialModules} tone={check.moduleCoverage.partialModules > 0 ? "warn" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                                <Pill label="Empty modules" value={check.moduleCoverage.emptyModules} tone={check.moduleCoverage.emptyModules > 0 ? "bad" : "neutral"} truthState="live" badgeLabel="LOADED" />
                                            </div>
                                        ) : null}
                                        {check.checkKey === "task_guidance_parity" ? (
                                            <div className="flex flex-wrap gap-2">
                                                <Pill label="Implemented" value={check.implemented === false ? "no" : "yes"} tone={check.implemented === false ? "neutral" : "good"} truthState={check.implemented === false ? "unavailable" : "live"} badgeLabel={check.implemented === false ? "UNAVAILABLE" : "LOADED"} />
                                                <Pill label="Required" value={check.required === false ? "no" : "yes"} tone={check.required === false ? "neutral" : "warn"} truthState="live" badgeLabel="INFO" />
                                                {check.eventNames && check.eventNames.length > 0 ? <Pill label="Expected events" value={check.eventNames.join(", ")} truthState="live" badgeLabel="INFO" /> : null}
                                            </div>
                                        ) : null}
                                        <p className="text-xs text-gray-400">{telemetryUiState.nextAction || check.recommendedNextCheck || check.action || "No action needed."}</p>
                                        {check.failureClusters && check.failureClusters.length > 0 ? (
                                            <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-gray-300">
                                                <p className="font-semibold text-gray-100">Top failure clusters</p>
                                                <div className="mt-2 space-y-2">
                                                    {telemetryUiState.failureClusters.map((cluster) => (
                                                        <div key={`${cluster.source}:${cluster.reasonCode}:${cluster.affectedRoute || "unknown"}`} className="rounded-md border border-white/10 px-2 py-1.5">
                                                            <p className="text-gray-100">{cluster.reasonCode} · {cluster.count} · {cluster.affectedRoute || "route unknown"}</p>
                                                            <p className="text-gray-400">{cluster.source} · {cluster.currentLabel} · owner {cluster.likelyOwner} · first {formatUtcTimestamp(cluster.firstSeenAtUtc)} · last {formatUtcTimestamp(cluster.lastSeenAtUtc)}</p>
                                                            <p className="text-gray-400">{cluster.suggestedAction}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                        <details className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-gray-300">
                                            <summary className="cursor-pointer font-semibold text-gray-100">Technical evidence</summary>
                                            <div className="mt-2 space-y-1">
                                                <p>{check.technicalEvidence || check.fullDetails || "No technical evidence recorded."}</p>
                                                <p className="text-gray-500">Source details: {check.sourceDetails || "not recorded"}</p>
                                            </div>
                                        </details>
                                    </div>
                                    );
                                })}
                            </div>
                            </ScrollWrap>
                        </details>
                    </div>
                )) : null}
            </div>
        </Section>
    );
}
