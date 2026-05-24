import {
  buildTrackingLaneFreshnessDisplayCleanupReport,
  validateTrackingLaneFreshnessDisplayCleanupReport,
  writeCleanupReport,
} from "./tracking-runtime-surface-status-cleanup-shared";

const report = buildTrackingLaneFreshnessDisplayCleanupReport();
const failures = validateTrackingLaneFreshnessDisplayCleanupReport(report);
writeCleanupReport("tracking-lane-freshness-display-cleanup", report, failures);
if (failures.length > 0) {
  console.error(`Tracking lane freshness display cleanup failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`Tracking lane freshness display cleanup OK: conflicts=${report.conflictsBefore} -> ${report.conflictsAfter}.`);
