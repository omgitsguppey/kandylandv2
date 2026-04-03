import { describe, expect, it } from "vitest";

import { BUILT_IN_DAILY_TASKS } from "@/lib/tasks/task-catalog";
import {
  buildDailyTaskInventory,
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
});
