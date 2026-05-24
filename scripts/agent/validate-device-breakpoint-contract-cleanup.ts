import { writeDeviceBreakpointContractCleanupReport } from "./debug-cockpit-batch11-shared";

const failures = writeDeviceBreakpointContractCleanupReport();
if (failures.length > 0) {
  console.error("Device breakpoint contract cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Device breakpoint contract cleanup validation passed.");
