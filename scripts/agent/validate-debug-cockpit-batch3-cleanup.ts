import {
  buildDebugCockpitBatch3CleanupReport,
  validateDebugCockpitBatch3CleanupReport,
  writeCleanupReport,
} from "./tracking-runtime-surface-status-cleanup-shared";

const report = buildDebugCockpitBatch3CleanupReport();
const failures = validateDebugCockpitBatch3CleanupReport(report);
writeCleanupReport("debug-cockpit-batch3-cleanup", report, failures);
if (failures.length > 0) {
  console.error(`Debug cockpit Batch 3 cleanup failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`Debug cockpit Batch 3 cleanup OK: emptyLive=${report.emptyLiveLanesBefore} -> ${report.emptyLiveLanesAfter}; stale=${report.staleBadgeConflictsBefore} -> ${report.staleBadgeConflictsAfter}.`);
