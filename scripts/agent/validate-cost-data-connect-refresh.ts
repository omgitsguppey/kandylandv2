import {
  validateCostDataConnectRefreshReport,
  writeCostDataConnectRefreshReport,
} from "./debug-cockpit-batch13-shared";

const report = writeCostDataConnectRefreshReport();
const failures = validateCostDataConnectRefreshReport(report);

if (failures.length > 0) {
  console.error("Cost/Data Connect refresh validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Cost/Data Connect refresh OK: Google ${report.googleCostAgeAfter}h, Cloud ${report.cloudCostAgeAfter}h, Data Connect ${report.dataConnectMirrorStatusAfter}.`);
