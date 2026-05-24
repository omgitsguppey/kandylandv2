import {
  validateDebugEvidencePrecatcherRefreshReport,
  writeDebugEvidencePrecatcherRefreshReport,
} from "./debug-cockpit-batch12-shared";

const report = writeDebugEvidencePrecatcherRefreshReport();
const failures = validateDebugEvidencePrecatcherRefreshReport(report);

if (failures.length > 0) {
  console.error("Debug evidence pre-catcher refresh validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Debug evidence pre-catcher refresh validation passed.");
