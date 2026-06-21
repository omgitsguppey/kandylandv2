import {
  buildControlTowerOperatorQueueCleanupReport,
  validateControlTowerOperatorQueueCleanupReport,
  writeAndValidateReport,
} from "./control-tower-cleanup-shared";

const report = buildControlTowerOperatorQueueCleanupReport({
  scoreImpactQueue: [
    { artifact: "runtime_provider_smoke", scoreImpactEstimate: 16, staleReason: "Runtime unverified", refreshCommand: "Produce provider-backed site activity evidence", canRunAutomatically: false },
    { artifact: "debug_runtime_evidence", scoreImpactEstimate: 16, staleReason: "Runtime unverified", refreshCommand: "Produce deployed route activity evidence", canRunAutomatically: false },
    { artifact: "agent/state/score-80-path-lock.generated.json", scoreImpactEstimate: 8, staleReason: "superseded", refreshCommand: "npm run check:beta-score", canRunAutomatically: true },
    { artifact: "cost-owner-review", scoreImpactEstimate: 0, staleReason: "score impact: 0", refreshCommand: "npm run check:google-cost", canRunAutomatically: false },
  ],
  aiCriticFindings: [{ title: "Stale debug logic is still active", requiredFix: "Refresh/formal/operator confirmation work; no source changes requested." }],
  recoveryPlaybooks: [{ id: "stale_artifact_recovery", title: "Stale artifact recovery" }],
  telemetryStatus: "clean_current",
  adminTruthStatus: "source_ready_formal_sample_required",
});
const failures = validateControlTowerOperatorQueueCleanupReport(report);

try {
  writeAndValidateReport(
    "agent/state/control-tower-operator-queue-cleanup.generated.json",
    "docs/agent-truth/control-tower-operator-queue-cleanup.md",
    "Control Tower Operator Queue Cleanup",
    report,
    failures,
  );
  console.log("Control Tower operator queue cleanup passed");
} catch (error) {
  console.error("Control Tower operator queue cleanup validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
