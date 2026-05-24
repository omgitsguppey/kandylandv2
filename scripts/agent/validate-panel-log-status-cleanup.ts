import {
  validatePanelLogStatusCleanupReport,
  writePanelLogStatusCleanupReport,
} from "./debug-cockpit-batch15-shared";

const report = writePanelLogStatusCleanupReport();
const failures = validatePanelLogStatusCleanupReport(report);

if (failures.length > 0) {
  console.error("Panel log status cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Panel log cleanup OK: ${report.panelStatusAfter}.`);
