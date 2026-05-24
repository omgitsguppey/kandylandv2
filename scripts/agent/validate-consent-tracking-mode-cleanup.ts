import { pathToFileURL } from "node:url";

import {
  buildConsentTrackingModeCleanupReport,
  renderSimpleDoc,
  validateConsentTrackingModeCleanupReport,
  writeDoc,
  writeJson,
} from "./tracking-summary-lane-cleanup-shared";

export { buildConsentTrackingModeCleanupReport, validateConsentTrackingModeCleanupReport };

const REPORT_PATH = "agent/state/consent-tracking-mode-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/consent-tracking-mode-cleanup.md";

export function runConsentTrackingModeCleanup() {
  const report = buildConsentTrackingModeCleanupReport();
  const failures = validateConsentTrackingModeCleanupReport(report);
  const output = { ...report, validationFailures: failures };
  writeJson(REPORT_PATH, output);
  writeDoc(DOC_PATH, renderSimpleDoc("Consent Tracking Mode Cleanup", output));
  if (failures.length > 0) {
    console.error(`Consent/tracking mode cleanup failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Consent/tracking mode cleanup OK: status=${report.status}, liveness=${report.eventLivenessConsentStatus}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runConsentTrackingModeCleanup();
}
