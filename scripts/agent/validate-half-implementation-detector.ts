import { fileURLToPath } from "node:url";

import { runTruthReconciliationReport } from "./truth-reconciliation-report-runner";

export { buildHalfImplementationDetectorReport, validateHalfImplementationDetectorReport } from "../../src/lib/release-readiness/half-implementation-detector";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runTruthReconciliationReport("half-implementation-detector");
}
