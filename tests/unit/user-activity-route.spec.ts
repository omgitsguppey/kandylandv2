import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: null,
}));

vi.mock("@/lib/server/auth", () => ({
    handleApiError: vi.fn(),
}));

vi.mock("@/lib/server/request-guard", () => ({
    guardApiRequest: vi.fn(),
}));

vi.mock("@/lib/server/server-diagnostics", () => ({
    recordServerDiagnostic: vi.fn(),
}));

import { __test } from "@/app/api/user/activity/route";

describe("user activity route helpers", () => {
    it("normalizes Firestore-like task timestamps", () => {
        const taskEvent = __test.toTaskEvent({
            maxProgress: 5,
            progress: 1,
            reward: 15,
            timestamp: {
                toMillis: () => 1_710_000_000_000,
            },
            title: "Watch a drop",
            type: "started",
        }, "task_started");

        expect(taskEvent).toEqual({
            id: "task_started",
            maxProgress: 5,
            progress: 1,
            reward: 15,
            timestamp: 1_710_000_000_000,
            title: "Watch a drop",
            type: "started",
        });
    });

    it("keeps assigned, started, and reminder task events in the activity history", () => {
        const items = __test.buildActivityItems(
            { docs: [] },
            {
                docs: [
                    {
                        id: "assigned",
                        data: () => ({
                            progress: 0,
                            reward: 5,
                            timestamp: { toMillis: () => 1_710_000_000_100 },
                            title: "Open the app",
                            type: "assigned",
                        }),
                    },
                    {
                        id: "started",
                        data: () => ({
                            maxProgress: 3,
                            progress: 1,
                            reward: 10,
                            timestamp: { toMillis: () => 1_710_000_000_200 },
                            title: "Watch a creator clip",
                            type: "started",
                        }),
                    },
                    {
                        id: "reminder",
                        data: () => ({
                            progress: 0,
                            reward: 20,
                            timestamp: { toMillis: () => 1_710_000_000_300 },
                            title: "Claim your reward",
                            type: "reminder_sent",
                        }),
                    },
                ],
            },
        );

        expect(items.map((item) => item.id)).toEqual(["reminder", "started", "assigned"]);
        expect(items.map((item) => item.label)).toEqual([
            "Task reminder: Claim your reward",
            "Task in progress: Watch a creator clip",
            "Task ready: Open the app",
        ]);
    });
});
