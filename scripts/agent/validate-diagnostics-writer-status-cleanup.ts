import {
  validateDiagnosticsWriterStatusCleanupReport,
  writeDiagnosticsWriterStatusCleanupReport,
} from "./debug-cockpit-batch15-shared";

const report = writeDiagnosticsWriterStatusCleanupReport();
const failures = validateDiagnosticsWriterStatusCleanupReport(report);

if (failures.length > 0) {
  console.error("Diagnostics/writer status cleanup validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Diagnostics/writer cleanup OK: diagnostics=${report.diagnosticsLaneStatusAfter}, writers=${report.downstreamWriterStatusAfter}.`);
