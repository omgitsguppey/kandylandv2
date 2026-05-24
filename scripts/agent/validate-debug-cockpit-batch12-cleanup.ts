import {
  validateDebugCockpitBatch12CleanupReport,
  writeDebugCockpitBatch12CleanupReport,
} from "./debug-cockpit-batch12-shared";

const report = writeDebugCockpitBatch12CleanupReport();
const failures = validateDebugCockpitBatch12CleanupReport(report);

if (failures.length > 0) {
  console.error("Debug cockpit Batch 12 cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Debug cockpit Batch 12 cleanup validation passed.");
