import {
  validateDebugCockpitBatch15FalsePositiveCleanupReport,
  writeDebugCockpitBatch15FalsePositiveCleanupReport,
} from "./debug-cockpit-batch15-shared";

const report = writeDebugCockpitBatch15FalsePositiveCleanupReport();
const failures = validateDebugCockpitBatch15FalsePositiveCleanupReport(report);

if (failures.length > 0) {
  console.error("Debug Cockpit Batch 15 false-positive cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Debug Cockpit Batch 15 cleanup OK: false-positive LIVE ${report.falsePositiveLiveBefore} -> ${report.falsePositiveLiveAfter}.`);
