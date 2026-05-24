import {
  validateOrphanedLogicRefreshReport,
  writeOrphanedLogicRefreshReport,
} from "./debug-cockpit-batch14-shared";

const report = writeOrphanedLogicRefreshReport();
const failures = validateOrphanedLogicRefreshReport(report);

if (failures.length > 0) {
  console.error("Orphaned logic refresh validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Orphaned logic refresh OK: ${report.statusBefore} -> ${report.statusAfter}.`);
