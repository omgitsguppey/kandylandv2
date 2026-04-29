import { describe, expect, it } from "vitest";

import {
    buildAdminDebugOpenActionsCard,
    buildAdminDebugRouteHealthCard,
    type AdminDebugRouteRuntimeSummary,
} from "@/lib/admin-debug-summary-cards";

const EMPTY_SUMMARY: AdminDebugRouteRuntimeSummary = {
    total: 0,
    healthy: 0,
    warn: 0,
    fail: 0,
    stale: 0,
    unobserved: 0,
    slow: 0,
    serverErrors: 0,
    clientErrors: 0,
};

describe("admin debug summary cards", () => {
    it("uses the API snapshot as an explicit partial source while the route listener hydrates", () => {
        const card = buildAdminDebugRouteHealthCard({
            summary: {
                total: 4,
                healthy: 3,
                warn: 1,
                fail: 0,
                stale: 0,
                unobserved: 1,
                slow: 2,
                serverErrors: 0,
                clientErrors: 1,
            },
            observedCount: 3,
            hasRealtimeRows: false,
            hasSnapshotRows: true,
            listenerState: { routeHealthLoaded: false, routeHealthFailed: false },
            isLoading: false,
            hasError: false,
        });

        expect(card.value).toBe("3 ok / 1 action / 0 fail");
        expect(card.meta).toContain("[partial] API snapshot; route listener hydrating");
        expect(card.meta).toContain("4 tracked, 3 observed, 1 unseen");
        expect(card.truthState).toBe("degraded");
    });

    it("fails route health when both the listener and snapshot are unavailable", () => {
        const card = buildAdminDebugRouteHealthCard({
            summary: EMPTY_SUMMARY,
            observedCount: 0,
            hasRealtimeRows: false,
            hasSnapshotRows: false,
            listenerState: { routeHealthLoaded: false, routeHealthFailed: true },
            isLoading: false,
            hasError: false,
        });

        expect(card.value).toBe("0 tracked");
        expect(card.meta).toBe("[failed] route listener and API snapshot empty");
        expect(card.truthState).toBe("failed");
    });

    it("builds actionable open-action buckets with source detail", () => {
        const card = buildAdminDebugOpenActionsCard({
            proposalCount: 1,
            panelWarnCount: 7,
            panelFailCount: 2,
            routeWarnCount: 0,
            routeFailCount: 0,
            routeStaleCount: 0,
            queueStaleCount: 1,
            queueFailedCount: 0,
            missingNotificationOutcomes: 1,
            isLoading: false,
            hasError: false,
        });

        expect(card.count).toBe(12);
        expect(card.meta).toContain("1 repair proposal (1 actionable proposal)");
        expect(card.meta).toContain("9 panel logs (2 fail, 7 warn)");
        expect(card.meta).not.toContain("0 route");
        expect(card.meta).toContain("2 queue runtime (0 failed jobs, 1 stale jobs, 1 missing outcomes)");
        expect(card.truthState).toBe("failed");
    });
});
