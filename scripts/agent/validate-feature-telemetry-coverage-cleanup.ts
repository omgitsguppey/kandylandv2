import { pathToFileURL } from "node:url";

import {
  buildFeatureTelemetryCoverageCleanupReport,
  renderSimpleDoc,
  validateFeatureTelemetryCoverageCleanupReport,
  writeDoc,
  writeJson,
} from "./tracking-summary-lane-cleanup-shared";

export { buildFeatureTelemetryCoverageCleanupReport, validateFeatureTelemetryCoverageCleanupReport };

const REPORT_PATH = "agent/state/feature-telemetry-coverage-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/feature-telemetry-coverage-cleanup.md";

export function runFeatureTelemetryCoverageCleanup() {
  const report = buildFeatureTelemetryCoverageCleanupReport();
  const failures = validateFeatureTelemetryCoverageCleanupReport(report);
  const output = { ...report, validationFailures: failures };
  writeJson(REPORT_PATH, output);
  writeDoc(DOC_PATH, renderSimpleDoc("Feature Telemetry Coverage Cleanup", output));
  if (failures.length > 0) {
    console.error(`Feature telemetry coverage cleanup failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Feature telemetry coverage cleanup OK: status=${report.featureCoverageStatus}, missing=${report.missingItems.length}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFeatureTelemetryCoverageCleanup();
}
