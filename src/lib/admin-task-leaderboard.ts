import type { AdminSurfaceState } from "@/lib/admin-parity";
import { BUILT_IN_DAILY_TASKS } from "@/lib/tasks/task-catalog";
import type { TaskLeaderboardItem } from "@/types/admin-analytics";

type TaskMetricSource = "lifecycle_log" | "task_guidance" | "mixed" | "unavailable";
type LeaderboardSourceMode = "lifecycle_log" | "mixed" | "stale_snapshot" | "unavailable";

export interface AdminTaskLeaderboardRow {
    rank: number;
    taskId: string;
    taskKey: string;
    label: string;
    assigned: number | null;
    assignedSource: TaskMetricSource;
    started: number | null;
    startedSource: TaskMetricSource;
    completed: number | null;
    completedSource: TaskMetricSource;
    failed: number | null;
    failedSource: TaskMetricSource;
    completionRate: number | null;
    completionRateFormula: "completed / assigned";
    rewardPerCompletion: number | null;
    rewardTotal: number | null;
    rewardFormula: "completed * catalog reward";
    rewardReconciliationDelta: number | null;
    rewardVerified: boolean;
    avgCompletionTime: number | null;
    timedCompletionCount: number | null;
    timingCoveragePercent: number | null;
    sourceMode: LeaderboardSourceMode;
    truthState: AdminSurfaceState;
    mismatches: string[];
    assignedNotStarted: number | null;
    rewardDisplay: string;
}

function rate(numerator: number | null, denominator: number | null) {
    if (numerator === null || denominator === null || denominator <= 0) return null;
    return numerator / denominator;
}

function normalizeTaskKey(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown_task";
}

const builtInTaskRewardById = new Map(BUILT_IN_DAILY_TASKS.map((task) => [task.id, task.reward]));
const builtInTaskRewardByTitle = new Map(BUILT_IN_DAILY_TASKS.map((task) => [task.title.toLowerCase(), task.reward]));

export function buildTaskLeaderboardRows(input: {
    tasks: TaskLeaderboardItem[];
    fakeZeroPrevented: boolean;
    stale: boolean;
    truthState: AdminSurfaceState;
}): AdminTaskLeaderboardRow[] {
    if (input.fakeZeroPrevented) return [];

    return input.tasks
        .slice()
        .sort((left, right) => right.completed - left.completed || right.failed - left.failed || right.assigned - left.assigned)
        .map((task, index) => {
            const catalogReward = builtInTaskRewardById.get(task.taskId) ?? builtInTaskRewardByTitle.get(task.title.toLowerCase()) ?? null;
            const rewardTotal = Number.isFinite(task.rewardTotal) ? task.rewardTotal : null;
            const expectedRewardTotal = catalogReward === null ? null : task.completed * catalogReward;
            const rewardReconciliationDelta = expectedRewardTotal === null || rewardTotal === null
                ? null
                : rewardTotal - expectedRewardTotal;
            const rewardVerified = rewardReconciliationDelta === 0;
            const timedCompletionCount = Number.isFinite(task.timedCompletionCount)
                ? Number(task.timedCompletionCount)
                : task.avgDurationMs > 0 && task.completed > 0
                    ? task.completed
                    : 0;
            const timingCoveragePercent = task.completed > 0 ? timedCompletionCount / task.completed : null;
            const mismatches = [
                task.started > task.assigned ? "started_exceeds_assigned" : null,
                task.completed > task.started ? "completed_exceeds_started" : null,
                task.failed > task.started ? "failed_exceeds_started" : null,
                catalogReward === null ? "catalog_reward_unavailable" : null,
                rewardReconciliationDelta !== null && rewardReconciliationDelta !== 0 ? "reward_total_mismatch" : null,
                task.completed > 0 && timedCompletionCount < task.completed ? "timing_partial" : null,
            ].filter((value): value is string => Boolean(value));

            return {
                rank: index + 1,
                taskId: task.taskId,
                taskKey: normalizeTaskKey(task.taskId || task.title),
                label: task.title,
                assigned: task.assigned,
                assignedSource: "lifecycle_log",
                started: task.started,
                startedSource: "lifecycle_log",
                completed: task.completed,
                completedSource: "lifecycle_log",
                failed: task.failed,
                failedSource: "lifecycle_log",
                completionRate: rate(task.completed, task.assigned),
                completionRateFormula: "completed / assigned",
                rewardPerCompletion: rewardVerified ? catalogReward : null,
                rewardTotal: rewardVerified ? rewardTotal : null,
                rewardFormula: "completed * catalog reward",
                rewardReconciliationDelta,
                rewardVerified,
                avgCompletionTime: task.avgDurationMs > 0 && timedCompletionCount > 0 ? Math.round(task.avgDurationMs / 1000) : null,
                timedCompletionCount,
                timingCoveragePercent,
                sourceMode: input.stale ? "stale_snapshot" : "lifecycle_log",
                truthState: input.truthState,
                mismatches,
                assignedNotStarted: Math.max(0, task.assigned - task.started),
                rewardDisplay: rewardVerified && rewardTotal !== null ? rewardTotal.toLocaleString() : "Unverified",
            };
        });
}
