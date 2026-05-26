import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export { buildCostLieDetectorReport, validateCostLieDetectorReport } from "../../src/lib/release-readiness/cost-lie-detector";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("cost-lie-detector");
}
