"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Clock3, PlayCircle, Sparkles } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import {
    AnalyticsViewModeToggle,
    MetricCard,
    SectionCard,
    type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import type { AdminOnboardingVelocityModel } from "@/lib/admin-onboarding-velocity";

type CountBucketItem = {
    label: string;
    count: number;
};

type OnboardingStepItem = {
    stepKey: string;
    stepTitle: string;
    stepIndex: number;
    starts: number;
    completions: number;
    avgDurationMs: number;
    completionRate: number;
    dropOffCount: number;
};

function OnboardingDiscrepancyCallout({
    model,
}: {
    model: AdminOnboardingVelocityModel;
}) {
    if (!model.discrepancyDetected || !model.discrepancySummary) {
        return null;
    }

    return (
        <div className="flex flex-col gap-1.5 rounded-[1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-50 md:flex-row md:items-center md:justify-between">
            <span className="min-w-0">{model.discrepancySummary}</span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/80">
                Details in Debug
            </span>
        </div>
    );
}

export function AdminOnboardingAnalyticsModules(props: {
    renderSectionRangeControl: (sectionKey: string) => ReactNode;
    discrepancies: string[];
    onboardingVelocityModel: AdminOnboardingVelocityModel;
    onboardingVelocityHasData: boolean;
    onboardingVelocityBuckets: CountBucketItem[];
    onboardingVelocityStartCount: number;
    onboardingVelocityCompletionCount: number;
    onboardingVelocityCompletionRate: number;
    onboardingVelocityDropOffCount: number;
    onboardingVelocityAvgDurationSeconds: number;
    onboardingVelocityStartSourceHint: string;
    onboardingStepFlowItems: OnboardingStepItem[];
    formatCompactNumber: (value: number) => string;
    formatDuration: (seconds: number) => string;
    formatPercent: (value: number) => string;
}) {
    const [onboardingPerformanceViewMode, setOnboardingPerformanceViewMode] = useState<AnalyticsViewMode>("cards");
    const model = props.onboardingVelocityModel;
    const velocityBadgeLabel = model.discrepancyDetected
        ? "PARTIAL"
        : model.truthState === "stale"
            ? "DELAYED"
            : model.truthState === "loading"
                ? "WAIT"
                : "LIVE";
    const countLabel = (value: number | null) =>
        value === null ? "Waiting" : props.formatCompactNumber(value);
    const percentLabel = (value: number | null) =>
        value === null ? "Waiting" : props.formatPercent(value);
    const durationLabel = (seconds: number | null) =>
        seconds === null ? "Unavailable" : props.formatDuration(seconds);
    const maxBucket = Math.max(1, ...model.durationBucketCounts.map((bucket) => bucket.count));

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const debugWindow = window as typeof window & {
            __KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__?: AdminOnboardingVelocityModel;
            __KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_PERFORMANCE_DEBUG__?: AdminOnboardingVelocityModel;
        };
        debugWindow.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__ = model;
        debugWindow.__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_PERFORMANCE_DEBUG__ = model;
    }, [model]);

    return (
        <SectionCard
            title="Onboarding Performance"
            subtitle="Starts, completions, timing, and step drop-off in one verified view."
            icon={PlayCircle}
            rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <AnalyticsViewModeToggle
                        value={onboardingPerformanceViewMode}
                        onChange={setOnboardingPerformanceViewMode}
                        options={[
                            { id: "cards", label: "Cards" },
                            { id: "chart", label: "Chart" },
                            { id: "table", label: "Table" },
                        ]}
                    />
                    {props.renderSectionRangeControl("onboardingVelocity")}
                </div>
            )}
        >
            <div
                className="grid gap-2.5"
                data-admin-analytics-mobile-view-mode={onboardingPerformanceViewMode}
                data-onboarding-performance-truth-state={model.truthState}
                data-onboarding-performance-discrepancy={String(model.discrepancyDetected)}
                data-onboarding-performance-timing-missing={String(model.timingMissing)}
            >
                <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 text-[11px] leading-5 text-gray-400">
                        {model.onboardingStarts.source === "canonical_onboarding_start_events"
                            ? "Showing verified onboarding starts."
                            : "Onboarding starts include source detail for this range."}
                    </p>
                    <AdminStatusBadge
                        state={model.truthState}
                        label={velocityBadgeLabel}
                        className="max-w-[6.25rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                    />
                </div>

                {onboardingPerformanceViewMode !== "table" ? (
                    <OnboardingDiscrepancyCallout model={model} />
                ) : null}

                {onboardingPerformanceViewMode === "cards" ? (
                    <>
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                            <MetricCard
                                label="Started"
                                value={countLabel(model.onboardingStarts.value)}
                                hint={props.onboardingVelocityStartSourceHint}
                                icon={PlayCircle}
                                truthState={model.truthState}
                                statusBadgeLabel={velocityBadgeLabel}
                                className="rounded-[1rem] p-2"
                                valueClassName="text-lg leading-6 md:text-xl"
                            />
                            <MetricCard
                                label="Completed"
                                value={countLabel(model.onboardingCompletions.value)}
                                hint="Finished tours"
                                icon={CheckCircle2}
                                truthState={model.truthState}
                                statusBadgeLabel={velocityBadgeLabel}
                                className="rounded-[1rem] p-2"
                                valueClassName="text-lg leading-6 md:text-xl"
                            />
                            <MetricCard
                                label="Rate"
                                value={percentLabel(model.completionRateMetric.value)}
                                hint={model.completionRateMetric.formula}
                                icon={Sparkles}
                                truthState={model.truthState}
                                statusBadgeLabel={velocityBadgeLabel}
                                className="rounded-[1rem] p-2"
                                valueClassName="text-lg leading-6 md:text-xl"
                            />
                            <MetricCard
                                label="Avg Time"
                                value={durationLabel(model.avgCompletionTime.value)}
                                hint={model.timingMissing ? "Timing unavailable" : "Mean completion time"}
                                icon={Clock3}
                                truthState={model.truthState}
                                statusBadgeLabel={velocityBadgeLabel}
                                className="rounded-[1rem] p-2"
                                valueClassName="truncate text-base leading-6 md:text-lg"
                            />
                        </div>

                        <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-3">
                            <span>
                                <span className="font-semibold text-white">Biggest drop-off:</span>{" "}
                                {model.biggestDropoffStep
                                    ? `${model.biggestDropoffStep.stepTitle}, ${model.biggestDropoffCount ?? 0}`
                                    : "None"}
                            </span>
                            <span>
                                <span className="font-semibold text-white">Slowest:</span>{" "}
                                {model.slowestStep
                                    ? `${model.slowestStep.stepTitle}, ${durationLabel(model.slowestStepAvgSeconds)}`
                                    : "Unavailable"}
                            </span>
                            <span>
                                <span className="font-semibold text-white">Drop-off:</span>{" "}
                                {countLabel(model.onboardingDropoffs.value)}
                            </span>
                        </div>
                    </>
                ) : null}

                {onboardingPerformanceViewMode === "chart" ? (
                    <div
                        className="space-y-2 rounded-[1rem] border border-white/10 bg-black/25 p-3"
                        data-onboarding-performance-chart="compact"
                        data-onboarding-performance-truth-state={model.truthState}
                        data-onboarding-performance-discrepancy={String(model.discrepancyDetected)}
                        data-onboarding-performance-timing-missing={String(model.timingMissing)}
                    >
                        {props.onboardingVelocityHasData ? (
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                        Completion time
                                    </p>
                                    <span className="text-[10px] text-gray-500">
                                        {model.bucketReconciliationDelta === 0 ? "reconciled" : "timing partial"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-5 items-end gap-1.5">
                                    {model.durationBucketCounts.map((bucket) => (
                                        <div key={bucket.label} className="min-w-0">
                                            <div className="flex h-12 items-end rounded-md bg-white/5 px-1">
                                                <div
                                                    className="w-full rounded-t bg-brand-purple"
                                                    style={{
                                                        height: `${Math.max(8, (bucket.count / maxBucket) * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 truncate text-center text-[9px] text-gray-500">
                                                {bucket.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                                Completion timing is waiting for guided onboarding progress events.
                            </div>
                        )}

                        <div className="space-y-1.5">
                            {model.perStep.map((step) => (
                                <div key={step.stepKey} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2 text-[10px]">
                                    <span className="truncate text-gray-400">{step.stepTitle}</span>
                                    <span className="text-right font-semibold text-white">{props.formatPercent(step.completionRate)}</span>
                                    <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-brand-purple"
                                            style={{ width: `${Math.max(5, Math.min(100, step.completionRate * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {onboardingPerformanceViewMode === "table" ? (
                    <div
                        className="overflow-x-auto rounded-[1rem] border border-white/10 bg-black/25"
                        data-onboarding-performance-table="compact"
                        data-onboarding-performance-truth-state={model.truthState}
                        data-onboarding-performance-discrepancy={String(model.discrepancyDetected)}
                        data-onboarding-performance-timing-missing={String(model.timingMissing)}
                    >
                        <table className="min-w-full text-left text-xs">
                            <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Step</th>
                                    <th className="px-3 py-2 font-semibold">Starts</th>
                                    <th className="px-3 py-2 font-semibold">Completed</th>
                                    <th className="px-3 py-2 font-semibold">Drop-offs</th>
                                    <th className="px-3 py-2 font-semibold">Avg time</th>
                                    <th className="px-3 py-2 font-semibold">Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 text-gray-300">
                                {model.perStep.map((step) => (
                                    <tr key={step.stepKey} data-onboarding-step-key={step.stepKey}>
                                        <td className="max-w-[15rem] px-3 py-2">
                                            <p className="truncate font-semibold text-white">{step.stepTitle}</p>
                                            <p className="truncate text-[11px] text-gray-500">{model.stepConversionFormula}</p>
                                        </td>
                                        <td className="px-3 py-2">{props.formatCompactNumber(step.starts)}</td>
                                        <td className="px-3 py-2">{props.formatCompactNumber(step.completions)}</td>
                                        <td className="px-3 py-2">{props.formatCompactNumber(step.dropOffCount)}</td>
                                        <td className="px-3 py-2">{durationLabel(step.avgSeconds)}</td>
                                        <td className="px-3 py-2">{props.formatPercent(step.completionRate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>
        </SectionCard>
    );
}
