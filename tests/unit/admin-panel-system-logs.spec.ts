import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: null,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: vi.fn(),
}));

import { buildAdminUiChartHealthItem } from "@/lib/admin-ui-chart-health";
import { buildAdminPanelSystemLogs } from "@/lib/server/admin-panel-system-logs";

describe("buildAdminPanelSystemLogs", () => {
    it("adds analytics chart-health summaries by category", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: Date.UTC(2026, 3, 6, 23, 59, 0),
            recentTransactionsCount: 5,
            unsupportedTasks: 0,
            telemetryValidatedTasks: 12,
            usersWithTaskIssues: 0,
            completedEventsLast7d: 5,
            receiptsLast7d: 5,
            rewardEventDeltaLast7d: 0,
            legacyRewardVersionCount: 0,
            trackedTelemetryEvents: 40,
            orphanedTelemetryEvents: 0,
            bugReportsLast7d: 0,
            rolloutCount: 2,
            releaseEntryCount: 3,
            creatorSpendViolationsLast7d: 0,
            opsHealth: {
                score: 96,
                runtime: {
                    gaPropertyConfigured: true,
                    vapidConfigured: true,
                    databaseUrlConfigured: true,
                    projectId: "kandydrops-by-ikandy",
                    navigationSessionSigningReady: true,
                    warnings: [],
                },
                diagnostics: {
                    total: 0,
                    errorCount: 0,
                    warnCount: 0,
                    infoCount: 0,
                    activeErrorCount: 0,
                    activeWarnCount: 0,
                    recentErrorCount: 0,
                    recentWarnCount: 0,
                    activeIssueClusterCount: 0,
                    recentIssueClusterCount: 0,
                    activeWindowMs: 3_600_000,
                    recentWindowMs: 14_400_000,
                    lastDiagnosticAt: 0,
                    channels: [],
                    recent: [],
                },
                pipeline: {
                    status: "healthy",
                    failureCount: 0,
                    lastFailureAt: 0,
                    lastRouteName: "",
                    lastErrorMessage: "",
                    activeWindowMs: 3_600_000,
                    recentWindowMs: 14_400_000,
                    routes: [],
                },
                materializers: [],
            },
            orchestration: {
                score: 92,
                openFindings: 0,
                actionableProposals: 0,
                lowConfidenceEvents: 0,
                recommendationReady: 0,
            },
            chartHealth: [
                buildAdminUiChartHealthItem({
                    key: "dashboard.platform_pulse",
                    title: "Platform pulse",
                    page: "dashboard",
                    category: "overview",
                    source: "overview_snapshot",
                    updatedAtMs: 100,
                    hasLoaded: true,
                    hasData: true,
                    healthySummary: "Loaded.",
                    emptySummary: "Empty.",
                }),
                buildAdminUiChartHealthItem({
                    key: "analytics.operations.live_pulse",
                    title: "Live Pulse",
                    page: "analytics",
                    category: "operations",
                    source: "mixed_client_live",
                    updatedAtMs: 200,
                    hasLoaded: true,
                    hasData: false,
                    healthySummary: "Loaded.",
                    emptySummary: "No live pulse.",
                }),
            ],
        });

        const overviewLog = logs.find((entry) => entry.id === "analytics.overview_chart_health");
        const operationsLog = logs.find((entry) => entry.id === "analytics.operations_chart_health");
        const audienceLog = logs.find((entry) => entry.id === "analytics.audience_chart_health");

        expect(overviewLog).toMatchObject({
            tab: "analytics",
            status: "healthy",
            panelTitle: "Overview modules",
        });
        expect(operationsLog).toMatchObject({
            tab: "analytics",
            status: "warn",
            panelTitle: "Operations charts",
        });
        expect(audienceLog).toMatchObject({
            tab: "analytics",
            status: "warn",
        });
        expect(audienceLog?.summary).toContain("No recent audience charts health report");
    });
});
