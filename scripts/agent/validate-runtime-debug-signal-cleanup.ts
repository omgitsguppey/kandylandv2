import { pathToFileURL } from "node:url";

import {
  buildRuntimeDebugSignalCleanupReport,
  renderSimpleDoc,
  validateRuntimeDebugSignalCleanupReport,
  writeDoc,
  writeJson,
} from "./tracking-summary-lane-cleanup-shared";

export { buildRuntimeDebugSignalCleanupReport, validateRuntimeDebugSignalCleanupReport };

const REPORT_PATH = "agent/state/runtime-debug-signal-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/runtime-debug-signal-cleanup.md";

export function runRuntimeDebugSignalCleanup() {
  const report = buildRuntimeDebugSignalCleanupReport();
  const failures = validateRuntimeDebugSignalCleanupReport(report);
  const output = { ...report, validationFailures: failures };
  writeJson(REPORT_PATH, output);
  writeDoc(DOC_PATH, renderSimpleDoc("Runtime Debug Signal Cleanup", output));
  if (failures.length > 0) {
    console.error(`Runtime/debug signal cleanup failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Runtime/debug signal cleanup OK: failedGroups=${report.failedGroupCount}, warningGroups=${report.warningGroupCount}, rawWarnings=${report.rawWarningCount}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRuntimeDebugSignalCleanup();
}
