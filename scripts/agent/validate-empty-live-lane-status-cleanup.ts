import {
  buildEmptyLiveLaneStatusCleanupReport,
  validateEmptyLiveLaneStatusCleanupReport,
  writeCleanupReport,
} from "./tracking-runtime-surface-status-cleanup-shared";

const report = buildEmptyLiveLaneStatusCleanupReport();
const failures = validateEmptyLiveLaneStatusCleanupReport(report);
writeCleanupReport("empty-live-lane-status-cleanup", report, failures);
if (failures.length > 0) {
  console.error(`Empty live lane status cleanup failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`Empty live lane status cleanup OK: emptyLive=${report.emptyLiveLanesBefore} -> ${report.emptyLiveLanesAfter}.`);
