import type { AdminSurfaceState } from "@/lib/admin-parity";
import { buildTaskLeaderboardRows, type AdminTaskLeaderboardRow } from "@/lib/admin-task-leaderboard";
import type { CountBucketItem, HistoricalAnalyticsResponse, RangeOption, TaskLeaderboardItem } from "@/types/admin-analytics";

export interface AdminTaskPipelineItemInput {
    label: string;
    count: number;
}

type TaskPipelineMode = "state" | "mixed" | "raw_event" | "stale_snapshot" | "unavailable";
type TaskMetricSource = "lifecycle_log" | "task_guidance" | "mixed" | "unavailable";

export interface AdminTaskPipelineMetric {
    key: "assigned" | "started" | "completed" | "failed" | "reminded" | "guideShown" | "guideTap";
    label: string;
    value: number | null;
    source: TaskMetricSource;
    truthState: AdminSurfaceState;
}

export interface AdminTaskPipelineModel {
    hasData: boolean;
    items: AdminTaskPipelineItemInput[];
    peakCount: number;
    selectedRange: RangeOption;
    generatedAtUtc: string | null;
    lastValidatedAtUtc: string | null;
    snapshotState: "live" | "stale" | "partial" | "failed";
    pipelineMode: TaskPipelineMode;
    badgeLabel: "STATE" | "MIXED" | "RAW" | "STALE" | "WAIT";
    truthState: AdminSurfaceState;
    canonicalTaskSource: string;
    telemetryTaskSource: string;
    lifecycleLogSource: string;
    userTaskStateSource: string;
    assignedCount: AdminTaskPipelineMetric;
    startedCount: AdminTaskPipelineMetric;
    completedCount: AdminTaskPipelineMetric;
    failedCount: AdminTaskPipelineMetric;
    remindersCount: AdminTaskPipelineMetric;
    guideShownCount: AdminTaskPipelineMetric;
    guideTapCount: AdminTaskPipelineMetric;
    lifecycleMetrics: AdminTaskPipelineMetric[];
    guidanceMetrics: AdminTaskPipelineMetric[];
    startRate: { value: number | null; formula: "started / assigned"; denominator: "assigned" };
    completionRate: { value: number | null; formula: "completed / started"; denominator: "started" };
    failRate: { value: number | null; formula: "failed / assigned"; denominator: "assigned" };
    rates: {
        startFromAssignedPct: number | null;
        completionFromStartedPct: number | null;
        completionFromAssignedPct: number | null;
        failureFromAssignedPct: number | null;
        failureAfterStartPct: number | null;
        expirationFromAssignedPct: number | null;
        explanations: string[];
    };
    stuckAssignedCount: number | null;
    startedNotCompletedCount: number | null;
    orphanStartedCount: number | null;
    orphanCompletedCount: number | null;
    stuckAssignedBreakdown: {
        activeCurrentWindow: number | null;
        historicalUnstarted: number | null;
        expiredUnstarted: number | null;
        explanation: string;
    };
    guidanceTelemetryState: "available" | "missing" | "partial";
    guidanceTelemetryExplanation: string;
    assignmentStateMissingCount: number | null;
    telemetryStateMismatchCount: number | null;
    stateTelemetryMissingCount: number | null;
    topFailingTaskType: string | null;
    topLeakingStage: string | null;
    perTaskBreakdown: Array<{
        taskId: string;
        label: string;
        assigned: number;
        started: number;
        completed: number;
        failed: number;
        reminders: number;
        guideShown: number;
        guideTaps: number;
        mismatches: number;
    }>;
    taskLeaderboardConsolidated: boolean;
    standaloneTaskLeaderboardRemoved: boolean;
    leaderboardMode: "completions";
    taskCatalogSource: string;
    taskLeaderboardRows: AdminTaskLeaderboardRow[];
    taskLeaderboardPageSize: number;
    topCompletedTask: string | null;
    topRewardTask: string | null;
    topFailingTask: string | null;
    worstCompletionRateTask: string | null;
    largestAssignedNotStartedTask: string | null;
    rewardMismatchCount: number;
    lifecycleMismatchCount: number;
    timingPartialCount: number;
    leaderboardPipelineDelta: number | null;
    speedTimingDelta: number | null;
    completionSpeedConsolidated: boolean;
    standaloneTaskCompletionSpeedRemoved: boolean;
    speedSource: string;
    totalCompletedCount: number | null;
    timedCompletionCount: number | null;
    timingCoveragePercent: number | null;
    avgCompletionSeconds: number | null;
    medianCompletionSeconds: number | null;
    speedBuckets: Array<{
        bucketKey: string;
        label: string;
        count: number | null;
        percentOfTimedCompletions: number | null;
    }>;
    fastestBucket: string | null;
    slowestBucket: string | null;
    slowTaskCount: number | null;
    slowThresholdSeconds: number;
    missingStartTimestampCount: number | null;
    missingCompletionTimestampCount: number | null;
    durationRejectedCount: number | null;
    speedBucketReconciliationDelta: number | null;
    sourceReconciliation: {
        lifecycleLogCount: number | null;
        userTaskStateCount: number | null;
        telemetryCompletionCount: number | null;
        mismatchCount: number | null;
    };
    checks: {
        rewardChecks: number;
        lifecycleChecks: number;
        timingPartial: number;
        pipelineDelta: number | null;
        pipelineDeltaExplanation: string;
        rewardChecksLabel: string;
        explanations: string[];
    };
    timingRecommendation: string;
    stale: boolean;
    cache: boolean;
    serverConfirmed: boolean;
    fallback: boolean;
    estimated: boolean;
    fromCache: boolean | null;
    hasPendingWrites: boolean | null;
    fakeZeroPrevented: boolean;
    duplicateRefreshPrevented: boolean;
    recommendation: string;
    visibleCopy: string;
}

function findCount(items: CountBucketItem[], label: string) {
    return items.find((item) => item.label.toLowerCase() === label.toLowerCase())?.count ?? 0;
}

function metric(input: {
    key: AdminTaskPipelineMetric["key"];
    label: string;
    value: number | null;
    source: TaskMetricSource;
    truthState: AdminSurfaceState;
}): AdminTaskPipelineMetric {
    return input;
}

function rate(numerator: number | null, denominator: number | null) {
    if (numerator === null || denominator === null || denominator <= 0) return null;
    return numerator / denominator;
}

function bucketMaxSeconds(label: string) {
    if (label.includes("<1m")) return 60;
    if (label.includes("1-5m")) return 300;
    if (label.includes("5-15m")) return 900;
    if (label.includes("15-60m")) return 3600;
    return Number.POSITIVE_INFINITY;
}

function bucketMidpointSeconds(label: string) {
    if (label.includes("<1m")) return 30;
    if (label.includes("1-5m")) return 180;
    if (label.includes("5-15m")) return 600;
    if (label.includes("15-60m")) return 2250;
    return 3600;
}

function normalizeBucketKey(label: string) {
    return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

function weightedMedianBucketSeconds(buckets: CountBucketItem[], total: number) {
    if (total <= 0) return null;
    let running = 0;
    const target = total / 2;
    for (const bucket of buckets) {
        running += Math.max(0, bucket.count);
        if (running >= target) return bucketMidpointSeconds(bucket.label);
    }
    return null;
}

function buildTimingRecommendation(input: {
    timedCompletionCount: number | null;
    totalCompletedCount: number | null;
    fastestBucket: string | null;
    slowTaskCount: number | null;
    timingCoveragePercent: number | null;
}) {
    if (input.timedCompletionCount === null) return "Timing unavailable until linked task durations load.";
    if (input.timedCompletionCount <= 0) return "Timing unavailable because no linked start/completion durations landed.";
    if ((input.timingCoveragePercent ?? 1) < 0.8) {
        return `Timing partial: ${input.timedCompletionCount.toLocaleString()} of ${(input.totalCompletedCount ?? 0).toLocaleString()} completions have linked durations.`;
    }
    if ((input.slowTaskCount ?? 0) > 0) return `${input.slowTaskCount?.toLocaleString()} timed completions are over 15 minutes.`;
    return input.fastestBucket ? `Most timed completions land in ${input.fastestBucket}.` : "Completion speed is available.";
}

function buildRecommendation(input: {
    assigned: number | null;
    started: number | null;
    completed: number | null;
    failed: number | null;
    guideShown: number | null;
    mode: TaskPipelineMode;
}) {
    if (input.assigned === null) return "Waiting for task lifecycle signals.";
    if (input.mode === "raw_event") return "Task pipeline is using raw task events.";
    if ((input.started ?? 0) > (input.assigned ?? 0)) return "Task starts exceed assignments; review lifecycle linkage.";
    if ((input.completed ?? 0) > (input.started ?? 0)) return "Task completions exceed starts; review orphan completions.";
    if ((input.failed ?? 0) > 0) return "Task failures are present in this range.";
    if ((input.guideShown ?? 0) > (input.started ?? 0) * 2 && (input.started ?? 0) > 0) return "Guidance views are much higher than starts.";
    return "Task lifecycle logs are separated from guidance signals.";
}

export function buildAdminTaskPipelineModel(input: {
    selectedRange: RangeOption;
    response?: HistoricalAnalyticsResponse;
    items: CountBucketItem[];
    taskDurationBuckets: CountBucketItem[];
    taskLeaderboard: TaskLeaderboardItem[];
    loading: boolean;
    error?: Error;
    overviewTruthState?: AdminSurfaceState;
}): AdminTaskPipelineModel {
    const hasResponse = Boolean(input.response);
    const stale = Boolean(input.response && (input.error || input.response.cacheState === "stale"));
    const cache = Boolean(input.response?.cacheState && input.response.cacheState !== "miss");
    const fallback = Boolean(input.error || input.response?.cacheRevalidating);
    const fakeZeroPrevented = !hasResponse;
    const generatedAtUtc = input.response?.generatedAtMs ? new Date(input.response.generatedAtMs).toISOString() : null;
    const truthState: AdminSurfaceState = !hasResponse
        ? input.loading ? "loading" : "unavailable"
        : stale
            ? "stale"
            : input.overviewTruthState ?? "live";
    const snapshotState: AdminTaskPipelineModel["snapshotState"] = !hasResponse
        ? input.loading ? "failed" : "failed"
        : stale
            ? "stale"
            : fallback
                ? "partial"
                : "live";
    const lifecycleValues = {
        assigned: fakeZeroPrevented ? null : findCount(input.items, "Assigned"),
        started: fakeZeroPrevented ? null : findCount(input.items, "Started"),
        completed: fakeZeroPrevented ? null : findCount(input.items, "Completed"),
        failed: fakeZeroPrevented ? null : findCount(input.items, "Failed"),
        reminded: fakeZeroPrevented ? null : findCount(input.items, "Reminders"),
        guideShown: fakeZeroPrevented ? null : findCount(input.items, "Guides shown"),
        guideTap: fakeZeroPrevented ? null : findCount(input.items, "Guide taps"),
    };
    const totalCompletedCount = lifecycleValues.completed;
    const timedCompletionCount = fakeZeroPrevented
        ? null
        : input.taskDurationBuckets.reduce((total, bucket) => total + Math.max(0, bucket.count), 0);
    const timingCoveragePercent = totalCompletedCount !== null && totalCompletedCount > 0 && timedCompletionCount !== null
        ? timedCompletionCount / totalCompletedCount
        : null;
    const speedBucketReconciliationDelta = totalCompletedCount === null || timedCompletionCount === null
        ? null
        : totalCompletedCount - timedCompletionCount;
    const weightedSecondsTotal = input.taskDurationBuckets.reduce(
        (total, bucket) => total + Math.max(0, bucket.count) * bucketMidpointSeconds(bucket.label),
        0,
    );
    const avgCompletionSeconds = timedCompletionCount && timedCompletionCount > 0
        ? Math.round(weightedSecondsTotal / timedCompletionCount)
        : null;
    const medianCompletionSeconds = timedCompletionCount && timedCompletionCount > 0
        ? weightedMedianBucketSeconds(input.taskDurationBuckets, timedCompletionCount)
        : null;
    const speedBuckets = input.taskDurationBuckets.map((bucket) => ({
        bucketKey: normalizeBucketKey(bucket.label),
        label: bucket.label,
        count: fakeZeroPrevented ? null : bucket.count,
        percentOfTimedCompletions: timedCompletionCount && timedCompletionCount > 0
            ? bucket.count / timedCompletionCount
            : null,
    }));
    const populatedSpeedBuckets = speedBuckets.filter((bucket) => (bucket.count ?? 0) > 0);
    const fastestBucket = populatedSpeedBuckets[0]?.label ?? null;
    const slowestBucket = populatedSpeedBuckets[populatedSpeedBuckets.length - 1]?.label ?? null;
    const slowThresholdSeconds = 900;
    const slowTaskCount = fakeZeroPrevented
        ? null
        : input.taskDurationBuckets
            .filter((bucket) => bucketMaxSeconds(bucket.label) > slowThresholdSeconds)
            .reduce((total, bucket) => total + Math.max(0, bucket.count), 0);
    const hasLifecycle = [lifecycleValues.assigned, lifecycleValues.started, lifecycleValues.completed, lifecycleValues.failed]
        .some((value) => (value ?? 0) > 0);
    const hasGuidance = [lifecycleValues.guideShown, lifecycleValues.guideTap, lifecycleValues.reminded]
        .some((value) => (value ?? 0) > 0);
    const guidanceTelemetryState: AdminTaskPipelineModel["guidanceTelemetryState"] = !hasResponse
        ? "missing"
        : hasGuidance
            ? "available"
            : "missing";
    const guidanceTelemetryExplanation = guidanceTelemetryState === "available"
        ? "Task guidance telemetry is present for this range."
        : "Task guidance telemetry is missing; guidance impact cannot be evaluated.";
    const pipelineMode: TaskPipelineMode = !hasResponse
        ? "unavailable"
        : stale
            ? "stale_snapshot"
            : hasLifecycle && hasGuidance
                ? "mixed"
                : hasLifecycle
                    ? "raw_event"
                    : "unavailable";
    const badgeLabel = pipelineMode === "stale_snapshot"
        ? "STALE"
        : pipelineMode === "mixed"
            ? "MIXED"
            : pipelineMode === "raw_event"
                ? "RAW"
                : input.loading
                    ? "WAIT"
                    : "WAIT";

    const lifecycleMetrics = [
        metric({ key: "assigned", label: "Assigned", value: lifecycleValues.assigned, source: "lifecycle_log", truthState }),
        metric({ key: "started", label: "Started", value: lifecycleValues.started, source: "lifecycle_log", truthState }),
        metric({ key: "completed", label: "Completed", value: lifecycleValues.completed, source: "lifecycle_log", truthState }),
        metric({ key: "failed", label: "Failed", value: lifecycleValues.failed, source: "lifecycle_log", truthState }),
    ];
    const guidanceMetrics = [
        metric({ key: "reminded", label: "Reminded", value: lifecycleValues.reminded, source: "lifecycle_log", truthState }),
        metric({ key: "guideShown", label: "Guides shown", value: lifecycleValues.guideShown, source: "task_guidance", truthState }),
        metric({ key: "guideTap", label: "Guide taps", value: lifecycleValues.guideTap, source: "task_guidance", truthState }),
    ];
    const orphanStartedCount = lifecycleValues.assigned === null || lifecycleValues.started === null
        ? null
        : Math.max(0, lifecycleValues.started - lifecycleValues.assigned);
    const orphanCompletedCount = lifecycleValues.started === null || lifecycleValues.completed === null
        ? null
        : Math.max(0, lifecycleValues.completed - lifecycleValues.started);
    const stuckAssignedCount = lifecycleValues.assigned === null || lifecycleValues.started === null
        ? null
        : Math.max(0, lifecycleValues.assigned - lifecycleValues.started);
    const startedNotCompletedCount = lifecycleValues.started === null || lifecycleValues.completed === null
        ? null
        : Math.max(0, lifecycleValues.started - lifecycleValues.completed);
    const missingStartTimestampCount = speedBucketReconciliationDelta === null
        ? null
        : Math.max(0, speedBucketReconciliationDelta);
    const missingCompletionTimestampCount = startedNotCompletedCount;
    const durationRejectedCount = speedBucketReconciliationDelta === null
        ? null
        : Math.max(0, speedBucketReconciliationDelta);
    const completionFromAssignedPct = rate(lifecycleValues.completed, lifecycleValues.assigned);
    const failureFromAssignedPct = rate(lifecycleValues.failed, lifecycleValues.assigned);
    const ratesExplanations = [
        "Start rate uses started / assigned.",
        "Completion from started uses completed / started.",
        "Completion from assigned uses completed / assigned.",
        "Failure from assigned uses failed-or-expired / assigned.",
        "Fail-after-start is unavailable because failures include unstarted expirations in this snapshot.",
    ];
    const taskLeaderboardRows = buildTaskLeaderboardRows({
        tasks: input.taskLeaderboard,
        fakeZeroPrevented,
        stale,
        truthState,
    });
    const leaderboardCompletedTotal = taskLeaderboardRows.reduce((total, task) => total + (task.completed ?? 0), 0);
    const leaderboardTimedTotal = taskLeaderboardRows.reduce((total, task) => total + (task.timedCompletionCount ?? 0), 0);
    const leaderboardPipelineDelta = lifecycleValues.completed === null ? null : leaderboardCompletedTotal - lifecycleValues.completed;
    const speedTimingDelta = timedCompletionCount === null ? null : leaderboardTimedTotal - timedCompletionCount;
    const rewardMismatchCount = taskLeaderboardRows.filter((task) => !task.rewardVerified).length;
    const lifecycleMismatchCount = taskLeaderboardRows.filter((task) => task.mismatches.some((mismatch) => mismatch !== "catalog_reward_unavailable" && mismatch !== "timing_partial")).length;
    const timingPartialCount = taskLeaderboardRows.filter((task) => task.mismatches.includes("timing_partial")).length;
    const topCompletedTask = taskLeaderboardRows[0]?.label ?? null;
    const topRewardTask = taskLeaderboardRows
        .filter((task) => task.rewardTotal !== null)
        .slice()
        .sort((left, right) => (right.rewardTotal ?? 0) - (left.rewardTotal ?? 0))[0]?.label ?? null;
    const topFailingTask = taskLeaderboardRows.slice().sort((left, right) => (right.failed ?? 0) - (left.failed ?? 0))[0];
    const worstCompletionRateTask = taskLeaderboardRows
        .filter((task) => (task.assigned ?? 0) > 0)
        .slice()
        .sort((left, right) => (left.completionRate ?? 1) - (right.completionRate ?? 1))[0]?.label ?? null;
    const largestAssignedNotStartedTask = taskLeaderboardRows
        .slice()
        .sort((left, right) => (right.assignedNotStarted ?? 0) - (left.assignedNotStarted ?? 0))[0]?.label ?? null;
    const perTaskBreakdown = input.taskLeaderboard.map((task) => ({
        taskId: task.taskId,
        label: task.title,
        assigned: task.assigned,
        started: task.started,
        completed: task.completed,
        failed: task.failed,
        reminders: 0,
        guideShown: 0,
        guideTaps: 0,
        mismatches: Math.max(0, task.started - task.assigned) + Math.max(0, task.completed - task.started),
    }));
    const topFailingTaskType = perTaskBreakdown.slice().sort((left, right) => right.failed - left.failed)[0];
    const topLeakingStage = orphanCompletedCount && orphanCompletedCount > 0
        ? "completed_without_start"
        : orphanStartedCount && orphanStartedCount > 0
            ? "started_without_assignment"
            : stuckAssignedCount && stuckAssignedCount > 0
                ? "assigned_not_started"
                : startedNotCompletedCount && startedNotCompletedCount > 0
                    ? "started_not_completed"
                    : null;
    const stuckAssignedBreakdown = {
        activeCurrentWindow: stuckAssignedCount,
        historicalUnstarted: null,
        expiredUnstarted: null,
        explanation: "This snapshot exposes assigned-not-started totals, but it does not separate current-window pending assignments from historical expirations.",
    };
    const pipelineDeltaExplanation = leaderboardPipelineDelta === null
        ? "Pipeline delta unavailable until lifecycle completion totals load."
        : `Pipeline delta is leaderboard completed total minus pipeline completed total (${leaderboardCompletedTotal.toLocaleString()} - ${(lifecycleValues.completed ?? 0).toLocaleString()}).`;
    const checksExplanations = [
        rewardMismatchCount > 0
            ? "Reward parity warnings remain; some leaderboard rows could not prove catalog reward reconciliation."
            : "No reward parity warnings in the sampled leaderboard rows.",
        guidanceTelemetryExplanation,
        pipelineDeltaExplanation,
    ];

    return {
        hasData: hasResponse && input.items.length > 0,
        items: input.items,
        peakCount: input.items.reduce((current, item) => Math.max(current, item.count), 0),
        selectedRange: input.selectedRange,
        generatedAtUtc,
        lastValidatedAtUtc: generatedAtUtc,
        snapshotState,
        pipelineMode,
        badgeLabel,
        truthState,
        canonicalTaskSource: hasLifecycle ? "task lifecycle logs" : "unavailable",
        telemetryTaskSource: hasGuidance ? "task guidance telemetry" : "unavailable",
        lifecycleLogSource: "analytics_task_lifecycle logs",
        userTaskStateSource: "not available in this analytics payload",
        assignedCount: lifecycleMetrics[0],
        startedCount: lifecycleMetrics[1],
        completedCount: lifecycleMetrics[2],
        failedCount: lifecycleMetrics[3],
        remindersCount: guidanceMetrics[0],
        guideShownCount: guidanceMetrics[1],
        guideTapCount: guidanceMetrics[2],
        lifecycleMetrics,
        guidanceMetrics,
        startRate: { value: rate(lifecycleValues.started, lifecycleValues.assigned), formula: "started / assigned", denominator: "assigned" },
        completionRate: { value: rate(lifecycleValues.completed, lifecycleValues.started), formula: "completed / started", denominator: "started" },
        failRate: { value: failureFromAssignedPct, formula: "failed / assigned", denominator: "assigned" },
        rates: {
            startFromAssignedPct: rate(lifecycleValues.started, lifecycleValues.assigned),
            completionFromStartedPct: rate(lifecycleValues.completed, lifecycleValues.started),
            completionFromAssignedPct,
            failureFromAssignedPct,
            failureAfterStartPct: null,
            expirationFromAssignedPct: null,
            explanations: ratesExplanations,
        },
        stuckAssignedCount,
        startedNotCompletedCount,
        orphanStartedCount,
        orphanCompletedCount,
        stuckAssignedBreakdown,
        guidanceTelemetryState,
        guidanceTelemetryExplanation,
        assignmentStateMissingCount: hasLifecycle ? null : fakeZeroPrevented ? null : 0,
        telemetryStateMismatchCount: (orphanStartedCount ?? 0) + (orphanCompletedCount ?? 0),
        stateTelemetryMissingCount: hasGuidance && !hasLifecycle ? (lifecycleValues.guideShown ?? 0) + (lifecycleValues.guideTap ?? 0) : null,
        topFailingTaskType: topFailingTaskType && topFailingTaskType.failed > 0 ? topFailingTaskType.label : null,
        topLeakingStage,
        perTaskBreakdown,
        taskLeaderboardConsolidated: true,
        standaloneTaskLeaderboardRemoved: true,
        leaderboardMode: "completions",
        taskCatalogSource: "built-in task catalog; custom catalog unavailable in analytics payload",
        taskLeaderboardRows,
        taskLeaderboardPageSize: 5,
        topCompletedTask,
        topRewardTask,
        topFailingTask: topFailingTask && (topFailingTask.failed ?? 0) > 0 ? topFailingTask.label : null,
        worstCompletionRateTask,
        largestAssignedNotStartedTask,
        rewardMismatchCount,
        lifecycleMismatchCount,
        timingPartialCount,
        leaderboardPipelineDelta,
        speedTimingDelta,
        completionSpeedConsolidated: true,
        standaloneTaskCompletionSpeedRemoved: true,
        speedSource: timedCompletionCount && timedCompletionCount > 0 ? "linked task lifecycle duration buckets" : "unavailable",
        totalCompletedCount,
        timedCompletionCount,
        timingCoveragePercent,
        avgCompletionSeconds,
        medianCompletionSeconds,
        speedBuckets,
        fastestBucket,
        slowestBucket,
        slowTaskCount,
        slowThresholdSeconds,
        missingStartTimestampCount,
        missingCompletionTimestampCount,
        durationRejectedCount,
        speedBucketReconciliationDelta,
        sourceReconciliation: {
            lifecycleLogCount: input.items.reduce((total, item) => total + Math.max(0, item.count), 0),
            userTaskStateCount: null,
            telemetryCompletionCount: lifecycleValues.completed,
            mismatchCount: (orphanStartedCount ?? 0) + (orphanCompletedCount ?? 0) + (durationRejectedCount ?? 0),
        },
        checks: {
            rewardChecks: rewardMismatchCount,
            lifecycleChecks: lifecycleMismatchCount,
            timingPartial: timingPartialCount,
            pipelineDelta: leaderboardPipelineDelta,
            pipelineDeltaExplanation,
            rewardChecksLabel: rewardMismatchCount > 0 ? "Reward parity warnings" : "Reward parity warnings",
            explanations: checksExplanations,
        },
        timingRecommendation: buildTimingRecommendation({
            timedCompletionCount,
            totalCompletedCount,
            fastestBucket,
            slowTaskCount,
            timingCoveragePercent,
        }),
        stale,
        cache,
        serverConfirmed: hasResponse && !input.error,
        fallback,
        estimated: false,
        fromCache: input.response?.cacheState ? input.response.cacheState !== "miss" : null,
        hasPendingWrites: null,
        fakeZeroPrevented,
        duplicateRefreshPrevented: Boolean(input.response?.cacheRevalidating && input.loading),
        recommendation: buildRecommendation({
            assigned: lifecycleValues.assigned,
            started: lifecycleValues.started,
            completed: lifecycleValues.completed,
            failed: lifecycleValues.failed,
            guideShown: lifecycleValues.guideShown,
            mode: pipelineMode,
        }),
        visibleCopy: pipelineMode === "mixed"
            ? "Showing mixed task lifecycle logs and guidance signals."
            : pipelineMode === "raw_event"
                ? "Showing task lifecycle event counts. User task state is not loaded here."
                : pipelineMode === "stale_snapshot"
                    ? "Showing a stale validated task pipeline snapshot."
                    : "Task pipeline is waiting for lifecycle signals.",
    };
}
