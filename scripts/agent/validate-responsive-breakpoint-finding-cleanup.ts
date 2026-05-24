import { writeResponsiveBreakpointFindingCleanupReport } from "./debug-cockpit-batch11-shared";

const failures = writeResponsiveBreakpointFindingCleanupReport();
if (failures.length > 0) {
  console.error("Responsive breakpoint finding cleanup validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Responsive breakpoint finding cleanup validation passed.");
