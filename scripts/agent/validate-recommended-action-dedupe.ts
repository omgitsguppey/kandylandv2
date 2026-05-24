import {
  validateRecommendedActionDedupeReport,
  writeRecommendedActionDedupeReport,
} from "./debug-cockpit-batch14-shared";

const report = writeRecommendedActionDedupeReport();
const failures = validateRecommendedActionDedupeReport(report);

if (failures.length > 0) {
  console.error("Recommended action dedupe validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Recommended action dedupe OK: ${report.duplicateActionsCollapsed} duplicate actions collapsed.`);
