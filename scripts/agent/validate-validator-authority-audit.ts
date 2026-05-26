import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export { buildValidatorAuthorityAuditReport, validateValidatorAuthorityAuditReport } from "../../src/lib/release-readiness/validator-authority-auditor";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("validator-authority-audit");
}
