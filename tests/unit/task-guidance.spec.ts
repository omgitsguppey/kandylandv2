import { describe, it, expect } from "vitest";
import { isTaskGuidanceActionType, type TaskGuidanceActionType } from "@/lib/task-guidance";
import type { DailyTaskAssignment } from "@/lib/tasks/task-catalog";

describe("isTaskGuidanceActionType", () => {
  it("should return true for valid task guidance action types", () => {
    expect(isTaskGuidanceActionType("action:internal-link")).toBe(true);
    expect(isTaskGuidanceActionType("action:external-link")).toBe(true);
  });

  it("should return false for invalid action types", () => {
    // Asserting generic invalid string inputs that are not TaskGuidanceActionType
    expect(isTaskGuidanceActionType("invalid_action" as any)).toBe(false);
    expect(isTaskGuidanceActionType("" as any)).toBe(false);
    expect(isTaskGuidanceActionType("open_dashboard" as any)).toBe(false);
    expect(isTaskGuidanceActionType("open_drops" as any)).toBe(false);
  });

  it("should return false for null or undefined", () => {
    expect(isTaskGuidanceActionType(null as any)).toBe(false);
    expect(isTaskGuidanceActionType(undefined as any)).toBe(false);
  });
});
