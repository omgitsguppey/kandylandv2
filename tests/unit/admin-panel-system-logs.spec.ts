import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: null,
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
    recordRouteWarning: vi.fn(),
}));

import { buildAdminPanelSystemLogs } from "@/lib/server/admin-panel-system-logs";
import type { AdminOpsHealth } from "@/lib/admin-ops-health";
import type { RouteRuntimeHealthItem } from "@/lib/route-runtime-health";

describe("buildAdminPanelSystemLogs", () => {
    const NOW_MS = Date.UTC(2026, 3, 8, 12, 0, 0);
    const healthyOpsHealth: AdminOpsHealth = {
        score: 100,
        canonicalState: { status: "Live" },
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
            activeFailureCount: 0,
            recentFailureCount: 0,
            sampleFailureCount: 0,
            lastFailureAt: 0,
            lastRouteName: "",
            lastErrorMessage: "",
            activeWindowMs: 3_600_000,
            recentWindowMs: 14_400_000,
            routes: [],
        },
        materializers: [],
    };
    const healthyOrchestration = {
        score: 92,
        openFindings: 0,
        actionableProposals: 0,
        lowConfidenceEvents: 0,
        recommendationReady: 0,
    };

    it("counts negative reward deltas as active task integrity signals", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
            recentTransactionsCount: 5,
            unsupportedTasks: 0,
            telemetryValidatedTasks: 12,
            usersWithTaskIssues: 0,
            completedEventsLast7d: 4,
            receiptsLast7d: 4,
            rewardEventDeltaLast7d: -2,
            legacyRewardVersionCount: 0,
            trackedTelemetryEvents: 40,
            orphanedTelemetryEvents: 0,
            bugReportsLast7d: 0,
            rolloutCount: 2,
            releaseEntryCount: 3,
            creatorSpendViolationsLast7d: 0,
            opsHealth: healthyOpsHealth,
            orchestration: healthyOrchestration,
            routeRuntimeHealth: [],
        });

        const taskIntegrityLog = logs.find((entry) => entry.id === "tasks.integrity_and_parity");

        expect(taskIntegrityLog).toMatchObject({
            status: "warn",
            signalCount: 2,
            signalKeys: ["tasks.rewardDelta"],
        });
        expect(taskIntegrityLog?.action).toContain("Reconcile reward delta");
    });

    it("only lists active orchestration signal keys and avoids queued repair copy when none are actionable", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
            recentTransactionsCount: 20,
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
            opsHealth: healthyOpsHealth,
            orchestration: {
                score: 40,
                openFindings: 78,
                actionableProposals: 0,
                lowConfidenceEvents: 7,
                recommendationReady: 0,
            },
            routeRuntimeHealth: [],
        });

        const orchestrationLog = logs.find((entry) => entry.id === "overview.behavior_orchestration");

        expect(orchestrationLog).toMatchObject({
            status: "fail",
            signalCount: 78,
            signalKeys: ["orchestration.openFindings", "orchestration.lowConfidenceEvents"],
        });
        expect(orchestrationLog?.totalSignalCount).toBe(85);
        expect(orchestrationLog?.reviewableSignalCount).toBe(78);
        expect(orchestrationLog?.action).toContain("create repair proposals");
        expect(orchestrationLog?.action).not.toContain("queued repairs");
    });

    it("lists only missing runtime configuration signals", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
            recentTransactionsCount: 20,
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
                ...healthyOpsHealth,
                runtime: {
                    ...healthyOpsHealth.runtime,
                    navigationSessionSigningReady: false,
                },
            },
            orchestration: healthyOrchestration,
            routeRuntimeHealth: [],
        });

        const runtimeLog = logs.find((entry) => entry.id === "overview.session_runtime");

        expect(runtimeLog).toMatchObject({
            status: "warn",
            signalCount: 1,
            signalKeys: ["runtime.navigationSessionSigningReady"],
        });
    });

    it("does not count healthy recent transaction samples as issue signals", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
            recentTransactionsCount: 20,
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
            opsHealth: healthyOpsHealth,
            orchestration: healthyOrchestration,
            routeRuntimeHealth: [],
        });

        expect(logs.find((entry) => entry.id === "overview.recent_transactions")).toMatchObject({
            status: "healthy",
            signalCount: 0,
            signalKeys: [],
        });
    });

    it("classifies bug intake counts as info instead of review", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
            recentTransactionsCount: 20,
            unsupportedTasks: 0,
            telemetryValidatedTasks: 12,
            usersWithTaskIssues: 0,
            completedEventsLast7d: 5,
            receiptsLast7d: 5,
            rewardEventDeltaLast7d: 0,
            legacyRewardVersionCount: 0,
            trackedTelemetryEvents: 40,
            orphanedTelemetryEvents: 0,
            bugReportsLast7d: 1,
            rolloutCount: 2,
            releaseEntryCount: 3,
            creatorSpendViolationsLast7d: 0,
            opsHealth: healthyOpsHealth,
            orchestration: healthyOrchestration,
            routeRuntimeHealth: [],
        });

        const bugLog = logs.find((entry) => entry.id === "reports.bug_intake");
        expect(bugLog).toMatchObject({
            status: "healthy",
            signalCount: 0,
            reviewableSignalCount: 0,
            totalSignalCount: 1,
        });
        expect(bugLog?.signals?.[0]).toMatchObject({
            signalType: "bug_intake",
            reviewable: false,
            severity: "info",
        });
        expect(bugLog?.sectionStatus?.status).toBe("info");
        expect(bugLog?.summary).toBe("1 bug report landed in the last seven days.");
    });

    it("classifies rollout and release counts as inventory info", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
            recentTransactionsCount: 20,
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
            rolloutCount: 4,
            releaseEntryCount: 3,
            creatorSpendViolationsLast7d: 0,
            opsHealth: healthyOpsHealth,
            orchestration: healthyOrchestration,
            routeRuntimeHealth: [],
        });

        const rolloutLog = logs.find((entry) => entry.id === "reports.rollout_registry");
        expect(rolloutLog).toMatchObject({
            status: "healthy",
            signalCount: 0,
            reviewableSignalCount: 0,
            totalSignalCount: 7,
        });
        expect(rolloutLog?.signals?.map((entry) => entry.signalType)).toEqual(["inventory", "inventory"]);
        expect(rolloutLog?.sectionStatus?.inventoryCounts).toMatchObject({
            "reports.rollouts": 4,
            "reports.releaseEntries": 3,
        });
    });

    it("raises one recent transaction feed signal only when the sample is empty", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
            recentTransactionsCount: 0,
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
            opsHealth: healthyOpsHealth,
            orchestration: healthyOrchestration,
            routeRuntimeHealth: [],
        });

        expect(logs.find((entry) => entry.id === "overview.recent_transactions")).toMatchObject({
            status: "warn",
            signalCount: 1,
            signalKeys: ["overview.recentTransactions"],
        });
    });


    it("adds tracked route runtime summary logs", () => {
        const routeRuntimeHealth: RouteRuntimeHealthItem[] = [
            {
                key: "creator/relationships:GET",
                routeName: "creator/relationships",
                method: "GET",
                title: "Creator relationships reads",
                slowThresholdMs: 800,
                successCount: 10,
                clientErrorCount: 0,
                serverErrorCount: 0,
                slowCount: 0,
                averageLatencyMs: 180,
                maxLatencyMs: 240,
                lastLatencyMs: 160,
                lastResult: "success",
                lastStatusCode: 200,
                lastErrorMessage: null,
                firstObservedAtMs: NOW_MS - 15_000,
                updatedAtMs: NOW_MS - 5_000,
                lastSuccessAtMs: NOW_MS - 5_000,
                lastClientErrorAtMs: 0,
                lastServerErrorAtMs: 0,
            },
            {
                key: "admin/ai/drop-covers/generate:POST",
                routeName: "admin/ai/drop-covers/generate",
                method: "POST",
                title: "AI cover generation",
                slowThresholdMs: 12000,
                successCount: 4,
                clientErrorCount: 1,
                serverErrorCount: 1,
                slowCount: 2,
                averageLatencyMs: 4120,
                maxLatencyMs: 18000,
                lastLatencyMs: 15000,
                lastResult: "server_error",
                lastStatusCode: 500,
                lastErrorMessage: "Vertex provider timeout",
                firstObservedAtMs: NOW_MS - 15_000,
                updatedAtMs: NOW_MS - 1_000,
                lastSuccessAtMs: NOW_MS - 6_000,
                lastClientErrorAtMs: NOW_MS - 2_000,
                lastServerErrorAtMs: NOW_MS - 1_000,
            },
        ];

        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
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
                score: 100,
                canonicalState: { status: "Live" },
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
                    activeFailureCount: 0,
                    recentFailureCount: 0,
                    sampleFailureCount: 0,
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
            routeRuntimeHealth,
        });

        const routeLog = logs.find((entry) => entry.id === "ops.route_runtime_health");
        expect(routeLog).toMatchObject({
            tab: "ops",
            panelTitle: "Tracked route runtime",
            status: "fail",
        });
        expect(routeLog?.summary).toContain("currently failing");
        expect(routeLog?.action).toContain("AI cover generation");
    });

    it("keeps never-observed tracked routes visible in the runtime log", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: NOW_MS,
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
                score: 100,
                canonicalState: { status: "Live" },
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
                    activeFailureCount: 0,
                    recentFailureCount: 0,
                    sampleFailureCount: 0,
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
            routeRuntimeHealth: [
                {
                    key: "admin/debug:GET",
                    routeName: "admin/debug",
                    method: "GET",
                    title: "Admin debug snapshot",
                    slowThresholdMs: 1800,
                    successCount: 0,
                    clientErrorCount: 0,
                    serverErrorCount: 0,
                    slowCount: 0,
                    averageLatencyMs: 0,
                    maxLatencyMs: 0,
                    lastLatencyMs: 0,
                    lastResult: "success",
                    lastStatusCode: 0,
                    lastErrorMessage: null,
                    firstObservedAtMs: 0,
                    updatedAtMs: 0,
                    lastSuccessAtMs: 0,
                    lastClientErrorAtMs: 0,
                    lastServerErrorAtMs: 0,
                },
            ],
        });

        const routeLog = logs.find((entry) => entry.id === "ops.route_runtime_health");
        expect(routeLog).toMatchObject({
            status: "warn",
        });
        expect(routeLog?.summary).toContain("never produced a runtime sample");
    });

    it("adds separate native and compatibility chat runtime logs", () => {
        const logs = buildAdminPanelSystemLogs({
            nowMs: Date.UTC(2026, 3, 8, 12, 0, 0),
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
                score: 100,
                canonicalState: { status: "Live" },
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
                    activeFailureCount: 0,
                    recentFailureCount: 0,
                    sampleFailureCount: 0,
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
            routeRuntimeHealth: [
                {
                    key: "chat/threads/[threadId]/messages:POST",
                    routeName: "chat/threads/[threadId]/messages",
                    method: "POST",
                    title: "Chat message sends",
                    slowThresholdMs: 1600,
                    successCount: 3,
                    clientErrorCount: 0,
                    serverErrorCount: 1,
                    slowCount: 0,
                    averageLatencyMs: 320,
                    maxLatencyMs: 640,
                    lastLatencyMs: 640,
                    lastResult: "server_error",
                    lastStatusCode: 500,
                    lastErrorMessage: "broken",
                    firstObservedAtMs: 100,
                    updatedAtMs: Date.UTC(2026, 3, 8, 11, 59, 0),
                    lastSuccessAtMs: Date.UTC(2026, 3, 8, 11, 58, 0),
                    lastClientErrorAtMs: 0,
                    lastServerErrorAtMs: Date.UTC(2026, 3, 8, 11, 59, 0),
                },
                {
                    key: "creator/messages:POST",
                    routeName: "creator/messages",
                    method: "POST",
                    title: "Legacy creator-message sends",
                    slowThresholdMs: 1600,
                    successCount: 2,
                    clientErrorCount: 1,
                    serverErrorCount: 0,
                    slowCount: 0,
                    averageLatencyMs: 240,
                    maxLatencyMs: 400,
                    lastLatencyMs: 320,
                    lastResult: "client_error",
                    lastStatusCode: 404,
                    lastErrorMessage: null,
                    firstObservedAtMs: 100,
                    updatedAtMs: Date.UTC(2026, 3, 8, 11, 58, 0),
                    lastSuccessAtMs: Date.UTC(2026, 3, 8, 11, 58, 0),
                    lastClientErrorAtMs: Date.UTC(2026, 3, 8, 10, 0, 0),
                    lastServerErrorAtMs: 0,
                },
            ],
        });

        expect(logs.find((entry) => entry.id === "ops.chat_runtime_native")).toMatchObject({
            panelTitle: "Native chat runtime",
            status: "fail",
        });
        expect(logs.find((entry) => entry.id === "ops.chat_runtime_compatibility")).toMatchObject({
            panelTitle: "Creator-message compatibility runtime",
            status: "warn",
        });
    });
});
