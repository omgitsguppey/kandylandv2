import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase-runtime", () => ({
    buildFirebaseClientRuntimeSnapshot: vi.fn(() => ({
        vapidKey: "test-vapid-key",
        databaseURL: "https://kandydrops-by-ikandy.firebaseio.com",
        projectId: "kandydrops-by-ikandy",
    })),
    getFirebaseRuntimeWarnings: vi.fn(() => []),
}));

import { buildAdminOpsHealth } from "@/lib/server/admin-ops-health";

function mockDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    } as FirebaseFirestore.QueryDocumentSnapshot;
}

describe("buildAdminOpsHealth", () => {
    it("keeps older sampled failures visible without treating them as an active ops incident", () => {
        const nowMs = Date.UTC(2026, 3, 6, 12, 0, 0);
        const twoDaysAgo = nowMs - (2 * 24 * 60 * 60 * 1000);
        const oneHourAgo = nowMs - (60 * 60 * 1000);

        const result = buildAdminOpsHealth({
            nowMs,
            diagnosticsDocs: [
                mockDoc("diag_old_error", {
                    channel: "analytics",
                    severity: "error",
                    message: "Old ingest error",
                    createdAtMs: twoDaysAgo,
                }),
            ],
            pipelineDocs: [
                mockDoc("pipeline_old", {
                    failureCount: 632,
                    lastFailureAtMs: twoDaysAgo,
                    lastRouteName: "analytics/ingest",
                    lastErrorMessage: "Historical failure",
                    routeCounts: {
                        analytics_ingest: 632,
                    },
                }),
            ],
            eventStatsDocs: [mockDoc("event_stats_1", { lastSeenAt: oneHourAgo })],
            taskRollupDocs: [mockDoc("task_rollup_1", { lastEventAt: oneHourAgo })],
            guestBatchDocs: [mockDoc("guest_batch_1", { lastUpdatedAt: oneHourAgo })],
            securityEventDocs: [mockDoc("security_1", { timestamp: oneHourAgo })],
            watchSessionDocs: [mockDoc("watch_session_1", { lastSeenAtMs: oneHourAgo })],
            watchAssetDocs: [mockDoc("watch_asset_1", { lastSeenAtMs: oneHourAgo })],
            commerceSummaryDoc: {
                exists: true,
                data: () => ({
                    transactionCount: 12,
                    updatedAt: {
                        toMillis: () => oneHourAgo,
                    },
                }),
            } as unknown as FirebaseFirestore.DocumentSnapshot,
        });

        expect(result.canonicalState.status).toBe("Live");
        expect(result.canonicalState.status).toBeDefined();
        expect(result.pipeline.status).toBe("healthy");
        expect(result.diagnostics.activeErrorCount).toBe(0);
        expect(result.diagnostics.recentErrorCount).toBe(0);
        expect(result.diagnostics.activeIssueClusterCount).toBe(0);
        expect(result.diagnostics.recentIssueClusterCount).toBe(0);
        expect(result.pipeline.failureCount).toBe(632);
        expect(result.materializerSummary).toMatchObject({
            healthy: 9,
            warn: 0,
            fail: 0,
        });
        
        expect(result.materializers.find((item) => item.key === "analytics_pipeline_daily")?.status).toBe("healthy");
    });

    it("penalizes current diagnostics and recent pipeline failures", () => {
        const nowMs = Date.UTC(2026, 3, 6, 12, 0, 0);
        const oneHourAgo = nowMs - (60 * 60 * 1000);
        const twoHoursAgo = nowMs - (2 * 60 * 60 * 1000);

        const result = buildAdminOpsHealth({
            nowMs,
            diagnosticsDocs: [
                mockDoc("diag_active_error", {
                    channel: "analytics",
                    severity: "error",
                    message: "Active ingest failure",
                    createdAtMs: oneHourAgo,
                }),
                mockDoc("diag_active_warn", {
                    channel: "runtime",
                    severity: "warn",
                    message: "Runtime warning",
                    createdAtMs: twoHoursAgo,
                }),
            ],
            pipelineDocs: [
                mockDoc("pipeline_recent", {
                    failureCount: 2,
                    lastFailureAtMs: oneHourAgo,
                    lastRouteName: "analytics/ingest",
                    lastErrorMessage: "Current failure",
                    routeCounts: {
                        analytics_ingest: 2,
                    },
                }),
            ],
            eventStatsDocs: [mockDoc("event_stats_1", { lastSeenAt: oneHourAgo })],
            taskRollupDocs: [mockDoc("task_rollup_1", { lastEventAt: oneHourAgo })],
            guestBatchDocs: [mockDoc("guest_batch_1", { receivedAtMs: oneHourAgo })],
            securityEventDocs: [mockDoc("security_1", { timestamp: oneHourAgo })],
            watchSessionDocs: [mockDoc("watch_session_1", { lastSeenAtMs: oneHourAgo })],
            watchAssetDocs: [mockDoc("watch_asset_1", { lastSeenAtMs: oneHourAgo })],
            commerceSummaryDoc: {
                exists: true,
                data: () => ({
                    transactionCount: 4,
                    updatedAt: {
                        toMillis: () => oneHourAgo,
                    },
                }),
            } as unknown as FirebaseFirestore.DocumentSnapshot,
        });

        expect(result.canonicalState.status).toBe("Degraded");
        expect(result.canonicalState.status).toBeDefined();
        expect(result.pipeline.status).toBe("fail");
        expect(result.diagnostics.activeErrorCount).toBe(1);
        expect(result.diagnostics.activeWarnCount).toBe(0);
        expect(result.diagnostics.recentWarnCount).toBe(1);
        expect(result.diagnostics.activeIssueClusterCount).toBe(1);
        expect(result.diagnostics.recentIssueClusterCount).toBe(2);
        expect(result.materializerSummary).toMatchObject({
            healthy: 9,
            warn: 0,
            fail: 0,
        });
        
    });

    it("tracks active and recent channel counts separately from loaded sample totals", () => {
        const nowMs = Date.UTC(2026, 3, 6, 12, 0, 0);
        const thirtyMinutesAgo = nowMs - (30 * 60 * 1000);
        const threeHoursAgo = nowMs - (3 * 60 * 60 * 1000);
        const twoDaysAgo = nowMs - (2 * 24 * 60 * 60 * 1000);

        const result = buildAdminOpsHealth({
            nowMs,
            diagnosticsDocs: [
                mockDoc("diag_auth_active", {
                    channel: "auth",
                    severity: "error",
                    message: "Recent auth failure",
                    createdAtMs: thirtyMinutesAgo,
                }),
                mockDoc("diag_runtime_recent", {
                    channel: "runtime",
                    severity: "warn",
                    message: "Recent runtime warning",
                    createdAtMs: threeHoursAgo,
                }),
                mockDoc("diag_runtime_old", {
                    channel: "runtime",
                    severity: "warn",
                    message: "Older runtime warning",
                    createdAtMs: twoDaysAgo,
                }),
            ],
            pipelineDocs: [],
            eventStatsDocs: [],
            taskRollupDocs: [],
            guestBatchDocs: [],
            securityEventDocs: [],
            watchSessionDocs: [],
            watchAssetDocs: [],
            commerceSummaryDoc: null,
        });

        const authChannel = result.diagnostics.channels.find((channel) => channel.key === "auth");
        const runtimeChannel = result.diagnostics.channels.find((channel) => channel.key === "runtime");

        expect(authChannel).toMatchObject({
            errorCount: 1,
            activeErrorCount: 1,
            recentErrorCount: 1,
            warnCount: 0,
            activeWarnCount: 0,
            recentWarnCount: 0,
        });
        expect(runtimeChannel).toMatchObject({
            warnCount: 2,
            activeWarnCount: 0,
            recentWarnCount: 1,
            errorCount: 0,
        });
    });
});
