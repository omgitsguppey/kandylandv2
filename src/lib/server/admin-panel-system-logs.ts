import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import type { AdminOpsHealth } from "@/lib/admin-ops-health";
import {
    getRouteRuntimeHealthCluster,
    getRouteRuntimeHealthCoverageState,
    getRouteRuntimeHealthStatus,
    type RouteRuntimeHealthItem,
} from "@/lib/route-runtime-health";
import {
    ADMIN_PANEL_SYSTEM_LOG_COLLECTION,
    type AdminPanelSystemLog,
    type AdminPanelSystemLogStatus,
} from "@/lib/admin-panel-system-logs";
import { recordRouteWarning } from "@/lib/server/route-diagnostics";

const PANEL_LOG_WRITE_THROTTLE_MS = 30 * 60 * 1000;

type OrchestrationSummaryInput = {
    score: number;
    openFindings: number;
    actionableProposals: number;
    lowConfidenceEvents: number;
    recommendationReady: number;
};


type PersistedAdminPanelSystemLog = Partial<AdminPanelSystemLog> & {
    firstObservedAtMs?: number;
    changedAtMs?: number;
};

function buildLog(input: Omit<AdminPanelSystemLog, "updatedAtMs">): AdminPanelSystemLog {
    return {
        ...input,
        updatedAtMs: input.observedAtMs,
    };
}

function arraysMatch(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function toNumber(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildRuntimeAction(opsHealth: AdminOpsHealth) {
    if (opsHealth.runtime.navigationSessionSigningReady !== true) {
        return "Restore navigation session signing secrets so admin runtime flows do not depend on weak fallback behavior.";
    }

    if (opsHealth.runtime.gaPropertyConfigured !== true) {
        return "Restore GA runtime configuration so analytics panels stop depending on partial fallback data.";
    }

    if (opsHealth.runtime.warnings.length > 0) {
        return "Review runtime warnings and clear the missing Firebase/App runtime inputs still surfacing in debug.";
    }

    return "Runtime configuration is aligned for the current admin console surfaces.";
}


function buildRouteRuntimeClusterLog(input: {
    id: string;
    panelTitle: string;
    items: RouteRuntimeHealthItem[];
    nowMs: number;
}) {
    const failCount = input.items.filter((item) => getRouteRuntimeHealthStatus(item, input.nowMs) === "fail").length;
    const warnCount = input.items.filter((item) => getRouteRuntimeHealthStatus(item, input.nowMs) === "warn").length;
    const staleCount = input.items.filter((item) => getRouteRuntimeHealthStatus(item, input.nowMs) === "stale").length;
    const unseenCount = input.items.filter((item) => getRouteRuntimeHealthCoverageState(item) === "unseen").length;
    const status: AdminPanelSystemLogStatus = input.items.length === 0
        ? "warn"
        : failCount > 0
            ? "fail"
            : warnCount > 0 || staleCount > 0
                ? "warn"
                : "healthy";

    const summary = input.items.length === 0
        ? `No tracked routes are assigned to ${input.panelTitle.toLowerCase()}.`
        : failCount > 0
            ? `${failCount} ${input.panelTitle.toLowerCase()} routes are actively failing.`
            : staleCount > 0
                ? `${staleCount} ${input.panelTitle.toLowerCase()} routes are stale and need fresh samples.`
                : unseenCount > 0
                    ? `${unseenCount} ${input.panelTitle.toLowerCase()} routes have no runtime sample yet.`
                    : warnCount > 0
                        ? `${warnCount} ${input.panelTitle.toLowerCase()} routes have slow or client-error history in the current sample.`
                        : `${input.items.length} ${input.panelTitle.toLowerCase()} routes are healthy.`;

    const action = input.items.length === 0
        ? "No action required."
        : failCount > 0 || warnCount > 0 || staleCount > 0 || unseenCount > 0
            ? `Inspect the highest-risk routes first: ${input.items
                .filter((item) => getRouteRuntimeHealthStatus(item, input.nowMs) !== "healthy" || getRouteRuntimeHealthCoverageState(item) === "unseen")
                .slice(0, 3)
                .map((item) => item.title)
                .join(", ") || input.panelTitle.toLowerCase()}`
            : "No action required.";

    return buildLog({
        id: input.id,
        panelKey: input.id,
        tab: "ops",
        panelTitle: input.panelTitle,
        status,
        summary,
        action,
        signalCount: failCount + warnCount + staleCount + unseenCount,
        signalKeys: input.items.map((item) => `route_runtime_health.${item.key}`),
        observedAtMs: input.nowMs,
    });
}

export function buildAdminPanelSystemLogs(input: {
    nowMs?: number;
    recentTransactionsCount: number;
    unsupportedTasks: number;
    telemetryValidatedTasks: number;
    usersWithTaskIssues: number;
    completedEventsLast7d: number;
    receiptsLast7d: number;
    rewardEventDeltaLast7d: number;
    legacyRewardVersionCount: number;
    trackedTelemetryEvents: number;
    orphanedTelemetryEvents: number;
    bugReportsLast7d: number;
    rolloutCount: number;
    releaseEntryCount: number;
    creatorSpendViolationsLast7d: number;
    opsHealth: AdminOpsHealth;
    orchestration: OrchestrationSummaryInput;
    routeRuntimeHealth?: RouteRuntimeHealthItem[];
}) {
    const nowMs = input.nowMs ?? Date.now();
    const materializerFailures = input.opsHealth.materializers.filter((item) => item.status === "fail").length;
    const materializerWarnings = input.opsHealth.materializers.filter((item) => item.status === "warn").length;
    const runtimeWarningCount = input.opsHealth.runtime.warnings.length;
    const activeDiagnosticErrorCount = input.opsHealth.diagnostics.activeErrorCount;
    const activeDiagnosticWarnCount = input.opsHealth.diagnostics.activeWarnCount;
    const recentDiagnosticErrorCount = input.opsHealth.diagnostics.recentErrorCount;
    const recentDiagnosticWarnCount = input.opsHealth.diagnostics.recentWarnCount;
    const staleDiagnosticErrorCount = Math.max(0, input.opsHealth.diagnostics.errorCount - recentDiagnosticErrorCount);
    const staleDiagnosticWarnCount = Math.max(0, input.opsHealth.diagnostics.warnCount - recentDiagnosticWarnCount);

    const behaviorOrchestrationStatus: AdminPanelSystemLogStatus =
        input.orchestration.openFindings > 0 || input.orchestration.actionableProposals > 0
            ? input.orchestration.score >= 80 ? "warn" : "fail"
            : input.orchestration.lowConfidenceEvents > 0
                ? "warn"
                : "healthy";

    const taskRewardDeltaSignalCount = Math.abs(input.rewardEventDeltaLast7d);
    const taskIntegritySignalCount =
        input.usersWithTaskIssues
        + taskRewardDeltaSignalCount
        + input.creatorSpendViolationsLast7d
        + input.legacyRewardVersionCount;
    const taskIntegritySignalKeys = [
        input.usersWithTaskIssues > 0 ? "tasks.usersWithIssues" : null,
        input.rewardEventDeltaLast7d !== 0 ? "tasks.rewardDelta" : null,
        input.legacyRewardVersionCount > 0 ? "tasks.legacyRewardVersionCount" : null,
        input.creatorSpendViolationsLast7d > 0 ? "tasks.creatorSpendViolations" : null,
    ].filter((value): value is string => Boolean(value));
    const taskIntegrityStatus: AdminPanelSystemLogStatus =
        input.creatorSpendViolationsLast7d > 0 || input.usersWithTaskIssues > 0
            ? "fail"
            : input.rewardEventDeltaLast7d !== 0 || input.legacyRewardVersionCount > 0
                ? "warn"
                : "healthy";
    const orchestrationSignalKeys = [
        input.orchestration.openFindings > 0 ? "orchestration.openFindings" : null,
        input.orchestration.actionableProposals > 0 ? "orchestration.actionableProposals" : null,
        input.orchestration.lowConfidenceEvents > 0 ? "orchestration.lowConfidenceEvents" : null,
    ].filter((value): value is string => Boolean(value));
    const orchestrationAction = input.orchestration.actionableProposals > 0
        ? "Review the open orchestration findings and confirm or dismiss the queued repairs."
        : input.orchestration.openFindings > 0
            ? "Review open orchestration findings and create repair proposals only where owner and fix confidence are clear."
            : input.orchestration.lowConfidenceEvents > 0
                ? "Tighten event ownership for the low-confidence orchestration samples before expanding automation."
                : "No action required.";
    const runtimeSignalKeys = [
        runtimeWarningCount > 0 ? "runtime.warnings" : null,
        input.opsHealth.runtime.gaPropertyConfigured !== true ? "runtime.gaPropertyConfigured" : null,
        input.opsHealth.runtime.navigationSessionSigningReady !== true ? "runtime.navigationSessionSigningReady" : null,
    ].filter((value): value is string => Boolean(value));
    const recentTransactionsMissing = input.recentTransactionsCount <= 0;
    const telemetryCoverageStatus: AdminPanelSystemLogStatus =
        input.orphanedTelemetryEvents > 0 ? "warn" : "healthy";
    const pipelineStatus: AdminPanelSystemLogStatus = input.opsHealth.pipeline.status;
    const diagnosticsStatus: AdminPanelSystemLogStatus =
        materializerFailures > 0 || activeDiagnosticErrorCount > 0
            ? "fail"
            : materializerWarnings > 0 || activeDiagnosticWarnCount > 0 || recentDiagnosticErrorCount > 0 || recentDiagnosticWarnCount > 0 || runtimeWarningCount > 0
                ? "warn"
                : "healthy";

        const routeRuntimeHealth = input.routeRuntimeHealth ?? [];
        const routeFailCount = routeRuntimeHealth.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "fail").length;
    const routeWarnCount = routeRuntimeHealth.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "warn").length;
    const routeStaleCount = routeRuntimeHealth.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) === "stale").length;
    const routeUnobservedCount = routeRuntimeHealth.filter((item) => getRouteRuntimeHealthCoverageState(item) === "unseen").length;
    const routeObservedWarnCount = Math.max(0, routeWarnCount - routeUnobservedCount);
    const nativeChatRouteHealth = routeRuntimeHealth.filter((item) => getRouteRuntimeHealthCluster(item.key) === "native_chat");
    const compatibilityChatRouteHealth = routeRuntimeHealth.filter((item) => getRouteRuntimeHealthCluster(item.key) === "compatibility_chat");
    const routeHealthLog = buildLog({
        id: "ops.route_runtime_health",
        panelKey: "ops.route_runtime_health",
        tab: "ops",
        panelTitle: "Tracked route runtime",
        status: routeRuntimeHealth.length === 0
            ? "warn"
            : routeFailCount > 0
                ? "fail"
                : routeWarnCount > 0 || routeStaleCount > 0
                    ? "warn"
                    : "healthy",
        summary: routeRuntimeHealth.length === 0
            ? "No route runtime health rollups have been recorded yet for the tracked chat, creator-message compatibility, support, and AI endpoints."
            : routeFailCount > 0
                ? `${routeFailCount} tracked routes are currently failing and ${routeWarnCount} are degraded or historically noisy.`
                : routeStaleCount > 0
                    ? `${routeStaleCount} tracked routes are stale, so the runtime lane is no longer fresh enough to trust at a glance.`
                    : routeUnobservedCount > 0
                    ? `${routeUnobservedCount} tracked routes have never produced a runtime sample yet, so this lane is not fully evidenced.`
                    : routeWarnCount > 0
                        ? `${routeWarnCount} tracked routes are degraded or have recorded slow/error history without a current server failure.`
                        : `${routeRuntimeHealth.length} tracked routes are healthy in the latest runtime rollup sample.`,
        action: routeRuntimeHealth.length === 0
            ? "Drive the tracked chat, creator-message compatibility, support, and AI routes at least once so debug can materialize real route health."
            : routeFailCount > 0 || routeWarnCount > 0 || routeStaleCount > 0
                ? `Inspect the highest-risk or never-observed routes first: ${routeRuntimeHealth.filter((item) => getRouteRuntimeHealthStatus(item, nowMs) !== "healthy").slice(0, 3).map((item) => item.title).join(", ") || "tracked route runtime"}`
                : "No action required.",
        signalCount: routeFailCount + routeObservedWarnCount + routeStaleCount + routeUnobservedCount,
        signalKeys: routeRuntimeHealth.map((item) => `route_runtime_health.${item.key}`),
        observedAtMs: nowMs,
    });

    return [
        buildLog({
            id: "overview.behavior_orchestration",
            panelKey: "overview.behavior_orchestration",
            tab: "overview",
            panelTitle: "Behavior orchestration",
            status: behaviorOrchestrationStatus,
            summary: input.orchestration.openFindings > 0 || input.orchestration.actionableProposals > 0
                ? `${input.orchestration.openFindings} open findings and ${input.orchestration.actionableProposals} actionable repairs are active.`
                : input.orchestration.lowConfidenceEvents > 0
                    ? `${input.orchestration.lowConfidenceEvents} low-confidence orchestration events still need review.`
                    : "Orchestration health is aligned with current canonical signals.",
            action: orchestrationAction,
            signalCount: input.orchestration.openFindings + input.orchestration.actionableProposals + input.orchestration.lowConfidenceEvents,
            signalKeys: orchestrationSignalKeys,
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "overview.manual_admin_tools",
            panelKey: "overview.manual_admin_tools",
            tab: "overview",
            panelTitle: "Manual admin tools",
            status: "healthy",
            summary: "Manual balance and webhook utilities remain available for controlled operator verification.",
            action: "Use only for deliberate operator checks; this lane does not prove live system health.",
            signalCount: 0,
            signalKeys: ["manual_admin_tools.available"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "overview.session_runtime",
            panelKey: "overview.session_runtime",
            tab: "overview",
            panelTitle: "Session and runtime",
            status: runtimeWarningCount > 0 || input.opsHealth.runtime.gaPropertyConfigured !== true || input.opsHealth.runtime.navigationSessionSigningReady !== true
                ? "warn"
                : "healthy",
            summary: runtimeWarningCount > 0
                ? `${runtimeWarningCount} runtime warnings are still present in the admin session/runtime lane.`
                : input.opsHealth.runtime.navigationSessionSigningReady !== true
                    ? "Navigation session signing is not configured, so admin runtime flows still depend on weak fallback behavior."
                    : input.opsHealth.runtime.gaPropertyConfigured !== true
                        ? "GA runtime inputs are not fully configured, so analytics panels may still depend on partial fallback data."
                        : "Runtime/session inputs are aligned for the current admin console.",
            action: buildRuntimeAction(input.opsHealth),
            signalCount:
                runtimeWarningCount
                + (input.opsHealth.runtime.gaPropertyConfigured !== true ? 1 : 0)
                + (input.opsHealth.runtime.navigationSessionSigningReady !== true ? 1 : 0),
            signalKeys: runtimeSignalKeys,
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "overview.recent_transactions",
            panelKey: "overview.recent_transactions",
            tab: "overview",
            panelTitle: "Recent transactions",
            status: recentTransactionsMissing ? "warn" : "healthy",
            summary: recentTransactionsMissing
                ? "No recent transaction entries were available in the sampled admin feed."
                : `${input.recentTransactionsCount} recent transactions are available for inline review.`,
            action: recentTransactionsMissing
                ? "Verify the overview transaction feed is still subscribed and not masked by stale runtime state."
                : "No action required.",
            signalCount: recentTransactionsMissing ? 1 : 0,
            signalKeys: recentTransactionsMissing ? ["overview.recentTransactions"] : [],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "tasks.coverage_matrix",
            panelKey: "tasks.coverage_matrix",
            tab: "tasks",
            panelTitle: "Coverage matrix",
            status: input.unsupportedTasks > 0 ? "fail" : "healthy",
            summary: input.unsupportedTasks > 0
                ? `${input.unsupportedTasks} built-in tasks still rely on unsupported tracking paths.`
                : `${input.telemetryValidatedTasks} built-in tasks are validated through canonical or telemetry-backed sources.`,
            action: input.unsupportedTasks > 0
                ? "Map each unsupported task to a canonical or telemetry-backed event before treating task coverage as complete."
                : "No action required.",
            signalCount: input.unsupportedTasks,
            signalKeys: ["tasks.unsupported", "tasks.telemetryValidated"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "tasks.integrity_and_parity",
            panelKey: "tasks.integrity_and_parity",
            tab: "tasks",
            panelTitle: "Integrity and parity",
            status: taskIntegrityStatus,
            summary: taskIntegritySignalCount > 0
                ? `${taskIntegritySignalCount} task economy or assignment signals need attention.`
                : "Task assignment, receipts, rewards, and creator spend parity are aligned in the current sample.",
            action: input.creatorSpendViolationsLast7d > 0
                ? "Inspect creator spend-source parity immediately so restricted creator actions cannot consume reward Gum Drops."
                : input.usersWithTaskIssues > 0
                    ? "Review users with task assignment issues and repair invalid reset/progress metadata."
                    : input.rewardEventDeltaLast7d !== 0 || input.legacyRewardVersionCount > 0
                        ? "Reconcile reward delta and legacy reward versions before treating task economy reporting as final."
                        : "No action required.",
            signalCount: taskIntegritySignalCount,
            signalKeys: taskIntegritySignalKeys,
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "tasks.recent_flow_rollups",
            panelKey: "tasks.recent_flow_rollups",
            tab: "tasks",
            panelTitle: "Recent task flow and rollups",
            status: input.opsHealth.materializers.some((item) => item.key === "analytics_task_rollup" && item.status !== "healthy") ? "warn" : "healthy",
            summary: "Task flow and rollup visibility are being checked against the live task materializer state.",
            action: input.opsHealth.materializers.some((item) => item.key === "analytics_task_rollup" && item.status !== "healthy")
                ? "Review the task rollup materializer because recent task flow may be drifting from canonical events."
                : "No action required.",
            signalCount: input.opsHealth.materializers.filter((item) => item.key === "analytics_task_rollup" && item.status !== "healthy").length,
            signalKeys: ["materializer.analytics_task_rollup"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "telemetry.event_coverage",
            panelKey: "telemetry.event_coverage",
            tab: "telemetry",
            panelTitle: "Event coverage",
            status: telemetryCoverageStatus,
            summary: input.orphanedTelemetryEvents > 0
                ? `${input.orphanedTelemetryEvents} orphaned telemetry events are still present in tracked coverage.`
                : `${input.trackedTelemetryEvents} tracked telemetry events are mapped cleanly in the current sample.`,
            action: input.orphanedTelemetryEvents > 0
                ? "Map or remove orphaned telemetry emitters so analytics labels and admin meanings stay trustworthy."
                : "No action required.",
            signalCount: input.orphanedTelemetryEvents,
            signalKeys: ["telemetry.orphanedEvents", "telemetry.trackedEvents"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "telemetry.normalized_orchestration_stream",
            panelKey: "telemetry.normalized_orchestration_stream",
            tab: "telemetry",
            panelTitle: "Normalized orchestration stream",
            status: input.orchestration.lowConfidenceEvents > 0 ? "warn" : "healthy",
            summary: input.orchestration.lowConfidenceEvents > 0
                ? `${input.orchestration.lowConfidenceEvents} normalized orchestration events still have low-confidence ownership.`
                : "Normalized orchestration events are translating cleanly from the current source systems.",
            action: input.orchestration.lowConfidenceEvents > 0
                ? "Review actor/session ownership on the low-confidence orchestration samples."
                : "No action required.",
            signalCount: input.orchestration.lowConfidenceEvents,
            signalKeys: ["orchestration.lowConfidenceEvents"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "telemetry.receipt_visibility",
            panelKey: "telemetry.receipt_visibility",
            tab: "telemetry",
            panelTitle: "Receipt visibility",
            status: input.completedEventsLast7d > input.receiptsLast7d ? "warn" : "healthy",
            summary: input.completedEventsLast7d > input.receiptsLast7d
                ? `${input.completedEventsLast7d - input.receiptsLast7d} completed task events are ahead of receipt visibility in the current seven-day window.`
                : "Receipt visibility matches or exceeds the recent completed-event sample.",
            action: input.completedEventsLast7d > input.receiptsLast7d
                ? "Inspect the dedupe receipt path so completed task events and receipt visibility stay aligned."
                : "No action required.",
            signalCount: Math.max(0, input.completedEventsLast7d - input.receiptsLast7d),
            signalKeys: ["tasks.completedEventsLast7d", "tasks.receiptsLast7d"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "telemetry.orphaned_telemetry",
            panelKey: "telemetry.orphaned_telemetry",
            tab: "telemetry",
            panelTitle: "Orphaned telemetry",
            status: telemetryCoverageStatus,
            summary: input.orphanedTelemetryEvents > 0
                ? "The orphaned telemetry lane is still surfacing unmapped tracked events."
                : "The orphaned telemetry lane is clear.",
            action: input.orphanedTelemetryEvents > 0
                ? "Normalize or retire the remaining orphaned tracked events."
                : "No action required.",
            signalCount: input.orphanedTelemetryEvents,
            signalKeys: ["telemetry.orphanedEvents"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "reports.bug_intake",
            panelKey: "reports.bug_intake",
            tab: "reports",
            panelTitle: "Bug intake",
            status: "healthy",
            summary: `${input.bugReportsLast7d} bug reports landed in the last seven days.`,
            action: input.bugReportsLast7d > 0
                ? "Review incoming bug reports and convert recurring issues into tracked fixes."
                : "No action required.",
            signalCount: input.bugReportsLast7d,
            signalKeys: ["reports.bugReportsLast7d"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "reports.rollout_registry",
            panelKey: "reports.rollout_registry",
            tab: "reports",
            panelTitle: "Rollout registry",
            status: input.rolloutCount > 0 && input.releaseEntryCount > 0 ? "healthy" : "warn",
            summary: `${input.rolloutCount} rollouts and ${input.releaseEntryCount} release entries are currently visible to the debug console.`,
            action: input.rolloutCount > 0 && input.releaseEntryCount > 0
                ? "No action required."
                : "Restore rollout or release tracking visibility before relying on experiment observability.",
            signalCount: input.rolloutCount + input.releaseEntryCount,
            signalKeys: ["reports.rollouts", "reports.releaseEntries"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "reports.repairs_actor_ownership",
            panelKey: "reports.repairs_actor_ownership",
            tab: "reports",
            panelTitle: "Repair proposals and actor ownership",
            status: input.orchestration.actionableProposals > 0 ? "warn" : "healthy",
            summary: input.orchestration.actionableProposals > 0
                ? `${input.orchestration.actionableProposals} repair proposals are waiting for admin review.`
                : "No actor-ownership repair actions are currently waiting on admin review.",
            action: input.orchestration.actionableProposals > 0
                ? "Review and explicitly confirm or dismiss the queued repair proposals."
                : "No action required.",
            signalCount: input.orchestration.actionableProposals,
            signalKeys: ["orchestration.actionableProposals"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "ops.pipeline_health",
            panelKey: "ops.pipeline_health",
            tab: "ops",
            panelTitle: "Pipeline health",
            status: pipelineStatus,
            summary: pipelineStatus !== "healthy"
                ? `A pipeline failure landed recently and ${input.opsHealth.pipeline.failureCount} failures remain in the loaded sample.`
                : input.opsHealth.pipeline.failureCount > 0
                    ? `${input.opsHealth.pipeline.failureCount} older pipeline failures remain in the loaded sample, but no current pipeline incident is active.`
                    : "Pipeline health is clean in the current debug window.",
            action: pipelineStatus !== "healthy"
                ? "Inspect the failing routes and clear backend pipeline errors before trusting admin snapshots as live truth."
                : input.opsHealth.pipeline.failureCount > 0
                    ? "No immediate action is required, but the older pipeline backlog remains available for historical review."
                    : "No action required.",
            signalCount: pipelineStatus === "fail"
                ? 2
                : pipelineStatus === "warn"
                    ? 1
                    : 0,
            signalKeys: ["ops.pipeline.failureCount", "ops.pipeline.lastFailureAt", "ops.pipeline.status"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "ops.diagnostics_materializers",
            panelKey: "ops.diagnostics_materializers",
            tab: "ops",
            panelTitle: "Diagnostics and materializers",
            status: diagnosticsStatus,
            summary: diagnosticsStatus === "healthy"
                ? staleDiagnosticErrorCount > 0 || staleDiagnosticWarnCount > 0
                    ? `No active diagnostics are failing the current ops window. ${staleDiagnosticErrorCount} older errors and ${staleDiagnosticWarnCount} older warnings remain in the loaded sample.`
                    : "Diagnostics channels and downstream materializers are current."
                : `${activeDiagnosticErrorCount} active errors, ${activeDiagnosticWarnCount} active warnings, ${Math.max(0, recentDiagnosticErrorCount - activeDiagnosticErrorCount)} recent non-active errors, ${Math.max(0, recentDiagnosticWarnCount - activeDiagnosticWarnCount)} recent non-active warnings, ${materializerFailures} failed materializers, and ${materializerWarnings} warned materializers are active.`,
            action: materializerFailures > 0
                ? "Repair failed materializers first, then review the attached diagnostics for the noisy channels."
                : activeDiagnosticErrorCount > 0 || activeDiagnosticWarnCount > 0 || recentDiagnosticErrorCount > 0 || recentDiagnosticWarnCount > 0 || materializerWarnings > 0
                    ? "Review the current diagnostics and warned materializers before treating admin health as fully current."
                    : staleDiagnosticErrorCount > 0 || staleDiagnosticWarnCount > 0
                        ? "No immediate action is required, but older sampled diagnostics are still available for historical review."
                        : "No action required.",
            signalCount:
                activeDiagnosticErrorCount
                + activeDiagnosticWarnCount
                + Math.max(0, recentDiagnosticErrorCount - activeDiagnosticErrorCount)
                + Math.max(0, recentDiagnosticWarnCount - activeDiagnosticWarnCount)
                + materializerFailures
                + materializerWarnings,
            signalKeys: ["ops.diagnostics", "ops.materializers", "ops.diagnostics.activeWindowMs"],
            observedAtMs: nowMs,
        }),
        routeHealthLog,
        buildRouteRuntimeClusterLog({
            id: "ops.chat_runtime_native",
            panelTitle: "Native chat runtime",
            items: nativeChatRouteHealth,
            nowMs,
        }),
        buildRouteRuntimeClusterLog({
            id: "ops.chat_runtime_compatibility",
            panelTitle: "Creator-message compatibility runtime",
            items: compatibilityChatRouteHealth,
            nowMs,
        }),
    ];
}

export async function syncAdminPanelSystemLogs(logs: AdminPanelSystemLog[]) {
    if (!adminDb || logs.length === 0) {
        return;
    }

    try {
        const refs = logs.map((log) => adminDb.collection(ADMIN_PANEL_SYSTEM_LOG_COLLECTION).doc(log.id));
        const existingSnapshots = await adminDb.getAll(...refs);
        const batch = adminDb.batch();
        let writeCount = 0;

        logs.forEach((log, index) => {
            const existing = existingSnapshots[index]?.data() as PersistedAdminPanelSystemLog | undefined;
            const unchanged = Boolean(
                existing
                && existing.status === log.status
                && existing.summary === log.summary
                && existing.action === log.action
                && toNumber(existing.signalCount) === log.signalCount
                && arraysMatch(
                    Array.isArray(existing.signalKeys) ? existing.signalKeys.filter((value): value is string => typeof value === "string") : [],
                    log.signalKeys,
                ),
            );

            const lastUpdatedAtMs = toNumber(existing?.updatedAtMs);
            if (unchanged && lastUpdatedAtMs > log.observedAtMs - PANEL_LOG_WRITE_THROTTLE_MS) {
                return;
            }

            batch.set(refs[index], {
                ...log,
                updatedAtMs: log.observedAtMs,
                firstObservedAtMs: toNumber(existing?.observedAtMs) || log.observedAtMs,
                changedAtMs: unchanged ? toNumber(existing?.changedAtMs) || log.observedAtMs : log.observedAtMs,
            }, { merge: true });
            writeCount += 1;
        });

        if (writeCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        recordRouteWarning("admin/system-logs", "Admin panel system log sync failed", error, {
            channel: "admin",
            detail: {
                logCount: logs.length,
            },
        });
    }
}
