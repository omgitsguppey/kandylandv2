import { buildBatch18ValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch18-shared";

const REPORT_PATH = "agent/state/debug-cockpit-batch18-route-hotspots.generated.json";
const DOC_PATH = "docs/agent-truth/debug-cockpit-batch18-route-hotspots.md";

export function validateDebugCockpitBatch18RouteHotspots() {
  const report = buildBatch18ValidationReport();
  if (report.validationFailures.length > 0) {
    throw new Error(`Debug cockpit Batch 18 route hotspots validation failed:\n- ${report.validationFailures.join("\n- ")}`);
  }
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Debug Cockpit Batch 18 Route Hotspots",
    "",
    `Ingest identified: ${report.ingestIdentifiedStatusBefore} -> ${report.ingestIdentifiedStatusAfter}`,
    `Wallet packages: ${report.walletPackagesStatusBefore} -> ${report.walletPackagesStatusAfter}`,
    `Current server failures: ${report.currentServerFailuresBefore} -> ${report.currentServerFailuresAfter}`,
    `Current client errors: ${report.currentClientErrorsBefore} -> ${report.currentClientErrorsAfter}`,
    `Current slow routes: ${report.currentSlowRoutes.join(", ") || "none"}`,
    `Historical latency review: ${report.historicalSlowReviewRoutes.join(", ") || "none"}`,
    "",
    "## Targeted Fixes",
    ...report.targetedFixesApplied.map((item) => `- ${item}`),
    "",
    "## Remaining Gaps",
    ...report.remainingGaps.map((item) => `- ${item}`),
  ]);
  return report;
}

if (require.main === module) {
  const report = validateDebugCockpitBatch18RouteHotspots();
  console.log(`Debug cockpit Batch 18 route hotspots passed: failures ${report.currentServerFailuresBefore}->${report.currentServerFailuresAfter}.`);
}
