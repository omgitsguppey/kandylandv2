import {
  validateDataConnectMirrorStatusReport,
  writeDataConnectMirrorStatusReport,
} from "./debug-cockpit-batch13-shared";

const report = writeDataConnectMirrorStatusReport();
const failures = validateDataConnectMirrorStatusReport(report);

if (failures.length > 0) {
  console.error("Data Connect mirror status validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Data Connect mirror status OK: ${report.status}.`);
