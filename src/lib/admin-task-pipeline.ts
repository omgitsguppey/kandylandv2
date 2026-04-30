import type { AdminSurfaceState } from "@/lib/admin-parity";
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
    failRate: { value: number | null; formula: "failed / started"; denominator: "started" };
    stuckAssignedCount: number | null;
    startedNotCompletedCount: number | null;
    orphanStartedCount: number | null;
    orphanCompletedCount: number | null;
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
    const truthState: AdminSurfaceState = !hasResponse
        ? input.loading ? "loading" : "unavailable"
        : stale
            ? "stale"
            : input.overviewTruthState ?? "live";
    const lifecycleValues = {
        assigned: fakeZeroPrevented ? null : findCount(input.items, "Assigned"),
        started: fakeZeroPrevented ? null : findCount(input.items, "Started"),
        completed: fakeZeroPrevented ? null : findCount(input.items, "Completed"),
        failed: fakeZeroPrevented ? null : findCount(input.items, "Failed"),
        reminded: fakeZeroPrevented ? null : findCount(input.items, "Reminders"),
        guideShown: fakeZeroPrevented ? null : findCount(input.items, "Guides shown"),
        guideTap: fakeZeroPrevented ? null : findCount(input.items, "Guide taps"),
    };
    const hasLifecycle = [lifecycleValues.assigned, lifecycleValues.started, lifecycleValues.completed, lifecycleValues.failed]
        .some((value) => (value ?? 0) > 0);
    const hasGuidance = [lifecycleValues.guideShown, lifecycleValues.guideTap, lifecycleValues.reminded]
        .some((value) => (value ?? 0) > 0);
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

    return {
        hasData: input.items.some((item) => item.count > 0),
        items: input.items,
        peakCount: input.items.reduce((current, item) => Math.max(current, item.count), 0),
        selectedRange: input.selectedRange,
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
        failRate: { value: rate(lifecycleValues.failed, lifecycleValues.started), formula: "failed / started", denominator: "started" },
        stuckAssignedCount,
        startedNotCompletedCount,
        orphanStartedCount,
        orphanCompletedCount,
        assignmentStateMissingCount: hasLifecycle ? null : fakeZeroPrevented ? null : 0,
        telemetryStateMismatchCount: (orphanStartedCount ?? 0) + (orphanCompletedCount ?? 0),
        stateTelemetryMissingCount: hasGuidance && !hasLifecycle ? (lifecycleValues.guideShown ?? 0) + (lifecycleValues.guideTap ?? 0) : null,
        topFailingTaskType: topFailingTaskType && topFailingTaskType.failed > 0 ? topFailingTaskType.label : null,
        topLeakingStage,
        perTaskBreakdown,
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
