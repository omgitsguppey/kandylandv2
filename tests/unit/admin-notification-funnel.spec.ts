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
            response: { success: true, cacheState: "fresh", generatedAtMs: Date.UTC(2026, 4, 6, 12, 0, 0) } as never,
        });

        expect(model.hasData).toBe(true);
        expect(model.truthLabel).toBe("PARTIAL");
        expect(model.denominatorMode).toBe("partial");
        expect(model.prompt.count).toBe(24);
        expect(model.permissionEnabled.count).toBe(0);
        expect(model.sent.count).toBeNull();
        expect(model.cleared.count).toBe(7);
        expect(model.prompt.status).toBe("loaded");
        expect(model.sent.status).toBe("unavailable");
        expect(model.sent.fakeZeroPrevented).toBe(true);
        expect(model.permissionEnabled.displayValue).toBe("0");
        expect(model.reminderReasonSummary).toContain("Total reminders 4");
        expect(model.debug.duplicateBrowserDisplayPreventedCount).toBeNull();
    });

    it("shows no permission sample instead of verified zero when permission telemetry is missing", () => {
        const model = buildAdminNotificationFunnelModel({
            funnelItems: [{ label: "Prompted", count: 10 }],
            actionItems: [],
            reminderReasons: [],
            response: { success: true, cacheState: "fresh", generatedAtMs: Date.UTC(2026, 4, 6, 12, 0, 0) } as never,
        });

        expect(model.permissionEnabled.count).toBeNull();
        expect(model.permissionEnabled.displayValue).toBe("No permission sample");
        expect(model.permissionEnabled.status).toBe("unavailable");
        expect(model.sent.displayValue).toBe("Unavailable");
        expect(model.duplicatePrevented.displayValue).toBe("Unavailable");
        expect(model.failedSkipped.displayValue).toBe("Unavailable");
    });

    it("treats refresh-due verified cache as recent partial evidence", () => {
        const model = buildAdminNotificationFunnelModel({
            funnelItems: [{ label: "Prompted", count: 10 }],
            actionItems: [],
            reminderReasons: [],
            response: {
                success: true,
                cacheState: "refresh_due",
                staleButVerified: true,
                cacheRevalidating: true,
                generatedAtMs: Date.UTC(2026, 4, 6, 12, 0, 0),
            } as never,
        });

        expect(model.state).toBe("partial");
        expect(model.truthLabel).toBe("PARTIAL");
        expect(model.prompt.freshnessState).toBe("recent");
        expect(model.prompt.truthState).toBe("live");
        expect(model.debug.stale).toBe(false);
        expect(model.debug.fallback).toBe(true);
    });
});
