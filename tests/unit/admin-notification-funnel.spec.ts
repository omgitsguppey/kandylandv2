import { describe, expect, it } from "vitest";

import { buildAdminNotificationFunnelModel } from "@/lib/admin-notification-funnel";

describe("admin notification funnel model", () => {
    it("filters zero-count funnel items and preserves action scaling inputs", () => {
        const model = buildAdminNotificationFunnelModel({
            funnelItems: [
                { label: "Prompted", count: 24 },
                { label: "Enabled", count: 0 },
                { label: "Opened", count: 11 },
            ],
            actionItems: [
                { label: "Opens", value: 30 },
                { label: "Reads", value: 12 },
            ],
            reminderReasons: [
                { label: "Time ran out", count: 4 },
            ],
        });

        expect(model.hasData).toBe(true);
        expect(model.activeFunnelItems).toEqual([
            { label: "Prompted", count: 24 },
            { label: "Opened", count: 11 },
        ]);
        expect(model.pieData).toEqual([
            { name: "Prompted", value: 24 },
            { name: "Opened", value: 11 },
        ]);
        expect(model.maxActionValue).toBe(30);
        expect(model.reminderReasonCount).toBe(1);
    });
});
