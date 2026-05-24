import { pathToFileURL } from "node:url";

import {
  buildLegacyRecoveryStatusCleanupReport,
  renderSimpleDoc,
  validateLegacyRecoveryStatusCleanupReport,
  writeDoc,
  writeJson,
} from "./tracking-summary-lane-cleanup-shared";

export { buildLegacyRecoveryStatusCleanupReport, validateLegacyRecoveryStatusCleanupReport };

const REPORT_PATH = "agent/state/legacy-recovery-status-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/legacy-recovery-status-cleanup.md";

export function runLegacyRecoveryStatusCleanup() {
  const report = buildLegacyRecoveryStatusCleanupReport();
  const failures = validateLegacyRecoveryStatusCleanupReport(report);
  const output = { ...report, validationFailures: failures };
  writeJson(REPORT_PATH, output);
  writeDoc(DOC_PATH, renderSimpleDoc("Legacy Recovery Status Cleanup", output));
  if (failures.length > 0) {
    console.error(`Legacy recovery status cleanup failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`Legacy recovery status cleanup OK: status=${report.status}, dryRun=${String(report.dryRunMutationProtection)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLegacyRecoveryStatusCleanup();
}
