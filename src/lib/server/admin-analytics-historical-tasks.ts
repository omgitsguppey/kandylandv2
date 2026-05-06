import "server-only";

import {
  buildDurationBuckets,
  formatTaskReason,
  TaskLifecycleLog,
} from "./admin-analytics-shared";

export interface HistoricalTaskAnalytics {
  taskGuidance: {
    viewed: number;
    dismissed: number;
    tapped: number;
    completed: number;
  };
  taskPipeline: Array<{ label: string; count: number }>;
  taskLeaderboard: Array<{
    taskId: string;
    title: string;
    assigned: number;
    started: number;
    completed: number;
    failed: number;
    rewardTotal: number;
    avgDurationMs: number;
    timedCompletionCount: number;
    completionRate: number;
  }>;
  taskDurationBuckets: Array<{ label: string; count: number }>;
  reminderReasons: Array<{ label: string; count: number }>;
}

export function buildHistoricalTaskAnalytics(input: {
  eventsData: Record<string, number>;
  normalizedTaskEvents: TaskLifecycleLog[];
}): HistoricalTaskAnalytics {
  const countTaskGuidanceEvents = (...eventNames: string[]) => (
    eventNames.reduce((total, eventName) => total + (input.eventsData[eventName] || 0), 0)
  );

  const taskGuidance = {
    viewed: countTaskGuidanceEvents("task_guidance_viewed", "task_guidance_banner_viewed", "task_help_opened", "task_card_expanded"),
    dismissed: countTaskGuidanceEvents("task_guidance_dismissed", "task_guidance_banner_dismissed"),
    tapped: countTaskGuidanceEvents("task_guidance_tapped", "task_guidance_cta_clicked"),
    completed: countTaskGuidanceEvents("task_guidance_completed"),
  };

  const taskPipeline = [
    { label: "Assigned", count: input.normalizedTaskEvents.filter((event) => event.type === "assigned").length },
    { label: "Guides shown", count: taskGuidance.viewed },
    { label: "Guide taps", count: taskGuidance.tapped },
    { label: "Started", count: input.normalizedTaskEvents.filter((event) => event.type === "started").length },
    { label: "Completed", count: input.normalizedTaskEvents.filter((event) => event.type === "completed").length },
    { label: "Guide wins", count: taskGuidance.completed },
    { label: "Failed", count: input.normalizedTaskEvents.filter((event) => event.type === "failed").length },
    { label: "Reminders", count: input.normalizedTaskEvents.filter((event) => event.type === "reminder_sent").length },
  ];

  const taskPerformanceMap = new Map<string, {
    taskId: string;
    title: string;
    assigned: number;
    started: number;
    completed: number;
    failed: number;
    rewardTotal: number;
    completionDurations: number[];
  }>();

  input.normalizedTaskEvents.forEach((event) => {
    const key = event.taskId || event.title;
    const current = taskPerformanceMap.get(key) || {
      taskId: event.taskId || key,
      title: event.title || key,
      assigned: 0,
      started: 0,
      completed: 0,
      failed: 0,
      rewardTotal: 0,
      completionDurations: [],
    };

    if (event.type === "assigned") current.assigned += 1;
    if (event.type === "started") current.started += 1;
    if (event.type === "completed") {
      current.completed += 1;
      current.rewardTotal += event.reward;
      if (event.durationMs && event.durationMs > 0) {
        current.completionDurations.push(event.durationMs);
      }
    }
    if (event.type === "failed") current.failed += 1;

    taskPerformanceMap.set(key, current);
  });

  const taskLeaderboard = Array.from(taskPerformanceMap.values())
    .map((entry) => ({
      taskId: entry.taskId,
      title: entry.title,
      assigned: entry.assigned,
      started: entry.started,
      completed: entry.completed,
      failed: entry.failed,
      rewardTotal: entry.rewardTotal,
      avgDurationMs: entry.completionDurations.length > 0
        ? Math.round(entry.completionDurations.reduce((sum, value) => sum + value, 0) / entry.completionDurations.length)
        : 0,
      timedCompletionCount: entry.completionDurations.length,
      completionRate: entry.assigned > 0 ? entry.completed / entry.assigned : 0,
    }))
    .sort((left, right) => right.completed - left.completed || right.rewardTotal - left.rewardTotal)
    .slice(0, 10);

  const taskDurationBuckets = buildDurationBuckets(
    input.normalizedTaskEvents
      .filter((event) => event.type === "completed" && (event.durationMs || 0) > 0)
      .map((event) => event.durationMs || 0),
    [
      { label: "<1m", max: 60_000 },
      { label: "1-5m", max: 300_000 },
      { label: "5-15m", max: 900_000 },
      { label: "15-60m", max: 3_600_000 },
      { label: "60m+", max: Number.POSITIVE_INFINITY },
    ],
  );

  const reminderReasonMap = new Map<string, number>();
  input.normalizedTaskEvents
    .filter((event) => event.type === "reminder_sent")
    .forEach((event) => {
      const label = formatTaskReason(event.reason || "");
      reminderReasonMap.set(label, (reminderReasonMap.get(label) || 0) + 1);
    });

  return {
    taskGuidance,
    taskPipeline,
    taskLeaderboard,
    taskDurationBuckets,
    reminderReasons: Array.from(reminderReasonMap.entries()).map(([label, count]) => ({ label, count })),
  };
}
