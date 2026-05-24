import { buildRouteLatencyValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch18-shared";

const REPORT_PATH = "agent/state/route-latency-review-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/route-latency-review-cleanup.md";

export function validateRouteLatencyReviewCleanup() {
  const report = buildRouteLatencyValidationReport();
  if (report.validationFailures.length > 0) {
    throw new Error(`Route latency review cleanup validation failed:\n- ${report.validationFailures.join("\n- ")}`);
  }
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Route Latency Review Cleanup",
    "",
    `Current slow routes: ${report.currentSlowRoutes.join(", ") || "none"}`,
    `Historical slow review routes: ${report.historicalSlowReviewRoutes.join(", ") || "none"}`,
    `Total slow samples: ${report.totalSlowSamples}`,
    "",
    "Historical slow samples stay visible as latency review without becoming correctness failures.",
  ]);
  return report;
}

if (require.main === module) {
  const report = validateRouteLatencyReviewCleanup();
  console.log(`Route latency review cleanup passed: current slow=${report.currentSlowRoutes.length}.`);
}
