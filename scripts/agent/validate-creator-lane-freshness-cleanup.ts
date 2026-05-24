import {
  validateCreatorLaneFreshnessCleanupReport,
  writeCreatorLaneFreshnessCleanupReport,
} from "./debug-cockpit-batch14-shared";

const report = writeCreatorLaneFreshnessCleanupReport();
const failures = validateCreatorLaneFreshnessCleanupReport(report);

if (failures.length > 0) {
  console.error("Creator lane freshness cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Creator lane freshness cleanup OK: ${report.creatorLaneFreshnessAfter}.`);
