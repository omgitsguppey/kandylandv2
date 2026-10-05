"use client";

import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/data-table";
import { TableScrollArea } from "@/components/ui/data-table";
import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import { useEffect, useState, type ReactNode } from "react";
import { Funnel } from "lucide-react";

import {
    AnalyticsViewModeToggle,
    SectionCard,
    type AnalyticsViewMode,
} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import type { AdminTaskPipelineModel, AdminTaskPipelineMetric } from "@/lib/admin-task-pipeline";

const NO_RATE_SAMPLE_LABEL = "No rate sample";
const NO_TIMING_SAMPLE_LABEL = "No timing sample";
const NO_SNAPSHOT_SAMPLE_LABEL = "No verified snapshot yet";

export function AdminDailyTaskPipelineModule(props: {
    renderSectionRangeControl: (sectionKey: string) => ReactNode;
    model: AdminTaskPipelineModel;
    formatDuration: (seconds: number) => string;
    formatPercent: (value: number) => string;
}) {
    const [leaderboardPage, setLeaderboardPage] = useState(0);
    const [taskPipelineViewMode, setTaskPipelineViewMode] = useState<AnalyticsViewMode>("cards");

    useEffect(() => {
        if (typeof window === "undefined") return;
        (window as typeof window & {
            __KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__?: AdminTaskPipelineModel;
        }).__KANDYDROPS_ADMIN_ANALYTICS_DAILY_TASK_PIPELINE_DEBUG__ = props.model;
    }, [props.model]);

    const formatCount = (value: number | null) => value === null ? "Waiting" : value.toLocaleString();
    const formatPartitionCount = (value: number | null) => value === null ? "Not separated by source" : value.toLocaleString();
    const formatRate = (value: number | null) => value === null ? NO_RATE_SAMPLE_LABEL : props.formatPercent(value);
    const formatSpeed = (value: number | null) => value === null ? NO_TIMING_SAMPLE_LABEL : props.formatDuration(value);
    const lifecycleProgressWidth = (metric: AdminTaskPipelineMetric) => {
        const peak = Math.max(1, props.model.peakCount);
        return `${Math.max(4, Math.min(100, ((metric.value ?? 0) / peak) * 100))}%`;
    };
    const speedPeak = Math.max(1, ...props.model.speedBuckets.map((bucket) => bucket.count ?? 0));
    const speedBarClass = (label: string, count: number | null) => {
        if ((count ?? 0) <= 0) return "bg-secondary";
        if (label.includes("60m+")) return "bg-destructive";
        if (label.includes("15-60m")) return "bg-warning";
        return "bg-primary";
    };
    const pageSize = props.model.taskLeaderboardPageSize;
    const pageCount = Math.max(1, Math.ceil(props.model.taskLeaderboardRows.length / pageSize));
    const page = Math.min(leaderboardPage, pageCount - 1);
    const visibleRows = props.model.taskLeaderboardRows.slice(page * pageSize, page * pageSize + pageSize);
    const hasPagination = props.model.taskLeaderboardRows.length > pageSize;
    const changePage = (direction: -1 | 1) => {
        setLeaderboardPage((current) => Math.min(pageCount - 1, Math.max(0, current + direction)));
    };
    const generatedLabel = props.model.generatedAtUtc ? new Date(props.model.generatedAtUtc).toLocaleString() : NO_SNAPSHOT_SAMPLE_LABEL;
    const staleSnapshotCopy = props.model.snapshotState === "stale"
        ? `Showing the last verified task pipeline snapshot from ${generatedLabel}; refresh is due.`
        : props.model.visibleCopy;
    const guidanceNeedsReview = props.model.guidanceTelemetryState !== "available";

    return (
        <SectionCard
            title="Daily Task Pipeline"
            subtitle="Assigned, started, completed, and failed tasks in one progression view."
            icon={Funnel}
            rightSlot={(
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <AnalyticsViewModeToggle
                        value={taskPipelineViewMode}
                        onChange={setTaskPipelineViewMode}
                        options={[
                            { id: "cards", label: "Cards" },
                            { id: "chart", label: "Chart" },
                            { id: "table", label: "Table" },
                        ]}
                    />
                    {props.renderSectionRangeControl("dailyTaskPipeline")}
                </div>
            )}
        >
            <div
                className="space-y-2.5"
                data-admin-analytics-mobile-view-mode={taskPipelineViewMode}
                data-task-pipeline-delta-source="leaderboardPipelineDelta"
                data-task-pipeline-snapshot-state={props.model.snapshotState}
                data-task-pipeline-truth-state={props.model.truthState}
                data-task-pipeline-guidance-state={props.model.guidanceTelemetryState}
            >
                <div className="flex flex-col gap-2 rounded-[1rem] border border-border bg-secondary px-3 py-2 text-[11px] leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p>{props.model.recommendation}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                            Snapshot {props.model.snapshotState} · last validated {generatedLabel}
                        </p>
                    </div>
                    <AdminStatusBadge state={props.model.truthState} label={props.model.badgeLabel} className="max-w-[5.5rem] shrink-0 truncate whitespace-nowrap px-1.5 py-0.5 text-[9px]" />
                </div>

                {taskPipelineViewMode === "cards" ? (
                    <>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {props.model.lifecycleMetrics.map((metric) => (
                                <div key={metric.key} className="rounded-[0.9rem] border border-border bg-background/25 px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{metric.key === "failed" ? "Failed / expired" : metric.label}</p>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{formatCount(metric.value)}</p>
                                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{metric.source.replace("_", " ")}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-1.5 rounded-[1rem] border border-border bg-secondary px-3 py-2 text-[10px] text-muted-foreground sm:grid-cols-5">
                            <span>Start rate uses <span className="text-foreground">{props.model.startRate.formula}</span>: {formatRate(props.model.rates.startFromAssignedPct)}</span>
                            <span>Completed / started: <span className="text-foreground">{formatRate(props.model.rates.completionFromStartedPct)}</span></span>
                            <span>Completed / assigned: <span className="text-foreground">{formatRate(props.model.rates.completionFromAssignedPct)}</span></span>
                            <span>Failed / assigned: <span className="text-foreground">{formatRate(props.model.rates.failureFromAssignedPct)}</span></span>
                            <span>Fail after start: <span className="text-foreground">{formatRate(props.model.rates.failureAfterStartPct)}</span></span>
                        </div>

                        {guidanceNeedsReview ? (
                            <p className="rounded-[0.8rem] border border-warning/25 bg-warning/10 px-2.5 py-2 text-[10px] leading-5 text-warning">
                                Task guidance telemetry is missing; guidance impact cannot be evaluated.
                            </p>
                        ) : null}

                        <Disclosure className="rounded-[1rem] border border-border bg-background/25 px-3 py-2 text-[10px] leading-5 text-muted-foreground">
                            <DisclosureSummary className="min-h-11 cursor-pointer py-3 font-semibold text-muted-foreground">
                                Source and delta checks
                            </DisclosureSummary>
                            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                <span>Stuck assigned: <span className="text-foreground">{formatCount(props.model.stuckAssignedCount)}</span></span>
                                <span>Active stuck assigned: <span className="text-foreground">{formatPartitionCount(props.model.stuckAssignedBreakdown.activeCurrentWindow)}</span></span>
                                <span>Historical stuck assigned: <span className="text-foreground">{formatPartitionCount(props.model.stuckAssignedBreakdown.historicalUnstarted)}</span></span>
                                <span>Expired unstarted: <span className="text-foreground">{formatPartitionCount(props.model.stuckAssignedBreakdown.expiredUnstarted)}</span></span>
                                <span>Started open: <span className="text-foreground">{formatCount(props.model.startedNotCompletedCount)}</span></span>
                                <span>Orphan starts: <span className="text-foreground">{formatCount(props.model.orphanStartedCount)}</span></span>
                                <span>Orphan completions: <span className="text-foreground">{formatCount(props.model.orphanCompletedCount)}</span></span>
                                <span>Pipeline delta: <span className="text-foreground">{formatCount(props.model.checks.pipelineDelta)}</span></span>
                                <span>Timing partial: <span className="text-foreground">{props.model.checks.timingPartial}</span></span>
                            </div>
                            <p className="mt-2 text-muted-foreground">
                                {staleSnapshotCopy} {props.model.checks.pipelineDeltaExplanation} {props.model.stuckAssignedBreakdown.explanation}
                            </p>
                        </Disclosure>
                    </>
                ) : null}

                {taskPipelineViewMode === "chart" ? (
                    <div
                        className="space-y-2 rounded-[1rem] border border-border bg-background/25 p-3"
                        data-task-pipeline-chart="compact"
                        data-task-pipeline-snapshot-state={props.model.snapshotState}
                        data-task-pipeline-truth-state={props.model.truthState}
                        data-task-pipeline-guidance-state={props.model.guidanceTelemetryState}
                    >
                        {props.model.hasData ? (
                            <div className="space-y-1.5">
                                {props.model.lifecycleMetrics.map((metric) => (
                                    <div key={metric.key} className="grid grid-cols-[5.2rem_minmax(0,1fr)_3rem] items-center gap-2 text-[11px]">
                                        <span className="truncate text-muted-foreground">{metric.key === "failed" ? "Failed / exp." : metric.label}</span>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                            <div className={metric.key === "failed" ? "h-full rounded-full bg-destructive" : metric.key === "completed" ? "h-full rounded-full bg-primary" : "h-full rounded-full bg-secondary"} style={{ width: lifecycleProgressWidth(metric) }} />
                                        </div>
                                        <span className="text-right font-semibold text-foreground">{formatCount(metric.value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[0.9rem] border border-dashed border-border bg-background/20 p-3 text-xs text-muted-foreground">
                                Task pipeline is waiting for lifecycle signals.
                            </div>
                        )}

                        <div className="space-y-1.5" data-task-pipeline-timing-recommendation={props.model.timingRecommendation}>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Completion speed
                            </p>
                            <p className="text-[10px] leading-4 text-muted-foreground">
                                {props.model.timingRecommendation}
                            </p>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                <SpeedTile label="Avg finish" value={formatSpeed(props.model.avgCompletionSeconds)} />
                                <SpeedTile label="Median" value={formatSpeed(props.model.medianCompletionSeconds)} />
                                <SpeedTile label="Timed" value={formatCount(props.model.timedCompletionCount)} />
                                <SpeedTile label="Coverage" value={formatRate(props.model.timingCoveragePercent)} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            {props.model.speedBuckets.map((bucket) => (
                                <div key={bucket.bucketKey} className="grid grid-cols-[3.8rem_minmax(0,1fr)_2.8rem] items-center gap-2 text-[10px]">
                                    <span className="truncate text-muted-foreground">{bucket.label}</span>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                        <div className={`h-full rounded-full ${speedBarClass(bucket.label, bucket.count)}`} style={{ width: `${Math.max(4, Math.min(100, ((bucket.count ?? 0) / speedPeak) * 100))}%` }} />
                                    </div>
                                    <span className="text-right font-semibold text-muted-foreground">{formatCount(bucket.count)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {taskPipelineViewMode === "table" ? (
                    <TableScrollArea
                        className="overflow-x-auto rounded-[1rem] border border-border bg-background/25"
                        data-task-pipeline-table="compact"
                        data-task-pipeline-snapshot-state={props.model.snapshotState}
                        data-task-pipeline-truth-state={props.model.truthState}
                        data-task-pipeline-guidance-state={props.model.guidanceTelemetryState}
                    >
                        <DataTable className="min-w-full text-left text-xs">
                            <thead className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Lane</th>
                                    <th className="px-3 py-2 font-semibold">Count</th>
                                    <th className="px-3 py-2 font-semibold">Source</th>
                                    <th className="px-3 py-2 font-semibold">Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-muted-foreground">
                                {props.model.lifecycleMetrics.map((metric) => (
                                    <tr key={metric.key} data-task-pipeline-lifecycle-key={metric.key}>
                                        <td className="px-3 py-2 font-semibold text-foreground">{metric.key === "failed" ? "Failed / expired" : metric.label}</td>
                                        <td className="px-3 py-2">{formatCount(metric.value)}</td>
                                        <td className="px-3 py-2">{metric.source.replace("_", " ")}</td>
                                        <td className="px-3 py-2">{metric.key === "completed" ? formatRate(props.model.rates.completionFromStartedPct) : metric.key === "failed" ? formatRate(props.model.rates.failureFromAssignedPct) : metric.key === "started" ? formatRate(props.model.rates.startFromAssignedPct) : "Base"}</td>
                                    </tr>
                                ))}
                                {props.model.guidanceMetrics.map((metric) => (
                                    <tr key={metric.key} data-task-pipeline-guidance-key={metric.key}>
                                        <td className="px-3 py-2 font-semibold text-foreground">{metric.label}</td>
                                        <td className="px-3 py-2">{formatCount(metric.value)}</td>
                                        <td className="px-3 py-2">{props.model.guidanceTelemetryState}</td>
                                        <td className="px-3 py-2">Guidance</td>
                                    </tr>
                                ))}
                            </tbody>
                        </DataTable>
                    </TableScrollArea>
                ) : null}

                {taskPipelineViewMode === "table" ? (
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
                ) : null}

                {taskPipelineViewMode !== "cards" ? (
                    <div className="grid gap-1.5 rounded-[1rem] border border-border bg-secondary px-3 py-2 text-[10px] text-muted-foreground sm:grid-cols-2">
                        <span>
                            {staleSnapshotCopy}
                        </span>
                        {guidanceNeedsReview ? (
                            <span className="text-warning">
                                Task guidance telemetry is missing.
                            </span>
                        ) : (
                            <span>
                                Guidance source {props.model.guidanceTelemetryState}.
                            </span>
                        )}
                    </div>
                ) : null}
            </div>
        </SectionCard>
    );
}

function SpeedTile(props: { label: string; value: string }) {
    return (
        <div className="rounded-[0.8rem] bg-secondary px-2 py-1.5">
            <p className="truncate text-[10px] text-muted-foreground">{props.label}</p>
            <p className="font-semibold text-foreground">{props.value}</p>
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
        <div className="rounded-[1rem] border border-border bg-background/25 p-3">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Task leaderboard</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Ranked by completions. Each row shows completed / assigned and completed / started.</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span>{props.model.leaderboardMode}</span>
                    {props.hasPagination ? (
                        <>
                            <Button variant="ghost" type="button" className="rounded-full border border-border px-2 py-1 font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40" disabled={props.page <= 0} onClick={() => props.onPageChange(-1)}>Prev</Button>
                            <span>{props.page + 1}/{props.pageCount}</span>
                            <Button variant="ghost" type="button" className="rounded-full border border-border px-2 py-1 font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40" disabled={props.page >= props.pageCount - 1} onClick={() => props.onPageChange(1)}>Next</Button>
                        </>
                    ) : null}
                </div>
            </div>

            {props.visibleRows.length > 0 ? (
                <div className="space-y-1.5">
                    {props.visibleRows.map((task) => (
                        <div key={task.taskId} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-2 rounded-[0.85rem] border border-border bg-secondary px-2.5 py-2 text-[10px] text-muted-foreground sm:grid-cols-[1.8rem_minmax(0,1fr)_5rem]">
                            <span className="pt-0.5 font-semibold text-primary">#{task.rank}</span>
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <p className="truncate text-xs font-semibold text-foreground">{task.label}</p>
                                    {task.mismatches.length > 0 ? <span className="shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-warning" title={task.mismatches.join(", ")}>Check</span> : null}
                                </div>
                                <div className="mt-1 grid grid-cols-4 gap-1 text-[9px]">
                                    <span>A {props.formatCount(task.assigned)}</span>
                                    <span>S {props.formatCount(task.started)}</span>
                                    <span className="text-primary">C {props.formatCount(task.completed)}</span>
                                    <span className="text-destructive">F/E {props.formatCount(task.failed)}</span>
                                </div>
                                <div className="mt-1 grid gap-1 text-[9px] text-muted-foreground">
                                    <span>{props.formatCount(task.completed)} completed / {props.formatCount(task.assigned)} assigned = {props.formatRate(task.completionRate)}</span>
                                    <span>{props.formatCount(task.completed)} completed / {props.formatCount(task.started)} started = {props.formatRate(task.startedCompletionRate)}</span>
                                    <span>Avg finish {props.formatSpeed(task.avgCompletionTime)} · Paid rewards GD {task.rewardDisplay}</span>
                                </div>
                            </div>
                            <div className="hidden text-right text-[9px] leading-4 text-muted-foreground sm:block">
                                <p>{task.sourceMode}</p>
                                <p>{task.rewardVerified ? "reward verified" : "reward unverified"}</p>
                                <p>{task.timingCoveragePercent === null ? "No timing sample" : `${props.formatPercent(task.timingCoveragePercent)} timed`}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-[0.9rem] border border-dashed border-border bg-background/20 p-3 text-xs text-muted-foreground">Task leaderboard rows are waiting for lifecycle events.</div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground sm:grid-cols-4">
                <span>Reward parity warnings: <span className="text-foreground">{props.model.checks.rewardChecks}</span></span>
                <span>Lifecycle checks: <span className="text-foreground">{props.model.checks.lifecycleChecks}</span></span>
                <span>Timing partial: <span className="text-foreground">{props.model.checks.timingPartial}</span></span>
                <span>Pipeline delta: <span className="text-foreground">{props.formatCount(props.model.checks.pipelineDelta)}</span></span>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                Pipeline delta is leaderboard completed total minus pipeline completed total. {props.model.checks.pipelineDeltaExplanation}
            </p>
        </div>
    );
}
