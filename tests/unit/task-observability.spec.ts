import { describe, expect, it } from "vitest";

import { BUILT_IN_DAILY_TASKS } from "@/lib/tasks/task-catalog";
import {
  buildDailyTaskInventory,
  buildDailyTaskRuntimeAudit,
  CANONICAL_TASK_EVENT_NAMES,
  summarizeDailyTaskInventory,
} from "@/lib/tasks/task-observability";

describe("daily task observability inventory", () => {
  it("covers every built-in task with guidance, routing, and tracking metadata", () => {
    const inventory = buildDailyTaskInventory();

    expect(inventory).toHaveLength(BUILT_IN_DAILY_TASKS.length);
    expect(inventory.every((entry) => entry.taskId.length > 0)).toBe(true);
    expect(inventory.every((entry) => entry.actionLabel.length > 0)).toBe(true);
    expect(inventory.every((entry) => entry.instruction.length > 0)).toBe(true);
    expect(inventory.every((entry) => entry.destinationHref.startsWith("/"))).toBe(true);
    expect(inventory.every((entry) => entry.trackingSource !== "unsupported")).toBe(true);
  });

  it("summarizes the task inventory without dropping any tasks", () => {
    const inventory = buildDailyTaskInventory();
    const summary = summarizeDailyTaskInventory(inventory);
    const canonicalCount = inventory.filter((entry) => CANONICAL_TASK_EVENT_NAMES.has(entry.eventName)).length;
    const runtimeCount = inventory.filter((entry) => entry.actionMode === "runtime").length;
    const uniqueCount = inventory.filter((entry) => entry.hasUniqueKey).length;

    expect(summary.total).toBe(inventory.length);
    expect(summary.byTrackingSource.canonical).toBe(canonicalCount);
    expect(summary.byTrackingSource.telemetry).toBe(inventory.length - canonicalCount);
    expect(summary.byTrackingSource.unsupported).toBe(0);
    expect(summary.runtimeActions).toBe(runtimeCount);
    expect(summary.navigationActions).toBe(inventory.length - runtimeCount);
    expect(summary.uniqueByParamTasks).toBe(uniqueCount);
  });

  it("builds a runtime task audit across built-in, custom, and drifted task records", () => {
    const customTask = {
      id: "custom_feedback",
      source: "global" as const,
      title: "Custom feedback",
      subtitle: "Leave one custom feedback note.",
      reward: 180,
      rewardTier: "medium" as const,
      minRewardGd: 50,
      maxRewardGd: 300,
      rewardSource: "daily_task" as const,
      payoutPolicy: "on_completion_only" as const,
      repeatPolicy: "once_per_daily_window" as const,
      economyRisk: "low" as const,
      maxProgress: 1,
      eventName: "feedback_submitted",
      actionType: "give_feedback" as const,
      ctaLabel: "Share feedback",
      icon: "message" as const,
      group: "feedback" as const,
      cooldownDays: 7,
      customTaskId: "custom_feedback",
      active: true,
    };

    const report = buildDailyTaskRuntimeAudit({
      definitions: [
        BUILT_IN_DAILY_TASKS.find((task) => task.id === "open_dashboard")!,
        customTask,
      ],
      userStates: [
        {
          uid: "user_1",
          username: "user-one",
          tasks: [
            { id: "open_dashboard", title: "Open your dashboard", progress: 0, maxProgress: 1, claimed: false, assignedAt: 1000, claimedAt: 0 },
            { id: "custom_feedback", title: "Custom feedback", progress: 1, maxProgress: 1, claimed: true, assignedAt: 2000, claimedAt: 3000 },
          ],
          completedTaskHistory: { custom_feedback: 3000 },
          retiredTaskIds: [],
          hasInvalidRefreshMetadata: false,
        },
        {
          uid: "user_2",
          username: "user-two",
          tasks: [
            { id: "custom_feedback", title: "Custom feedback", progress: 0, maxProgress: 1, claimed: false, assignedAt: 3500, claimedAt: 0 },
          ],
          completedTaskHistory: { custom_feedback: 3000 },
          retiredTaskIds: [],
          hasInvalidRefreshMetadata: true,
        },
        {
          uid: "user_3",
          username: "user-three",
          tasks: [
            { id: "unknown_task", title: "Unknown task", progress: 0, maxProgress: 1, claimed: false, assignedAt: 5000, claimedAt: 0 },
          ],
          completedTaskHistory: {},
          retiredTaskIds: [],
          hasInvalidRefreshMetadata: false,
        },
      ],
      taskEvents: [
        {
          taskId: "custom_feedback",
          title: "Custom feedback",
          type: "assigned",
          triggerEvent: "feedback_submitted",
          userId: "user_1",
          username: "user-one",
          reward: 0,
          timestamp: 2000,
        },
        {
          taskId: "custom_feedback",
          title: "Custom feedback",
          type: "completed",
          triggerEvent: "feedback_submitted",
          userId: "user_1",
          username: "user-one",
          reward: 180,
          timestamp: 3000,
        },
        {
          taskId: "open_dashboard",
          title: "Open your dashboard",
          type: "started",
          triggerEvent: "dashboard_viewed",
          userId: "user_1",
          username: "user-one",
          reward: 0,
          timestamp: 1500,
        },
      ],
      receipts: [
        { eventName: "feedback_submitted", uid: "user_1", timestamp: 3000, source: "telemetry" },
        { eventName: "unknown_event", uid: "user_3", timestamp: 3600, source: "telemetry" },
      ],
      rewardClaims: [
        { taskId: "custom_feedback", title: "Custom feedback", timestamp: 3050, reward: 180 },
      ],
      eventStats: [
        { eventName: "feedback_submitted", totalCount: 5, lastSeenAt: 4000 },
        { eventName: "dashboard_viewed", totalCount: 7, lastSeenAt: 4500 },
      ],
      taskRollups: [
        { taskId: "custom_feedback", title: "Custom feedback", eventCount: 2, rewardTotal: 180, completed: 1, started: 0, failed: 0, reminders: 0, lastEventAt: 3000 },
      ],
    });

    expect(report.summary.totalAssignments).toBe(4);
    expect(report.summary.builtInAssignments).toBe(1);
    expect(report.summary.customAssignments).toBe(2);
    expect(report.summary.missingDefinitionAssignments).toBe(1);
    expect(report.summary.usersWithAssignedTasks).toBe(3);
    expect(report.summary.usersWithRefreshIssues).toBe(1);

    const customEntry = report.customDistribution.find((entry) => entry.taskId === "custom_feedback");
    expect(customEntry).toBeTruthy();
    expect(customEntry?.assignedUsers).toBe(2);
    expect(customEntry?.claimedAssignments).toBe(1);
    expect(customEntry?.recentCompletedCount).toBe(1);
    expect(customEntry?.recentRewardClaimCount).toBe(1);
    expect(customEntry?.recentReceiptCount).toBe(1);
    expect(customEntry?.cooldownConflictUsers).toBe(1);
    expect(customEntry?.usersWithRefreshIssues).toBe(1);
    expect(customEntry?.driftReasons).toContain("cooldown_reassignment_detected");

    const feedbackAlignment = report.telemetryAlignment.find((entry) => entry.eventName === "feedback_submitted");
    expect(feedbackAlignment?.mappedTaskCount).toBe(1);
    expect(feedbackAlignment?.customTaskCount).toBe(1);
    expect(feedbackAlignment?.recentReceiptCount).toBe(1);
    expect(feedbackAlignment?.eventStatTotalCount).toBe(5);

    expect(report.unsupportedRuntimeRecords.some((entry) => entry.kind === "assignment" && entry.taskId === "unknown_task")).toBe(true);
    expect(report.unsupportedRuntimeRecords.some((entry) => entry.kind === "receipt" && entry.eventName === "unknown_event")).toBe(true);
  });

  it("marks shared event mappings as ambiguous instead of over-attributing receipts", () => {
    const unwrapOne = BUILT_IN_DAILY_TASKS.find((task) => task.id === "unwrap_one_drop")!;
    const unwrapTwo = BUILT_IN_DAILY_TASKS.find((task) => task.id === "unwrap_two_drops")!;

    const report = buildDailyTaskRuntimeAudit({
      definitions: [unwrapOne, unwrapTwo],
      userStates: [
        {
          uid: "user_1",
          username: "user-one",
          tasks: [
            { id: unwrapOne.id, title: unwrapOne.title, progress: 0, maxProgress: unwrapOne.maxProgress, claimed: false, assignedAt: 1000, claimedAt: 0 },
            { id: unwrapTwo.id, title: unwrapTwo.title, progress: 1, maxProgress: unwrapTwo.maxProgress, claimed: false, assignedAt: 1000, claimedAt: 0 },
          ],
          completedTaskHistory: {},
          retiredTaskIds: [],
          hasInvalidRefreshMetadata: false,
        },
      ],
      taskEvents: [],
      receipts: [
        { eventName: "unlock_drop_success", uid: "user_1", timestamp: 2000, source: "canonical" },
      ],
      eventStats: [
        { eventName: "unlock_drop_success", totalCount: 8, lastSeenAt: 2500 },
      ],
    });

    const ambiguous = report.ambiguousEventMappings.find((entry) => entry.eventName === "unlock_drop_success");
    expect(ambiguous).toBeTruthy();
    expect(ambiguous?.mappedTaskCount).toBe(2);
    expect(ambiguous?.recentReceiptCount).toBe(1);

    const unlockAlignment = report.telemetryAlignment.find((entry) => entry.eventName === "unlock_drop_success");
    expect(unlockAlignment?.driftReasons).toContain("receipt_counts_shared_across_multiple_tasks");

    expect(report.distribution.find((entry) => entry.taskId === unwrapOne.id)?.recentReceiptCount).toBe(0);
    expect(report.distribution.find((entry) => entry.taskId === unwrapTwo.id)?.recentReceiptCount).toBe(0);
  });

  it("does not mark generic daily-task lifecycle events as orphaned task mappings", () => {
    const report = buildDailyTaskRuntimeAudit({
      definitions: [BUILT_IN_DAILY_TASKS.find((task) => task.id === "open_dashboard")!],
      userStates: [],
      taskEvents: [],
      receipts: [],
      eventStats: [
        { eventName: "daily_task_assigned", totalCount: 12, lastSeenAt: 5000 },
        { eventName: "task_completed", totalCount: 8, lastSeenAt: 6000 },
      ],
    });

    const assignedAlignment = report.telemetryAlignment.find((entry) => entry.eventName === "daily_task_assigned");
    const completedAlignment = report.telemetryAlignment.find((entry) => entry.eventName === "task_completed");

    expect(assignedAlignment?.mappedTaskCount).toBe(0);
    expect(assignedAlignment?.driftReasons).not.toContain("tracked_without_task_mapping");
    expect(completedAlignment?.mappedTaskCount).toBe(0);
    expect(completedAlignment?.driftReasons).not.toContain("tracked_without_task_mapping");
  });
});
