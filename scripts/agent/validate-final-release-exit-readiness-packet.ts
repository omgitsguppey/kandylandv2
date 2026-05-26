import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildFinalReleaseExitReadinessPacketReport,
  validateFinalReleaseExitReadinessPacketReport,
} from "../../src/lib/release-readiness/final-release-readiness";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("final-release-exit-readiness-packet");
}
