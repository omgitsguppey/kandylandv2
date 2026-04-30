"use client";

import { useEffect, type ReactNode } from "react";
import { BellRing, Funnel, Sparkles } from "lucide-react";
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

import {
    AnalyticsTooltip,
    SectionCard,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminTaskPipelineModel, AdminTaskPipelineMetric } from "@/lib/admin-task-pipeline";

const PIE_COLORS = ["#b28cff", "#22d3ee", "#fb7185", "#f59e0b", "#34d399", "#60a5fa"];

type TaskLeaderboardItem = {
    taskId: string;
    title: string;
    assigned: number;
    started: number;
    completed: number;
    failed: number;
    rewardTotal: number;
    avgDurationMs: number;
    completionRate: number;
};

type NotificationActionItem = {
    label: string;
    value: number;
};

type NotificationReminderReason = {
    label: string;
    count: number;
};

type NotificationPieItem = {
    name: string;
    value: number;
};

export function AdminTaskAndNotificationModules(props: {
    renderSectionRangeControl: (sectionKey: string) => ReactNode;
    dailyTaskPipelineModel: AdminTaskPipelineModel;
    taskLeaderboardItems: TaskLeaderboardItem[];
    activeNotificationFunnelPieData: NotificationPieItem[];
    notificationActionItems: NotificationActionItem[];
    maxNotificationActionValue: number;
    hasNotificationReminderReasons: boolean;
    notificationReminderReasons: NotificationReminderReason[];
    formatDuration: (seconds: number) => string;
    formatPercent: (value: number) => string;
}) {
    useEffect(() => {
        if (typeof window === "undefined") return;
        (window as typeof window & {
            __KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__?: AdminTaskPipelineModel;
        }).__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__ = props.dailyTaskPipelineModel;
    }, [props.dailyTaskPipelineModel]);

    const formatCount = (value: number | null) => value === null ? "Waiting" : value.toLocaleString();
    const formatRate = (value: number | null) => value === null ? "Unavailable" : props.formatPercent(value);
    const formatSpeed = (value: number | null) => value === null ? "Unavailable" : props.formatDuration(value);
    const lifecycleProgressWidth = (metric: AdminTaskPipelineMetric) => {
        const peak = Math.max(1, props.dailyTaskPipelineModel.peakCount);
        return `${Math.max(4, Math.min(100, ((metric.value ?? 0) / peak) * 100))}%`;
    };
    const speedPeak = Math.max(1, ...props.dailyTaskPipelineModel.speedBuckets.map((bucket) => bucket.count ?? 0));
    const speedBarClass = (label: string, count: number | null) => {
        if ((count ?? 0) <= 0) return "bg-slate-700";
        if (label.includes("60m+")) return "bg-rose-400";
        if (label.includes("15-60m")) return "bg-amber-400";
        return "bg-brand-purple";
    };

    return (
        <>
            <div className="grid gap-5">
                <SectionCard
                    title="Daily Task Pipeline"
                    subtitle="Assigned, started, completed, and failed tasks in one progression view."
                    icon={Funnel}
                    rightSlot={props.renderSectionRangeControl("dailyTaskPipeline")}
                >
                    <div className="space-y-2.5">
                        <div className="flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                            <span>{props.dailyTaskPipelineModel.recommendation}</span>
                            <AdminStatusBadge
                                state={props.dailyTaskPipelineModel.truthState}
                                label={props.dailyTaskPipelineModel.badgeLabel}
                                className="max-w-[5.5rem] shrink-0 truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {props.dailyTaskPipelineModel.lifecycleMetrics.map((metric) => (
                                <div key={metric.key} className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">{metric.label}</p>
                                    <p className="mt-1 text-lg font-black text-white">{formatCount(metric.value)}</p>
                                    <p className="mt-0.5 truncate text-[10px] text-gray-500">{metric.source.replace("_", " ")}</p>
                                </div>
                            ))}
                        </div>

                        {props.dailyTaskPipelineModel.hasData ? (
                            <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                                <div className="mb-2 grid grid-cols-3 gap-2 text-[10px] text-gray-400">
                                    <span>Start rate: <span className="text-white">{formatRate(props.dailyTaskPipelineModel.startRate.value)}</span></span>
                                    <span>Complete: <span className="text-white">{formatRate(props.dailyTaskPipelineModel.completionRate.value)}</span></span>
                                    <span>Fail: <span className="text-white">{formatRate(props.dailyTaskPipelineModel.failRate.value)}</span></span>
                                </div>
                                <div className="space-y-1.5">
                                    {props.dailyTaskPipelineModel.lifecycleMetrics.map((metric) => (
                                        <div key={metric.key} className="grid grid-cols-[5.2rem_minmax(0,1fr)_3rem] items-center gap-2 text-[11px]">
                                            <span className="truncate text-gray-400">{metric.label}</span>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className={metric.key === "failed" ? "h-full rounded-full bg-rose-400" : metric.key === "completed" ? "h-full rounded-full bg-brand-purple" : "h-full rounded-full bg-slate-400"}
                                                    style={{ width: lifecycleProgressWidth(metric) }}
                                                />
                                            </div>
                                            <span className="text-right font-semibold text-white">{formatCount(metric.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">
                                Task pipeline is waiting for lifecycle signals.
                            </div>
                        )}

                        <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-[11px] text-gray-300">
                            <div className="grid grid-cols-3 gap-1.5">
                                {props.dailyTaskPipelineModel.guidanceMetrics.map((metric) => (
                                    <div key={metric.key} className="rounded-[0.8rem] bg-black/25 px-2 py-1.5">
                                        <p className="truncate text-[10px] text-gray-500">{metric.label}</p>
                                        <p className="font-semibold text-white">{formatCount(metric.value)}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="leading-5 text-gray-400">
                                {props.dailyTaskPipelineModel.visibleCopy} Start rate uses {props.dailyTaskPipelineModel.startRate.formula}; completion and fail rates use started tasks.
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-400">
                                <span>Stuck assigned: <span className="text-white">{formatCount(props.dailyTaskPipelineModel.stuckAssignedCount)}</span></span>
                                <span>Started open: <span className="text-white">{formatCount(props.dailyTaskPipelineModel.startedNotCompletedCount)}</span></span>
                                <span>Orphan starts: <span className="text-white">{formatCount(props.dailyTaskPipelineModel.orphanStartedCount)}</span></span>
                                <span>Orphan completions: <span className="text-white">{formatCount(props.dailyTaskPipelineModel.orphanCompletedCount)}</span></span>
                            </div>
                        </div>

                        <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                            <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-white">Completion speed</p>
                                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                                        {props.dailyTaskPipelineModel.timingRecommendation}
                                    </p>
                                </div>
                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                                    {props.dailyTaskPipelineModel.speedSource}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                <div className="rounded-[0.8rem] bg-white/[0.04] px-2 py-1.5">
                                    <p className="truncate text-[10px] text-gray-500">Avg finish</p>
                                    <p className="font-semibold text-white">{formatSpeed(props.dailyTaskPipelineModel.avgCompletionSeconds)}</p>
                                </div>
                                <div className="rounded-[0.8rem] bg-white/[0.04] px-2 py-1.5">
                                    <p className="truncate text-[10px] text-gray-500">Median</p>
                                    <p className="font-semibold text-white">{formatSpeed(props.dailyTaskPipelineModel.medianCompletionSeconds)}</p>
                                </div>
                                <div className="rounded-[0.8rem] bg-white/[0.04] px-2 py-1.5">
                                    <p className="truncate text-[10px] text-gray-500">Timed</p>
                                    <p className="font-semibold text-white">{formatCount(props.dailyTaskPipelineModel.timedCompletionCount)}</p>
                                </div>
                                <div className="rounded-[0.8rem] bg-white/[0.04] px-2 py-1.5">
                                    <p className="truncate text-[10px] text-gray-500">Coverage</p>
                                    <p className="font-semibold text-white">{formatRate(props.dailyTaskPipelineModel.timingCoveragePercent)}</p>
                                </div>
                            </div>
                            <div className="mt-2 space-y-1.5">
                                {props.dailyTaskPipelineModel.speedBuckets.map((bucket) => (
                                    <div key={bucket.bucketKey} className="grid grid-cols-[3.8rem_minmax(0,1fr)_2.8rem] items-center gap-2 text-[10px]">
                                        <span className="truncate text-gray-500">{bucket.label}</span>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className={`h-full rounded-full ${speedBarClass(bucket.label, bucket.count)}`}
                                                style={{ width: `${Math.max(4, Math.min(100, ((bucket.count ?? 0) / speedPeak) * 100))}%` }}
                                            />
                                        </div>
                                        <span className="text-right font-semibold text-gray-300">{formatCount(bucket.count)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <SectionCard
                    title="Task Leaderboard"
                    subtitle="The missions driving the most completions and payout."
                    icon={Sparkles}
                    rightSlot={props.renderSectionRangeControl("taskLeaderboard")}
                >
                    <div className="space-y-3">
                        {props.taskLeaderboardItems.length > 0 ? (
                            props.taskLeaderboardItems.map((task) => (
                                <div
                                    key={task.taskId}
                                    className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">
                                                {task.title}
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {task.completed.toLocaleString()} completed -{" "}
                                                {props.formatDuration(task.avgDurationMs / 1000)} avg
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-sm font-bold text-brand-purple">
                                            {props.formatPercent(task.completionRate)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-gray-300">
                                            Assigned
                                            <br />
                                            {task.assigned}
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-gray-300">
                                            Started
                                            <br />
                                            {task.started}
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-amber-100">
                                            Failed
                                            <br />
                                            {task.failed}
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-brand-purple">
                                            Reward
                                            <br />
                                            {task.rewardTotal}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                                Task leaderboard data will appear once more lifecycle events land in this range.
                            </div>
                        )}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Notification Funnel"
                    subtitle="Prompt, enablement, open, read, and reminder behavior."
                    icon={BellRing}
                    rightSlot={props.renderSectionRangeControl("notificationFunnel")}
                >
                    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                        <div className="h-64 w-full">
                            {props.activeNotificationFunnelPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={props.activeNotificationFunnelPieData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={52}
                                            outerRadius={84}
                                            paddingAngle={3}
                                        >
                                            {props.activeNotificationFunnelPieData.map((item, index) => (
                                                <Cell
                                                    key={item.name}
                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<AnalyticsTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                                    No notification funnel flow was tracked in this range.
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {props.notificationActionItems.map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-white">
                                            {item.label}
                                        </p>
                                        <span className="text-sm font-bold text-brand-purple">
                                            {item.value.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                            style={{
                                                width: `${Math.max(6, (item.value / Math.max(1, props.maxNotificationActionValue || 1)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                                    Reminder reasons
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {props.hasNotificationReminderReasons ? (
                                        props.notificationReminderReasons.map((item) => (
                                            <span
                                                key={item.label}
                                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white"
                                            >
                                                {item.label} - {item.count}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-gray-500">
                                            No reminder traffic in this range.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>
        </>
    );
}

