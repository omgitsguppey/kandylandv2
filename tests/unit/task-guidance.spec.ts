import { describe, it, expect } from "vitest";
import { isTaskGuidanceActionType } from "@/lib/task-guidance";

describe("isTaskGuidanceActionType", () => {
  it("should return true for valid task guidance action types", () => {
    expect(isTaskGuidanceActionType("open_dashboard")).toBe(true);
    expect(isTaskGuidanceActionType("open_drops")).toBe(true);
  });

  it("should return false for invalid action types", () => {
    // Asserting generic invalid string inputs that are not TaskGuidanceActionType
    expect(isTaskGuidanceActionType("invalid_action" as any)).toBe(false);
    expect(isTaskGuidanceActionType("" as any)).toBe(false);
    expect(isTaskGuidanceActionType("invalid_action" as any)).toBe(false);

  });

  it("should return false for null or undefined", () => {
    expect(isTaskGuidanceActionType(null as any)).toBe(false);
    expect(isTaskGuidanceActionType(undefined as any)).toBe(false);
  });
});
