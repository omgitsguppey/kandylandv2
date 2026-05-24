import { pathToFileURL } from "node:url";

import {
  buildEventLivenessSourceRepairReport,
  renderSimpleDoc,
  validateEventLivenessSourceRepairReport,
  writeDoc,
  writeJson,
} from "./tracking-summary-lane-cleanup-shared";

export { buildEventLivenessSourceRepairReport, validateEventLivenessSourceRepairReport };

const REPORT_PATH = "agent/state/event-liveness-source-repair.generated.json";
const DOC_PATH = "docs/agent-truth/event-liveness-source-repair.md";

export function runEventLivenessSourceRepair() {
  const report = buildEventLivenessSourceRepairReport();
  const failures = validateEventLivenessSourceRepairReport(report);
  const output = { ...report, validationFailures: failures };
  writeJson(REPORT_PATH, output);
  writeDoc(DOC_PATH, renderSimpleDoc("Event Liveness Source Repair", output));
  if (failures.length > 0) {
    console.error(`Event liveness source repair failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Event liveness source repair OK: expectedLive=${report.expectedLiveCount}, sourceMissingActionable=${report.sourceMissingActionableCount}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEventLivenessSourceRepair();
}
