import { describe, expect, it } from "vitest";

import { normalizeNotificationDoc } from "@/lib/notification-contracts";

describe("notification-contracts", () => {
    it("normalizes timestamp-like server values into createdAt and createdAtMs", () => {
        const createdAtMs = Date.UTC(2026, 3, 9, 12, 30, 0);
        const timestampLike = {
            toDate: () => new Date(createdAtMs),
            toMillis: () => createdAtMs,
        };

        const normalized = normalizeNotificationDoc("note_1", {
            title: "Drop ready",
            message: "Your drop is live.",
            type: "success",
            createdAt: timestampLike,
            readBy: [],
            target: {
                global: true,
                userIds: [],
            },
        });

        expect(normalized?.createdAt?.toMillis()).toBe(createdAtMs);
        expect(normalized?.createdAtMs).toBe(createdAtMs);
    });

    it("falls back to createdAtMs when createdAt is missing", () => {
        const createdAtMs = Date.UTC(2026, 3, 9, 15, 45, 0);

        const normalized = normalizeNotificationDoc("note_2", {
            title: "Reminder",
            message: "Tap to return.",
            type: "info",
            createdAtMs,
            readBy: [],
            target: {
                global: false,
                userIds: ["user_1"],
            },
        });

        expect(normalized?.createdAt?.toDate().toISOString()).toBe(new Date(createdAtMs).toISOString());
        expect(normalized?.createdAtMs).toBe(createdAtMs);
    });
});
