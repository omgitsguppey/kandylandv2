import { writeViewerEntitlementHardeningReport } from "./debug-cockpit-batch10-shared";

const failures = writeViewerEntitlementHardeningReport();
if (failures.length > 0) {
  console.error("Viewer entitlement hardening validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Viewer entitlement hardening validation passed.");
