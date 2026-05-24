import {
  validateNoSampleStatusClassifierReport,
  writeNoSampleStatusClassifierReport,
} from "./debug-cockpit-batch15-shared";

const report = writeNoSampleStatusClassifierReport();
const failures = validateNoSampleStatusClassifierReport(report);

if (failures.length > 0) {
  console.error("No-sample status classifier validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`No-sample status classifier OK: ${report.diagnosticsNoSampleStatus}, ${report.panelNoSampleStatus}.`);
