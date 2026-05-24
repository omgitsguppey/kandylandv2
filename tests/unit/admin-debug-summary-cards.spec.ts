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
    it("uses operator route health copy while preserving technical source evidence", () => {
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
        expect(card.meta).toContain("Showing last verified route data while live checks connect.");
        expect(card.technicalEvidence).toContain("[partial] API snapshot; route listener hydrating");
        expect(card.technicalEvidence).toContain("4 tracked, 3 observed, 1 unseen");
        expect(card.copy.operatorSummary).toContain("Showing last verified route data");
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

        expect(card.meta).toContain("Live route checks are showing.");
        expect(card.technicalEvidence).toContain("[live] API snapshot + route listener");
        expect(card.technicalEvidence).toContain("158 tracked, 38 observed, 120 unseen");
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

        expect(card.value).toBe("32 ok / 6 action / 0 fail");
        expect(card.meta).toContain("Live route checks are delayed. Showing last verified route data.");
        expect(card.technicalEvidence).toContain("[degraded] API snapshot; route listener failed");
        expect(card.meta).not.toContain("[fallback]");
        expect(card.truthState).toBe("degraded");
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
        expect(card.technicalEvidence).toContain("158 tracked, 9 observed, 149 unseen");
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
        expect(card.meta).toBe("No verified route health data yet.");
        expect(card.technicalEvidence).toBe("[failed] route listener and API snapshot empty");
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
        expect(card.meta).toBe("12 open items need review.");
        expect(card.technicalEvidence).toContain("1 repair proposal (1 actionable proposal)");
        expect(card.technicalEvidence).toContain("9 panel logs (2 fail, 7 warn)");
        expect(card.technicalEvidence).not.toContain("0 route");
        expect(card.technicalEvidence).toContain("2 queue runtime (0 failed jobs, 1 stale jobs, 1 missing outcomes)");
        expect(card.copy.recommendedNextCheck).toContain("Action lane");
        expect(card.truthState).toBe("failed");
    });

    it("labels AI assistant saved output in operator copy while preserving fallback evidence", () => {
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
        expect(card.meta).toBe("Deterministic fallback is active because assistant feed preflight failed.");
        expect(card.technicalEvidence).toContain("preflight observers failed");
        expect(card.technicalEvidence).toContain("runtime ready");
        expect(card.technicalEvidence).toContain("deterministic fallback output");
        expect(card.truthState).toBe("fallback");
    });

    it("keeps AI assistant technical preflight source out of primary meta", () => {
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
        expect(card.meta).not.toContain("realtime preflight lane");
        expect(card.meta).toBe("Deterministic fallback is active without a live model call.");
        expect(card.technicalEvidence).toContain("realtime preflight lane");
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
        expect(model.pipeline.detail).toContain("Diagnostics need review: 116 active across 5 clusters.");
        expect(model.pipeline.detail).not.toContain("$0");
        expect(model.routeFailures.emptyDetail).toContain("Other active diagnostics still need review.");
        expect(model.writers.detail).toContain("This does not prove untracked writers are healthy.");
    });

    it("explains aggregate route failures when the per-route sample is empty", () => {
        const model = buildAdminDebugSystemHealthNowModel({
            score: 40,
            scorePenalties: [{
                id: "pipeline-active-failures",
                label: "Active route pipeline failures",
                points: 30,
                source: "opsHealth.pipeline",
                truthState: "failed",
            }],
            activePipelineFailureCount: 8,
            recentPipelineFailureCount: 8,
            sampledPipelineFailureCount: 53,
            activePipelineWindowMs: 60 * 60 * 1000,
            lastPipelineFailureAt: Date.now() - 21 * 60 * 1000,
            activeDiagnosticCount: 0,
            recentDiagnosticCount: 0,
            sampledDiagnosticCount: 0,
            activeIssueClusterCount: 0,
            routeFailureCount: 0,
            writerSampleCount: 10,
            writerWarnCount: 0,
            writerFailCount: 0,
            runtimeWarningCount: 0,
        });

        expect(model.pipeline.value).toBe("Active pipeline failures");
        expect(model.pipeline.detail).toContain("current per-route sample");
        expect(model.routeFailures.emptyDetail).toContain("No active route failures in current sample");
        expect(model.writers.summaryValue).toBe("10/10");
        expect(model.writers.writerCountSource).toBe("opsHealth.materializers");
        expect(model.score.penaltyCount).toBe(1);
    });

    it("surfaces active diagnostic clusters with validator context", () => {
        const model = buildAdminDebugSystemHealthNowModel({
            score: 86,
            scorePenalties: [{
                id: "active-diagnostics",
                label: "14 active diagnostics across 2 clusters",
                points: 14,
                source: "opsHealth.diagnostics",
                truthState: "degraded",
            }],
            activePipelineFailureCount: 0,
            recentPipelineFailureCount: 0,
            sampledPipelineFailureCount: 0,
            activePipelineWindowMs: 60 * 60 * 1000,
            activeDiagnosticCount: 14,
            recentDiagnosticCount: 14,
            sampledDiagnosticCount: 14,
            activeIssueClusterCount: 2,
            activeDiagnosticClusters: [{
                id: "diagnostic:admin:warn:abc",
                fingerprint: "admin|warn|Debug route delayed",
                severity: "warn",
                count: 9,
                lastSeenAt: Date.UTC(2026, 4, 5, 21),
                source: "admin",
                sourceRouteOrComponent: "/api/admin/debug",
                message: "Debug route delayed",
                suggestedValidator: "npm run check:admin-debug-control-tower",
            }],
            routeFailureCount: 0,
            writerSampleCount: 10,
            writerWarnCount: 0,
            writerFailCount: 0,
            runtimeWarningCount: 0,
        });

        expect(model.diagnostics.clusterCount).toBe(2);
        expect(model.diagnostics.clusters[0]?.fingerprint).toBe("admin|warn|Debug route delayed");
        expect(model.diagnostics.clusters[0]?.suggestedValidator).toBe("npm run check:admin-debug-control-tower");
        expect(model.score.detail).toContain("14 active diagnostics across 2 clusters");
    });
});
