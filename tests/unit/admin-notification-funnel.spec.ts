import { describe, expect, it } from "vitest";

import { buildAdminNotificationFunnelModel } from "@/lib/admin-notification-funnel";

describe("admin notification funnel model", () => {
    it("normalizes compact funnel metrics without fake delivery zeros", () => {
        const model = buildAdminNotificationFunnelModel({
            funnelItems: [
                { label: "Prompted", count: 24 },
                { label: "Enabled", count: 0 },
                { label: "Opened", count: 11 },
            ],
            actionItems: [
                { label: "Opens", value: 30 },
                { label: "Reads", value: 12 },
                { label: "Notifications marked read", value: 7 },
            ],
            reminderReasons: [
                { label: "Time ran out", count: 4 },
            ],
        });

        expect(model.hasData).toBe(true);
        expect(model.truthLabel).toBe("PARTIAL");
        expect(model.metrics.find((metric) => metric.key === "prompted")?.value).toBe(24);
        expect(model.metrics.find((metric) => metric.key === "enabled")?.value).toBe(0);
        expect(model.metrics.find((metric) => metric.key === "sent")?.value).toBeNull();
        expect(model.metrics.find((metric) => metric.key === "cleared")?.value).toBe(7);
        expect(model.metrics.find((metric) => metric.key === "sent")?.fakeZeroPrevented).toBe(true);
        expect(model.reminderReasonSummary).toContain("Time ran out: 4");
        expect(model.debug.duplicateBrowserDisplayPreventedCount).toBeNull();
    });
});
