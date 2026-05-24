import { writeDebugCockpitBatch11CleanupReport } from "./debug-cockpit-batch11-shared";

const failures = writeDebugCockpitBatch11CleanupReport();
if (failures.length > 0) {
  console.error("Debug cockpit Batch 11 cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Debug cockpit Batch 11 cleanup validation passed.");
