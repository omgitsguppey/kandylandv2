import {
  buildDebugCockpitBatch7ControlTowerCleanupReport,
  validateDebugCockpitBatch7ControlTowerCleanupReport,
  writeAndValidateReport,
} from "./control-tower-cleanup-shared";

const report = buildDebugCockpitBatch7ControlTowerCleanupReport();
const failures = validateDebugCockpitBatch7ControlTowerCleanupReport(report);

try {
  writeAndValidateReport(
    "agent/state/debug-cockpit-batch7-control-tower-cleanup.generated.json",
    "docs/agent-truth/debug-cockpit-batch7-control-tower-cleanup.md",
    "Debug Cockpit Batch7 Control Tower Cleanup",
    report,
    failures,
  );
  console.log("Debug cockpit batch7 Control Tower cleanup passed");
} catch (error) {
  console.error("Debug cockpit batch7 Control Tower cleanup validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
