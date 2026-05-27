import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildLiveEvidenceGateReplacementReport,
  validateLiveEvidenceGateReplacementReport,
} from "../../src/lib/release-readiness/live-evidence-resolver";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("live-evidence-gate-replacement");
}
