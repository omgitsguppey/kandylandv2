import { pathToFileURL } from "node:url";

import {
  buildBehaviorMathStatusCleanupReport,
  renderSimpleDoc,
  validateBehaviorMathStatusCleanupReport,
  writeDoc,
  writeJson,
} from "./tracking-summary-lane-cleanup-shared";

export { buildBehaviorMathStatusCleanupReport, validateBehaviorMathStatusCleanupReport };

const REPORT_PATH = "agent/state/behavior-math-status-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/behavior-math-status-cleanup.md";

export function runBehaviorMathStatusCleanup() {
  const report = buildBehaviorMathStatusCleanupReport();
  const failures = validateBehaviorMathStatusCleanupReport(report);
  const output = { ...report, validationFailures: failures };
  writeJson(REPORT_PATH, output);
  writeDoc(DOC_PATH, renderSimpleDoc("Behavior Math Status Cleanup", output));
  if (failures.length > 0) {
    console.error(`Behavior math status cleanup failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Behavior math status cleanup OK: status=${report.status}, display=${report.displayState}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBehaviorMathStatusCleanup();
}
