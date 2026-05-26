import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export { buildScoreTruthAuditReport, validateScoreTruthAuditReport } from "../../src/lib/release-readiness/score-truth-auditor";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("score-truth-audit");
}
