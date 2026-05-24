import {
  validateBatch12ReadinessRefreshReport,
  writeBatch12ReadinessRefreshReport,
} from "./debug-cockpit-batch12-shared";

const report = writeBatch12ReadinessRefreshReport();
const failures = validateBatch12ReadinessRefreshReport(report);

if (failures.length > 0) {
  console.error("Batch 12 readiness refresh validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Batch 12 readiness refresh validation passed.");
