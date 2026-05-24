import {
  validateDebugCockpitBatch13CleanupReport,
  writeDebugCockpitBatch13CleanupReport,
} from "./debug-cockpit-batch13-shared";

const report = writeDebugCockpitBatch13CleanupReport();
const failures = validateDebugCockpitBatch13CleanupReport(report);

if (failures.length > 0) {
  console.error("Debug Cockpit Batch 13 cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Debug Cockpit Batch 13 cleanup OK: score ${report.scoreBefore} -> ${report.scoreAfter}.`);
