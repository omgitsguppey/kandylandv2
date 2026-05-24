import {
  validateSitewideImageOptimizationCleanupReport,
  writeSitewideImageOptimizationCleanupReport,
} from "./debug-cockpit-batch12-shared";

const report = writeSitewideImageOptimizationCleanupReport();
const failures = validateSitewideImageOptimizationCleanupReport(report);

if (failures.length > 0) {
  console.error("Sitewide image optimization cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Sitewide image optimization cleanup validation passed.");
