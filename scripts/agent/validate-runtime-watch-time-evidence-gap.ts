import {
  validateRuntimeWatchTimeEvidenceGapReport,
  writeRuntimeWatchTimeEvidenceGapReport,
} from "./debug-cockpit-batch13-shared";

const report = writeRuntimeWatchTimeEvidenceGapReport();
const failures = validateRuntimeWatchTimeEvidenceGapReport(report);

if (failures.length > 0) {
  console.error("Runtime watch-time evidence gap validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Runtime watch-time evidence gap OK: ${report.runtimeWatchStatusAfter}.`);
