import { buildAdminDebugSystemHealthNowModel } from "../../src/lib/admin-debug-summary-cards";

export function collectAdminDebugControlTowerSystemHealthContractFailures({
  nowMs,
}: {
  nowMs: number;
}): string[] {
  const failures: string[] = [];

  const aggregateOnlyHealth = buildAdminDebugSystemHealthNowModel({
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
    lastPipelineFailureAt: nowMs - 21 * 60 * 1000,
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
  if (!String(aggregateOnlyHealth.routeFailures.emptyDetail).includes("No active route failures in current sample")) {
    failures.push("Summary route failure count must explain an aggregate/sample-window mismatch when per-route failures are empty.");
  }
  if (aggregateOnlyHealth.writers.summaryValue === "0/0") {
    failures.push("Writers summary must not say 0/0 while tracked writers exist.");
  }
  if (aggregateOnlyHealth.writers.summaryValue !== "10/10") {
    failures.push("Writers summary must show healthy/total tracked writers when all materializers are live.");
  }
  if (aggregateOnlyHealth.score.penaltyCount === 0) {
    failures.push("Health status ERROR/DEGRADED states must expose score penalty reasons.");
  }

  const diagnosticClusterHealth = buildAdminDebugSystemHealthNowModel({
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
  if (diagnosticClusterHealth.diagnostics.clusterCount > 0 && diagnosticClusterHealth.diagnostics.clusters.length === 0) {
    failures.push("Diagnostics count exists but clusters are not surfaced.");
  }

  return failures;
}
