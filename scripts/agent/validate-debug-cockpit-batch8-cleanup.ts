import {
  buildDebugCockpitBatch8CleanupReport,
  validateDebugCockpitBatch8CleanupReport,
  writeAndValidateReport,
} from "./business-truth-recovery-shared";

const report = buildDebugCockpitBatch8CleanupReport();
const failures = validateDebugCockpitBatch8CleanupReport(report);
writeAndValidateReport(
  "agent/state/debug-cockpit-batch8-cleanup.generated.json",
  "docs/agent-truth/debug-cockpit-batch8-cleanup.md",
  "Debug Cockpit Batch8 Cleanup",
  report,
  failures,
);
console.log("Debug cockpit batch8 cleanup validation passed");
