import { buildAnalyticsIngestIdentifiedValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch18-shared";

const REPORT_PATH = "agent/state/analytics-ingest-identified-repair.generated.json";
const DOC_PATH = "docs/agent-truth/analytics-ingest-identified-repair.md";

export function validateAnalyticsIngestIdentifiedRepair() {
  const report = buildAnalyticsIngestIdentifiedValidationReport();
  if (report.validationFailures.length > 0) {
    throw new Error(`Analytics ingest identified repair validation failed:\n- ${report.validationFailures.join("\n- ")}`);
  }
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Analytics Ingest Identified Repair",
    "",
    `Status: ${report.statusAfter}`,
    `Failure class: ${report.failureClass}`,
    `Retryable status: ${report.retryableStatus}`,
    `Compatibility mode: ${report.compatibilityMode}`,
    "",
    "Expected invalid payloads now use typed non-retryable client responses, while deferred materializer/timeline failures are recorded as warning diagnostics after event fact persistence.",
  ]);
  return report;
}

if (require.main === module) {
  const report = validateAnalyticsIngestIdentifiedRepair();
  console.log(`Analytics ingest identified repair passed: ${report.statusBefore} -> ${report.statusAfter}.`);
}
