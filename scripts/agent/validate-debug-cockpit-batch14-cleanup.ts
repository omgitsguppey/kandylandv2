import {
  validateDebugCockpitBatch14CleanupReport,
  writeDebugCockpitBatch14CleanupReport,
} from "./debug-cockpit-batch14-shared";

const report = writeDebugCockpitBatch14CleanupReport();
const failures = validateDebugCockpitBatch14CleanupReport(report);

if (failures.length > 0) {
  console.error("Debug Cockpit Batch 14 cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Debug Cockpit Batch 14 cleanup OK: ${report.recommendedActionsBefore} -> ${report.recommendedActionsAfter} actions.`);
