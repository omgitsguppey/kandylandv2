import { describe, expect, it, vi, beforeEach } from "vitest";
import { readTaskGuidancePendingAction, TASK_GUIDANCE_ACTION_STORAGE_KEY } from "@/lib/task-guidance";

describe("readTaskGuidancePendingAction", () => {
    beforeEach(() => {
        vi.stubGlobal("window", {
            localStorage: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
        });
        vi.stubGlobal("document", {});
    });

    it("returns null when localStorage.getItem throws an error", () => {
        vi.mocked(window.localStorage.getItem).mockImplementation(() => {
            throw new Error("SecurityError: The operation is insecure.");
        });

        const action = readTaskGuidancePendingAction();
        expect(action).toBeNull();
    });

    it("returns correctly parsed and normalized action from localStorage", () => {
        const storedValue = JSON.stringify({
            taskId: "task-123",
            actionType: "open_notifications",
            destinationHref: "/notifications",
            assignedAt: 123456789,
            createdAt: 987654321,
        });
        vi.mocked(window.localStorage.getItem).mockReturnValue(storedValue);

        const action = readTaskGuidancePendingAction();
        expect(action).toEqual({
            taskId: "task-123",
            actionType: "open_notifications",
            destinationHref: "/notifications",
            assignedAt: 123456789,
            createdAt: 987654321,
        });
    });

    it("returns null when localStorage returns null", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);

        const action = readTaskGuidancePendingAction();
        expect(action).toBeNull();
    });

    it("returns null when JSON.parse fails", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue("invalid-json");

        const action = readTaskGuidancePendingAction();
        expect(action).toBeNull();
    });

    it("uses the correct localStorage key", () => {
        vi.mocked(window.localStorage.getItem).mockReturnValue(null);
        readTaskGuidancePendingAction();
        expect(window.localStorage.getItem).toHaveBeenCalledWith(TASK_GUIDANCE_ACTION_STORAGE_KEY);
    });
});
