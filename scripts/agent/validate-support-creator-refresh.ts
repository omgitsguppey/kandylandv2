import {
  validateSupportCreatorRefreshReport,
  writeSupportCreatorRefreshReport,
} from "./debug-cockpit-batch13-shared";

const report = writeSupportCreatorRefreshReport();
const failures = validateSupportCreatorRefreshReport(report);

if (failures.length > 0) {
  console.error("Support/creator refresh validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Support/creator refresh OK: support=${report.supportPolicyStatus}, creator=${report.creatorLaneStatus}.`);
