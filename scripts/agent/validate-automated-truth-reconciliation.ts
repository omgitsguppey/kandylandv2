import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export {
  buildAutomatedTruthReconciliationReport,
  validateAutomatedTruthReconciliationReport,
} from "../../src/lib/release-readiness/automated-truth-reconciliation";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("automated-truth-reconciliation");
}
