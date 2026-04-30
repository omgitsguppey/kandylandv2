"use client";

import { useEffect, type ReactNode } from "react";
import { CheckCircle2, Clock3, PlayCircle, Route, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import {
    AnalyticsTooltip,
    MetricCard,
    SectionCard,
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
        <div className="mb-2.5 flex flex-col gap-1.5 rounded-[1rem] border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-50 md:flex-row md:items-center md:justify-between">
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
    const velocityBadgeLabel = props.onboardingVelocityModel.discrepancyDetected
        ? "MIXED"
        : props.onboardingVelocityModel.truthState === "stale"
            ? "STALE"
            : props.onboardingVelocityModel.truthState === "loading"
                ? "WAIT"
                : "LIVE";
    const velocityCountLabel = (value: number | null) =>
        value === null ? "Waiting" : props.formatCompactNumber(value);
    const velocityPercentLabel = (value: number | null) =>
        value === null ? "Waiting" : props.formatPercent(value);
    const velocityDurationLabel = props.onboardingVelocityModel.avgCompletionTime.value === null
        ? "Unavailable"
        : props.formatDuration(props.onboardingVelocityModel.avgCompletionTime.value);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        (window as typeof window & {
            __KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__?: AdminOnboardingVelocityModel;
        }).__KANDYDROPS_ADMIN_ANALYTICS_ONBOARDING_VELOCITY_DEBUG__ = props.onboardingVelocityModel;
    }, [props.onboardingVelocityModel]);

    return (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <SectionCard
                title="Onboarding Velocity"
                subtitle="How long new users take to finish guided onboarding."
                icon={PlayCircle}
                rightSlot={props.renderSectionRangeControl("onboardingVelocity")}
            >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                    <p className="min-w-0 text-[11px] leading-5 text-gray-400">
                        {props.onboardingVelocityModel.onboardingStarts.source === "canonical_onboarding_start_events"
                            ? "Using canonical onboarding starts."
                            : "Onboarding starts are source-labeled for this range."}
                    </p>
                    <AdminStatusBadge
                        state={props.onboardingVelocityModel.truthState}
                        label={velocityBadgeLabel}
                        className="max-w-[6.25rem] truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                    />
                </div>
                <OnboardingDiscrepancyCallout model={props.onboardingVelocityModel} />
                <div className="grid gap-2.5">
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <MetricCard
                            label="Started"
                            value={velocityCountLabel(props.onboardingVelocityModel.onboardingStarts.value)}
                            hint={props.onboardingVelocityStartSourceHint}
                            icon={PlayCircle}
                            truthState={props.onboardingVelocityModel.truthState}
                            statusBadgeLabel={velocityBadgeLabel}
                            className="rounded-[1rem] p-2"
                            valueClassName="text-lg leading-6 md:text-xl"
                        />
                        <MetricCard
                            label="Completed"
                            value={velocityCountLabel(props.onboardingVelocityModel.onboardingCompletions.value)}
                            hint="Finished tours"
                            icon={CheckCircle2}
                            truthState={props.onboardingVelocityModel.truthState}
                            statusBadgeLabel={velocityBadgeLabel}
                            className="rounded-[1rem] p-2"
                            valueClassName="text-lg leading-6 md:text-xl"
                        />
                        <MetricCard
                            label="Rate"
                            value={velocityPercentLabel(props.onboardingVelocityModel.completionRateMetric.value)}
                            hint={props.onboardingVelocityModel.completionRateMetric.formula}
                            icon={Sparkles}
                            truthState={props.onboardingVelocityModel.truthState}
                            statusBadgeLabel={velocityBadgeLabel}
                            className="rounded-[1rem] p-2"
                            valueClassName="text-lg leading-6 md:text-xl"
                        />
                        <MetricCard
                            label="Avg Time"
                            value={velocityDurationLabel}
                            hint={props.onboardingVelocityModel.timingMissing ? "Timing unavailable" : "Mean completion time"}
                            icon={Clock3}
                            truthState={props.onboardingVelocityModel.truthState}
                            statusBadgeLabel={velocityBadgeLabel}
                            className="rounded-[1rem] p-2"
                            valueClassName="truncate text-base leading-6 md:text-lg"
                        />
                    </div>

                    <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-3">
                        <span>
                            <span className="font-semibold text-white">Drop-off:</span>{" "}
                            {velocityCountLabel(props.onboardingVelocityModel.onboardingDropoffs.value)}
                        </span>
                        <span>
                            <span className="font-semibold text-white">Buckets:</span>{" "}
                            {props.onboardingVelocityModel.bucketReconciliationDelta === 0 ? "reconciled" : "partial timing"}
                        </span>
                        <span>
                            <span className="font-semibold text-white">Source:</span>{" "}
                            {props.onboardingVelocityModel.onboardingStarts.source === "canonical_onboarding_start_events" ? "canonical starts" : "labeled fallback"}
                        </span>
                    </div>

                    <div className="h-36 w-full md:h-52">
                        {props.onboardingVelocityHasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={props.onboardingVelocityBuckets}
                                    margin={{ top: 4, right: 0, left: -24, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        stroke="rgba(255,255,255,0.06)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        stroke="#6b7280"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        width={34}
                                    />
                                    <Tooltip content={<AnalyticsTooltip />} />
                                    <Bar
                                        dataKey="count"
                                        name="Completions"
                                        fill="#b28cff"
                                        radius={[10, 10, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-[1rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                                No onboarding data in this range.
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>

            <SectionCard
                title="Onboarding Step Flow"
                subtitle="Step-by-step drop-off and completion through guided onboarding."
                icon={Route}
                rightSlot={props.renderSectionRangeControl("onboardingStepFlow")}
            >
                <div className="space-y-3">
                    {props.onboardingStepFlowItems.length > 0 ? (
                        props.onboardingStepFlowItems.map((step) => (
                            <div
                                key={step.stepKey}
                                className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {step.stepTitle}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {step.starts.toLocaleString()} starts ·{" "}
                                            {step.completions.toLocaleString()} completions ·{" "}
                                            {props.formatDuration(step.avgDurationMs / 1000)} avg
                                        </p>
                                    </div>
                                    <span className="shrink-0 rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold text-brand-purple">
                                        {props.formatPercent(step.completionRate)}
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                        style={{
                                            width: `${Math.max(6, Math.min(100, step.completionRate * 100))}%`,
                                        }}
                                    />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Step {step.stepIndex + 1}</span>
                                    <span>
                                        {step.dropOffCount.toLocaleString()} drop-offs
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                            Step-by-step onboarding data will appear once more guided onboarding progress events land in this range.
                        </div>
                    )}
                </div>
            </SectionCard>
        </div>
    );
}
