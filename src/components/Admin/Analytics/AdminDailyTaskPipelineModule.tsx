"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Funnel } from "lucide-react";

import { SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminTaskPipelineModel, AdminTaskPipelineMetric } from "@/lib/admin-task-pipeline";

export function AdminDailyTaskPipelineModule(props: {
    renderSectionRangeControl: (sectionKey: string) => ReactNode;
    model: AdminTaskPipelineModel;
    formatDuration: (seconds: number) => string;
    formatPercent: (value: number) => string;
}) {
    const [leaderboardPage, setLeaderboardPage] = useState(0);

    useEffect(() => {
        if (typeof window === "undefined") return;
        (window as typeof window & {
            __KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__?: AdminTaskPipelineModel;
        }).__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__ = props.model;
    }, [props.model]);

    const formatCount = (value: number | null) => value === null ? "Waiting" : value.toLocaleString();
    const formatRate = (value: number | null) => value === null ? "Unavailable" : props.formatPercent(value);
    const formatSpeed = (value: number | null) => value === null ? "Unavailable" : props.formatDuration(value);
    const lifecycleProgressWidth = (metric: AdminTaskPipelineMetric) => {
        const peak = Math.max(1, props.model.peakCount);
        return `${Math.max(4, Math.min(100, ((metric.value ?? 0) / peak) * 100))}%`;
    };
    const speedPeak = Math.max(1, ...props.model.speedBuckets.map((bucket) => bucket.count ?? 0));
    const speedBarClass = (label: string, count: number | null) => {
        if ((count ?? 0) <= 0) return "bg-slate-700";
        if (label.includes("60m+")) return "bg-rose-400";
        if (label.includes("15-60m")) return "bg-amber-400";
        return "bg-brand-purple";
    };
    const pageSize = props.model.taskLeaderboardPageSize;
    const pageCount = Math.max(1, Math.ceil(props.model.taskLeaderboardRows.length / pageSize));
    const page = Math.min(leaderboardPage, pageCount - 1);
    const visibleRows = props.model.taskLeaderboardRows.slice(page * pageSize, page * pageSize + pageSize);
    const hasPagination = props.model.taskLeaderboardRows.length > pageSize;
    const changePage = (direction: -1 | 1) => {
        setLeaderboardPage((current) => Math.min(pageCount - 1, Math.max(0, current + direction)));
    };

    return (
        <SectionCard
            title="Daily Task Pipeline"
            subtitle="Assigned, started, completed, and failed tasks in one progression view."
            icon={Funnel}
            rightSlot={props.renderSectionRangeControl("dailyTaskPipeline")}
        >
            <div className="space-y-2.5">
                <div className="flex flex-col gap-2 rounded-[1rem] border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-5 text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                    <span>{props.model.recommendation}</span>
                    <AdminStatusBadge state={props.model.truthState} label={props.model.badgeLabel} className="max-w-[5.5rem] shrink-0 truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]" />
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {props.model.lifecycleMetrics.map((metric) => (
                        <div key={metric.key} className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">{metric.label}</p>
                            <p className="mt-1 text-lg font-black text-white">{formatCount(metric.value)}</p>
                            <p className="mt-0.5 truncate text-[10px] text-gray-500">{metric.source.replace("_", " ")}</p>
                        </div>
                    ))}
                </div>

                {props.model.hasData ? (
                    <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                        <div className="mb-2 grid grid-cols-3 gap-2 text-[10px] text-gray-400">
                            <span>Start rate: <span className="text-white">{formatRate(props.model.startRate.value)}</span></span>
                            <span>Complete: <span className="text-white">{formatRate(props.model.completionRate.value)}</span></span>
                            <span>Fail: <span className="text-white">{formatRate(props.model.failRate.value)}</span></span>
                        </div>
                        <div className="space-y-1.5">
                            {props.model.lifecycleMetrics.map((metric) => (
                                <div key={metric.key} className="grid grid-cols-[5.2rem_minmax(0,1fr)_3rem] items-center gap-2 text-[11px]">
                                    <span className="truncate text-gray-400">{metric.label}</span>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                        <div className={metric.key === "failed" ? "h-full rounded-full bg-rose-400" : metric.key === "completed" ? "h-full rounded-full bg-brand-purple" : "h-full rounded-full bg-slate-400"} style={{ width: lifecycleProgressWidth(metric) }} />
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
                        {props.model.guidanceMetrics.map((metric) => (
                            <div key={metric.key} className="rounded-[0.8rem] bg-black/25 px-2 py-1.5">
                                <p className="truncate text-[10px] text-gray-500">{metric.label}</p>
                                <p className="font-semibold text-white">{formatCount(metric.value)}</p>
                            </div>
                        ))}
                    </div>
                    <p className="leading-5 text-gray-400">
                        {props.model.visibleCopy} Start rate uses {props.model.startRate.formula}; completion and fail rates use started tasks.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-400">
                        <span>Stuck assigned: <span className="text-white">{formatCount(props.model.stuckAssignedCount)}</span></span>
                        <span>Started open: <span className="text-white">{formatCount(props.model.startedNotCompletedCount)}</span></span>
                        <span>Orphan starts: <span className="text-white">{formatCount(props.model.orphanStartedCount)}</span></span>
                        <span>Orphan completions: <span className="text-white">{formatCount(props.model.orphanCompletedCount)}</span></span>
                    </div>
                </div>

                <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-white">Completion speed</p>
                            <p className="mt-0.5 text-[11px] leading-4 text-gray-500">{props.model.timingRecommendation}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">{props.model.speedSource}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        <SpeedTile label="Avg finish" value={formatSpeed(props.model.avgCompletionSeconds)} />
                        <SpeedTile label="Median" value={formatSpeed(props.model.medianCompletionSeconds)} />
                        <SpeedTile label="Timed" value={formatCount(props.model.timedCompletionCount)} />
                        <SpeedTile label="Coverage" value={formatRate(props.model.timingCoveragePercent)} />
                    </div>
                    <div className="mt-2 space-y-1.5">
                        {props.model.speedBuckets.map((bucket) => (
                            <div key={bucket.bucketKey} className="grid grid-cols-[3.8rem_minmax(0,1fr)_2.8rem] items-center gap-2 text-[10px]">
                                <span className="truncate text-gray-500">{bucket.label}</span>
                                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                                    <div className={`h-full rounded-full ${speedBarClass(bucket.label, bucket.count)}`} style={{ width: `${Math.max(4, Math.min(100, ((bucket.count ?? 0) / speedPeak) * 100))}%` }} />
                                </div>
                                <span className="text-right font-semibold text-gray-300">{formatCount(bucket.count)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <TaskLeaderboardPanel
                    model={props.model}
                    visibleRows={visibleRows}
                    page={page}
                    pageCount={pageCount}
                    hasPagination={hasPagination}
                    onPageChange={changePage}
                    formatCount={formatCount}
                    formatRate={formatRate}
                    formatSpeed={formatSpeed}
                    formatPercent={props.formatPercent}
                />
            </div>
        </SectionCard>
    );
}

function SpeedTile(props: { label: string; value: string }) {
    return (
        <div className="rounded-[0.8rem] bg-white/[0.04] px-2 py-1.5">
            <p className="truncate text-[10px] text-gray-500">{props.label}</p>
            <p className="font-semibold text-white">{props.value}</p>
        </div>
    );
}

function TaskLeaderboardPanel(props: {
    model: AdminTaskPipelineModel;
    visibleRows: AdminTaskPipelineModel["taskLeaderboardRows"];
    page: number;
    pageCount: number;
    hasPagination: boolean;
    onPageChange: (direction: -1 | 1) => void;
    formatCount: (value: number | null) => string;
    formatRate: (value: number | null) => string;
    formatSpeed: (value: number | null) => string;
    formatPercent: (value: number) => string;
}) {
    return (
        <div className="rounded-[1rem] border border-white/10 bg-black/25 p-3">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Task leaderboard</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">Ranked by completions. Rates use completed / assigned.</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-gray-500">
                    <span>{props.model.leaderboardMode}</span>
                    {props.hasPagination ? (
                        <>
                            <button type="button" className="rounded-full border border-white/10 px-2 py-1 font-semibold text-gray-300 disabled:cursor-not-allowed disabled:opacity-40" disabled={props.page <= 0} onClick={() => props.onPageChange(-1)}>Prev</button>
                            <span>{props.page + 1}/{props.pageCount}</span>
                            <button type="button" className="rounded-full border border-white/10 px-2 py-1 font-semibold text-gray-300 disabled:cursor-not-allowed disabled:opacity-40" disabled={props.page >= props.pageCount - 1} onClick={() => props.onPageChange(1)}>Next</button>
                        </>
                    ) : null}
                </div>
            </div>

            {props.visibleRows.length > 0 ? (
                <div className="space-y-1.5">
                    {props.visibleRows.map((task) => (
                        <div key={task.taskId} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 rounded-[0.85rem] border border-white/10 bg-white/[0.035] px-2.5 py-2 text-[10px] text-gray-400 sm:grid-cols-[1.8rem_minmax(0,1fr)_5rem]">
                            <span className="pt-0.5 font-black text-brand-purple">#{task.rank}</span>
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <p className="truncate text-xs font-semibold text-white">{task.label}</p>
                                    {task.mismatches.length > 0 ? <span className="shrink-0 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-amber-200" title={task.mismatches.join(", ")}>Check</span> : null}
                                </div>
                                <div className="mt-1 grid grid-cols-4 gap-1 text-[9px]">
                                    <span>A {props.formatCount(task.assigned)}</span>
                                    <span>S {props.formatCount(task.started)}</span>
                                    <span className="text-brand-purple">C {props.formatCount(task.completed)}</span>
                                    <span className="text-rose-300">F {props.formatCount(task.failed)}</span>
                                </div>
                                <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] text-gray-500">
                                    <span>{props.formatRate(task.completionRate)}</span>
                                    <span>{props.formatSpeed(task.avgCompletionTime)}</span>
                                    <span>{task.rewardDisplay}</span>
                                </div>
                            </div>
                            <div className="hidden text-right text-[9px] leading-4 text-gray-500 sm:block">
                                <p>{task.sourceMode}</p>
                                <p>{task.rewardVerified ? "reward verified" : "reward unverified"}</p>
                                <p>{task.timingCoveragePercent === null ? "timing unavailable" : `${props.formatPercent(task.timingCoveragePercent)} timed`}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-[0.9rem] border border-dashed border-white/10 bg-black/20 p-3 text-xs text-gray-500">Task leaderboard rows are waiting for lifecycle events.</div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-gray-400 sm:grid-cols-4">
                <span>Reward checks: <span className="text-white">{props.model.rewardMismatchCount}</span></span>
                <span>Lifecycle checks: <span className="text-white">{props.model.lifecycleMismatchCount}</span></span>
                <span>Timing partial: <span className="text-white">{props.model.timingPartialCount}</span></span>
                <span>Pipeline delta: <span className="text-white">{props.formatCount(props.model.leaderboardPipelineDelta)}</span></span>
            </div>
        </div>
    );
}
