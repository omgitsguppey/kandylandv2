import { writeDebugCockpitBatch10Report } from "./debug-cockpit-batch10-shared";

const failures = writeDebugCockpitBatch10Report();
if (failures.length > 0) {
  console.error("Debug cockpit Batch 10 cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Debug cockpit Batch 10 cleanup validation passed.");
