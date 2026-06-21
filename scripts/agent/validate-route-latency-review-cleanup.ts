import { buildRouteLatencyValidationReport, writeJson } from "./debug-cockpit-batch18-shared";

const REPORT_PATH = "agent/state/route-latency-review-cleanup.generated.json";

export function validateRouteLatencyReviewCleanup() {
  const report = buildRouteLatencyValidationReport();
  if (report.validationFailures.length > 0) {
    throw new Error(`Route latency review cleanup validation failed:\n- ${report.validationFailures.join("\n- ")}`);
  }
  writeJson(REPORT_PATH, report);
  return report;
}

if (require.main === module) {
  const report = validateRouteLatencyReviewCleanup();
  console.log(`Route latency review cleanup passed: current slow=${report.currentSlowRoutes.length}.`);
}
