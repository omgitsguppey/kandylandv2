import { buildRouteErrorHistoryValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch18-shared";

const REPORT_PATH = "agent/state/route-error-history-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/route-error-history-cleanup.md";

export function validateRouteErrorHistoryCleanup() {
  const report = buildRouteErrorHistoryValidationReport();
  if (report.validationFailures.length > 0) {
    throw new Error(`Route error history cleanup validation failed:\n- ${report.validationFailures.join("\n- ")}`);
  }
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Route Error History Cleanup",
    "",
    `Current server failures: ${report.currentServerFailures.join(", ") || "none"}`,
    `Current client errors: ${report.currentClientErrors.join(", ") || "none"}`,
    `Historical error routes: ${report.historicalErrorRoutes.join(", ") || "none"}`,
    "",
    "Current success with old error counters is resolved history, not a current route failure.",
  ]);
  return report;
}

if (require.main === module) {
  const report = validateRouteErrorHistoryCleanup();
  console.log(`Route error history cleanup passed: current failures=${report.currentServerFailures.length}.`);
}
