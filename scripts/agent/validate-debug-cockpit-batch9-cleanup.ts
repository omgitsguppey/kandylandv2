import { writeDebugCockpitBatch9Report } from "./debug-cockpit-batch9-shared";

const failures = writeDebugCockpitBatch9Report();

if (failures.length > 0) {
  console.error("Debug cockpit batch9 cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Debug cockpit batch9 cleanup validation passed.");
