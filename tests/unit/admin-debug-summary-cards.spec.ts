import { describe, expect, it } from "vitest";

import {
    buildAdminDebugAiAssistantCard,
    buildAdminDebugOpenActionsCard,
    buildAdminDebugRouteHealthCard,
    buildAdminDebugSystemHealthNowModel,
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

        expect(card.value).toBe("3 ok / 0 action / 0 fail");
        expect(card.meta).toContain("[partial] API snapshot; route listener hydrating");
        expect(card.meta).toContain("4 tracked, 3 observed, 1 unseen");
        expect(card.truthState).toBe("degraded");
    });

    it("labels merged API and listener route health as live source coverage", () => {
        const card = buildAdminDebugRouteHealthCard({
            summary: {
                total: 158,
                healthy: 38,
                warn: 120,
                fail: 0,
                stale: 0,
                unobserved: 120,
                slow: 0,
                serverErrors: 0,
                clientErrors: 0,
            },
            observedCount: 38,
            hasRealtimeRows: true,
            hasSnapshotRows: true,
            listenerState: { routeHealthLoaded: true, routeHealthFailed: false },
            isLoading: false,
            hasError: false,
        });

        expect(card.meta).toContain("[live] API snapshot + route listener");
        expect(card.meta).toContain("158 tracked, 38 observed, 120 unseen");
        expect(card.truthState).toBe("live");
    });

    it("does not call the complete API route registry a fallback when the listener fails", () => {
        const card = buildAdminDebugRouteHealthCard({
            summary: {
                total: 158,
                healthy: 32,
                warn: 125,
                fail: 1,
                stale: 0,
                unobserved: 120,
                slow: 3,
                serverErrors: 1,
                clientErrors: 2,
            },
            observedCount: 38,
            hasRealtimeRows: false,
            hasSnapshotRows: true,
            listenerState: { routeHealthLoaded: false, routeHealthFailed: true },
            isLoading: false,
            hasError: false,
        });

        expect(card.value).toBe("32 ok / 6 action / 1 fail");
        expect(card.meta).toContain("[degraded] API snapshot; route listener failed");
        expect(card.meta).not.toContain("[fallback]");
        expect(card.truthState).toBe("failed");
    });

    it("keeps unseen route coverage out of the actionable route count", () => {
        const card = buildAdminDebugRouteHealthCard({
            summary: {
                total: 158,
                healthy: 5,
                warn: 153,
                fail: 0,
                stale: 0,
                unobserved: 149,
                slow: 10,
                serverErrors: 0,
                clientErrors: 0,
            },
            observedCount: 9,
            hasRealtimeRows: false,
            hasSnapshotRows: true,
            listenerState: { routeHealthLoaded: false, routeHealthFailed: true },
            isLoading: false,
            hasError: false,
        });

        expect(card.value).toBe("5 ok / 4 action / 0 fail");
        expect(card.meta).toContain("158 tracked, 9 observed, 149 unseen");
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

    it("labels AI assistant fallback output as fallback when preflight observers fail but runtime is ready", () => {
        const card = buildAdminDebugAiAssistantCard({
            hasSummary: true,
            hasError: false,
            enabled: true,
            runtimeReady: true,
            fallbackUsed: true,
            configuredModel: "gemini-3.1-flash-lite-preview",
            feedStatus: "failed",
            latencyMs: 97,
        });

        expect(card.value).toBe("Fallback");
        expect(card.meta).toContain("preflight observers failed");
        expect(card.meta).toContain("runtime ready");
        expect(card.meta).toContain("deterministic fallback output");
        expect(card.truthState).toBe("fallback");
    });

    it("labels AI assistant fallback output as fallback when preflight is connected", () => {
        const card = buildAdminDebugAiAssistantCard({
            hasSummary: true,
            hasError: false,
            enabled: true,
            runtimeReady: true,
            fallbackUsed: true,
            configuredModel: "gemini-3.1-flash-lite-preview",
            feedStatus: "realtime",
            latencyMs: 97,
        });

        expect(card.value).toBe("Fallback");
        expect(card.meta).toContain("realtime preflight lane");
        expect(card.truthState).toBe("fallback");
    });

    it("does not call the route pipeline clear when active diagnostics are degraded", () => {
        const model = buildAdminDebugSystemHealthNowModel({
            activePipelineFailureCount: 0,
            recentPipelineFailureCount: 0,
            sampledPipelineFailureCount: 0,
            activePipelineWindowMs: 60 * 60 * 1000,
            activeDiagnosticCount: 116,
            recentDiagnosticCount: 120,
            sampledDiagnosticCount: 120,
            activeIssueClusterCount: 5,
            routeFailureCount: 0,
            writerSampleCount: 9,
            writerWarnCount: 0,
            writerFailCount: 0,
            runtimeWarningCount: 0,
        });

        expect(model.pipeline.value).toBe("No route failures");
        expect(model.pipeline.truthState).toBe("degraded");
        expect(model.pipeline.detail).toContain("Diagnostics remain degraded: 116 active across 5 clusters.");
        expect(model.pipeline.detail).not.toContain("$0");
        expect(model.routeFailures.emptyDetail).toContain("Active diagnostics are still degraded outside the route-failure lane.");
        expect(model.writers.detail).toContain("This does not prove untracked writers are healthy.");
    });
});
