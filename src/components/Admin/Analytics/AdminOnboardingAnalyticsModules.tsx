"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Clock3, PlayCircle, Route, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
    AnalyticsTooltip,
    MetricCard,
    SectionCard,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";

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

function OnboardingDiscrepancyCallout({ items }: { items: string[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 rounded-[1.35rem] border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100">
                    Discrepancy
                </span>
                <span className="text-xs font-semibold text-gray-300">
                    Cross-check against Onboarding Step Flow below.
                </span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-amber-100">
                {items.map((item) => (
                    <p key={item}>- {item}</p>
                ))}
            </div>
        </div>
    );
}

export function AdminOnboardingAnalyticsModules(props: {
    renderSectionRangeControl: (sectionKey: string) => ReactNode;
    discrepancies: string[];
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
    return (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <SectionCard
                title="Onboarding Velocity"
                subtitle="How long new users take to finish guided onboarding."
                icon={PlayCircle}
                rightSlot={props.renderSectionRangeControl("onboardingVelocity")}
            >
                <OnboardingDiscrepancyCallout items={props.discrepancies} />
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="h-64 w-full">
                        {props.onboardingVelocityHasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={props.onboardingVelocityBuckets}
                                    margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        stroke="rgba(255,255,255,0.06)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        stroke="#6b7280"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#6b7280"
                                        fontSize={11}
                                        tickLine={false}
                                        axisLine={false}
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
                            <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                                No onboarding data in this range.
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 self-start">
                        <MetricCard
                            label="Started"
                            value={props.formatCompactNumber(props.onboardingVelocityStartCount)}
                            hint={props.onboardingVelocityStartSourceHint}
                            icon={PlayCircle}
                        />
                        <MetricCard
                            label="Completed"
                            value={props.onboardingVelocityCompletionCount.toLocaleString()}
                            hint="Finished tours"
                            icon={CheckCircle2}
                        />
                        <MetricCard
                            label="Avg Time"
                            value={props.formatDuration(props.onboardingVelocityAvgDurationSeconds)}
                            hint="Mean completion time"
                            icon={Clock3}
                        />
                        <MetricCard
                            label="Completion Rate"
                            value={props.formatPercent(props.onboardingVelocityCompletionRate)}
                            hint={`${props.onboardingVelocityDropOffCount.toLocaleString()} users dropped before finish`}
                            icon={Sparkles}
                        />
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
