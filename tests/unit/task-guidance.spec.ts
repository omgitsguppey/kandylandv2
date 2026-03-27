import { describe, expect, it } from "vitest";
import { isTaskGuidanceActionType } from "@/lib/task-guidance";

describe("isTaskGuidanceActionType", () => {
    it("returns true for valid TaskGuidanceActionType values", () => {
        expect(isTaskGuidanceActionType("action:internal-link" as any)).toBe(true);
        expect(isTaskGuidanceActionType("action:external-link" as any)).toBe(true);
    });

    it("returns false for older actions or other invalid types", () => {
        expect(isTaskGuidanceActionType("open_notifications" as any)).toBe(false);
        expect(isTaskGuidanceActionType("open_wallet" as any)).toBe(false);
        expect(isTaskGuidanceActionType("enable_notifications" as any)).toBe(false);
        expect(isTaskGuidanceActionType("give_feedback" as any)).toBe(false);
        expect(isTaskGuidanceActionType("open_dashboard" as any)).toBe(false);
        expect(isTaskGuidanceActionType("open_drops" as any)).toBe(false);
        expect(isTaskGuidanceActionType("open_experiences" as any)).toBe(false);
        expect(isTaskGuidanceActionType("open_library" as any)).toBe(false);
        expect(isTaskGuidanceActionType("invalid_action" as any)).toBe(false);
        expect(isTaskGuidanceActionType("" as any)).toBe(false);
        expect(isTaskGuidanceActionType(null as any)).toBe(false);
        expect(isTaskGuidanceActionType(undefined as any)).toBe(false);
    });
});
