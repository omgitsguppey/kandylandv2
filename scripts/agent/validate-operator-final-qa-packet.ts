import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildOperatorFinalQaPacketReport,
  validateOperatorFinalQaPacketReport,
} from "../../src/lib/release-readiness/operator-final-qa-contract";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("operator-final-qa-packet");
}
