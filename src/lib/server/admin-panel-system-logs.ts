import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import type { AdminOpsHealth } from "@/lib/admin-ops-health";
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
}) {
    const nowMs = input.nowMs ?? Date.now();
    const materializerFailures = input.opsHealth.materializers.filter((item) => item.status === "fail").length;
    const materializerWarnings = input.opsHealth.materializers.filter((item) => item.status === "warn").length;
    const runtimeWarningCount = input.opsHealth.runtime.warnings.length;

    const behaviorOrchestrationStatus: AdminPanelSystemLogStatus =
        input.orchestration.openFindings > 0 || input.orchestration.actionableProposals > 0
            ? input.orchestration.score >= 80 ? "warn" : "fail"
            : input.orchestration.lowConfidenceEvents > 0
                ? "warn"
                : "healthy";

    const taskIntegritySignalCount =
        input.usersWithTaskIssues
        + Math.max(0, input.rewardEventDeltaLast7d)
        + input.creatorSpendViolationsLast7d
        + input.legacyRewardVersionCount;
    const taskIntegrityStatus: AdminPanelSystemLogStatus =
        input.creatorSpendViolationsLast7d > 0 || input.usersWithTaskIssues > 0
            ? "fail"
            : input.rewardEventDeltaLast7d !== 0 || input.legacyRewardVersionCount > 0
                ? "warn"
                : "healthy";
    const telemetryCoverageStatus: AdminPanelSystemLogStatus =
        input.orphanedTelemetryEvents > 0 ? "warn" : "healthy";
    const pipelineStatus: AdminPanelSystemLogStatus =
        input.opsHealth.pipeline.failureCount > 0
            ? input.opsHealth.pipeline.failureCount > 10 ? "fail" : "warn"
            : "healthy";
    const diagnosticsStatus: AdminPanelSystemLogStatus =
        materializerFailures > 0 || input.opsHealth.diagnostics.errorCount > 0
            ? "fail"
            : materializerWarnings > 0 || input.opsHealth.diagnostics.warnCount > 0 || runtimeWarningCount > 0
                ? "warn"
                : "healthy";

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
            action: input.orchestration.openFindings > 0 || input.orchestration.actionableProposals > 0
                ? "Review the open orchestration findings and confirm or dismiss the queued repairs."
                : input.orchestration.lowConfidenceEvents > 0
                    ? "Tighten event ownership for the low-confidence orchestration samples before expanding automation."
                    : "No action required.",
            signalCount: input.orchestration.openFindings + input.orchestration.actionableProposals + input.orchestration.lowConfidenceEvents,
            signalKeys: ["orchestration.openFindings", "orchestration.actionableProposals", "orchestration.lowConfidenceEvents"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "overview.simulation_tools",
            panelKey: "overview.simulation_tools",
            tab: "overview",
            panelTitle: "Simulation tools",
            status: "healthy",
            summary: "Admin-side simulation tools remain available for controlled balance and webhook checks.",
            action: "Use only for controlled verification; no parity issue is currently blocking this lane.",
            signalCount: 0,
            signalKeys: ["simulation_tools.available"],
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
                : "Runtime/session inputs are aligned for the current admin console.",
            action: buildRuntimeAction(input.opsHealth),
            signalCount: runtimeWarningCount,
            signalKeys: ["runtime.warnings", "runtime.gaPropertyConfigured", "runtime.navigationSessionSigningReady"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "overview.recent_transactions",
            panelKey: "overview.recent_transactions",
            tab: "overview",
            panelTitle: "Recent transactions",
            status: input.recentTransactionsCount > 0 ? "healthy" : "warn",
            summary: input.recentTransactionsCount > 0
                ? `${input.recentTransactionsCount} recent transactions are available for inline review.`
                : "No recent transaction entries were available in the sampled admin feed.",
            action: input.recentTransactionsCount > 0
                ? "No action required."
                : "Verify the overview transaction feed is still subscribed and not masked by stale runtime state.",
            signalCount: input.recentTransactionsCount,
            signalKeys: ["overview.recentTransactions"],
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
            signalKeys: ["tasks.usersWithIssues", "tasks.rewardDelta", "tasks.legacyRewardVersionCount", "tasks.creatorSpendViolations"],
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
            summary: input.opsHealth.pipeline.failureCount > 0
                ? `${input.opsHealth.pipeline.failureCount} backend pipeline failures are recorded in the current debug window.`
                : "Pipeline health is clean in the current debug window.",
            action: input.opsHealth.pipeline.failureCount > 0
                ? "Inspect the failing routes and clear backend pipeline errors before trusting admin snapshots as live truth."
                : "No action required.",
            signalCount: input.opsHealth.pipeline.failureCount,
            signalKeys: ["ops.pipeline.failureCount"],
            observedAtMs: nowMs,
        }),
        buildLog({
            id: "ops.diagnostics_materializers",
            panelKey: "ops.diagnostics_materializers",
            tab: "ops",
            panelTitle: "Diagnostics and materializers",
            status: diagnosticsStatus,
            summary: diagnosticsStatus === "healthy"
                ? "Diagnostics channels and downstream materializers are current."
                : `${input.opsHealth.diagnostics.errorCount} errors, ${input.opsHealth.diagnostics.warnCount} warnings, ${materializerFailures} failed materializers, and ${materializerWarnings} warned materializers are active.`,
            action: materializerFailures > 0
                ? "Repair failed materializers first, then review the attached diagnostics for the noisy channels."
                : input.opsHealth.diagnostics.errorCount > 0 || input.opsHealth.diagnostics.warnCount > 0 || materializerWarnings > 0
                    ? "Review the latest diagnostics and warned materializers to prevent stale admin fallbacks."
                    : "No action required.",
            signalCount: input.opsHealth.diagnostics.errorCount + input.opsHealth.diagnostics.warnCount + materializerFailures + materializerWarnings,
            signalKeys: ["ops.diagnostics", "ops.materializers"],
            observedAtMs: nowMs,
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
