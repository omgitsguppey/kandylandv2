import { pathToFileURL } from "node:url";

import {
  buildTrackingSummaryLaneCleanupReport,
  renderSimpleDoc,
  validateTrackingSummaryLaneCleanupReport,
  writeDoc,
  writeJson,
} from "./tracking-summary-lane-cleanup-shared";

export { buildTrackingSummaryLaneCleanupReport, validateTrackingSummaryLaneCleanupReport };

const REPORT_PATH = "agent/state/tracking-summary-lane-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/tracking-summary-lane-cleanup.md";

export function runTrackingSummaryLaneCleanup() {
  const report = buildTrackingSummaryLaneCleanupReport();
  const failures = validateTrackingSummaryLaneCleanupReport(report);
  const output = { ...report, validationFailures: failures };
  writeJson(REPORT_PATH, output);
  writeDoc(DOC_PATH, renderSimpleDoc("Tracking Summary Lane Cleanup", output));
  if (failures.length > 0) {
    console.error(`Tracking summary lane cleanup failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Tracking summary lane cleanup OK: lanes=${report.lanesAfter}, p1=${report.p1After}, p2=${report.p2After}, liveness=${report.eventLivenessSourceMissingAfter}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTrackingSummaryLaneCleanup();
}
