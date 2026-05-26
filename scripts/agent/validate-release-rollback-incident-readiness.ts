import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildReleaseRollbackIncidentReadinessReport,
  validateReleaseRollbackIncidentReadinessReport,
} from "../../src/lib/release-readiness/release-rollback-contract";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("release-rollback-incident-readiness");
}
