import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export { buildManualQaReadinessGateReport, validateManualQaReadinessGateReport } from "../../src/lib/release-readiness/manual-qa-readiness-gate";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("manual-qa-readiness-gate");
}
