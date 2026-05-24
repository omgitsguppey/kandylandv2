import {
  validateSystemHealthMaterializerCleanupReport,
  writeSystemHealthMaterializerCleanupReport,
} from "./debug-cockpit-batch14-shared";

const report = writeSystemHealthMaterializerCleanupReport();
const failures = validateSystemHealthMaterializerCleanupReport(report);

if (failures.length > 0) {
  console.error("System health materializer cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`System health materializer cleanup OK: ${report.systemHealthScoreStatusAfter}.`);
