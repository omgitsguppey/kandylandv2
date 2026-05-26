import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildCurrentHeadReleaseReconciliationReport,
  validateCurrentHeadReleaseReconciliationReport,
} from "../../src/lib/release-readiness/current-head-reconciliation";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("current-head-release-reconciliation");
}
