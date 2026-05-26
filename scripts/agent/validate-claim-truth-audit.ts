import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export { buildClaimTruthAuditReport, validateClaimTruthAuditReport } from "../../src/lib/release-readiness/claim-truth-auditor";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("claim-truth-audit");
}
