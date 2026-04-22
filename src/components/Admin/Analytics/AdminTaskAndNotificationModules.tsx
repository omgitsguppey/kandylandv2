"use client";

import type { ReactNode } from "react";
import { BellRing, Clock3, Funnel, Sparkles } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    AnalyticsTooltip,
    SectionCard,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";

const PIE_COLORS = ["#b28cff", "#22d3ee", "#fb7185", "#f59e0b", "#34d399", "#60a5fa"];

type CountBucketItem = {
    label: string;
    count: number;
};

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
    dailyTaskPipelineItems: CountBucketItem[];
    dailyTaskPipelineHasData: boolean;
    taskCompletionSpeedBuckets: CountBucketItem[];
    taskLeaderboardItems: TaskLeaderboardItem[];
    activeNotificationFunnelPieData: NotificationPieItem[];
    notificationActionItems: NotificationActionItem[];
    maxNotificationActionValue: number;
    hasNotificationReminderReasons: boolean;
    notificationReminderReasons: NotificationReminderReason[];
    formatDuration: (seconds: number) => string;
    formatPercent: (value: number) => string;
}) {
    return (
        <>
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <SectionCard
                    title="Daily Task Pipeline"
                    subtitle="Assigned, started, completed, and failed tasks in one progression view."
                    icon={Funnel}
                    rightSlot={props.renderSectionRangeControl("dailyTaskPipeline")}
                >
                    <div className="h-64 w-full">
                        {props.dailyTaskPipelineHasData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={props.dailyTaskPipelineItems}
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
                                        name="Events"
                                        fill="#b28cff"
                                        radius={[10, 10, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                                No daily task pipeline data in this range.
                            </div>
                        )}
                    </div>
                </SectionCard>

                <SectionCard
                    title="Task Completion Speed"
                    subtitle="How fast completed tasks close."
                    icon={Clock3}
                    rightSlot={props.renderSectionRangeControl("taskCompletionSpeed")}
                >
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={props.taskCompletionSpeedBuckets}
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
                                    fill="#22d3ee"
                                    radius={[10, 10, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
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

