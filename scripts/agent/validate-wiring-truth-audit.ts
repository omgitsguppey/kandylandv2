import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export { buildWiringTruthAuditReport, validateWiringTruthAuditReport } from "../../src/lib/release-readiness/wiring-truth-auditor";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("wiring-truth-audit");
}
