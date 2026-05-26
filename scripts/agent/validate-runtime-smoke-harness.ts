import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildRuntimeSmokeHarnessReport,
  validateRuntimeSmokeHarnessReport,
} from "../../src/lib/release-readiness/runtime-smoke-harness-contract";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("runtime-smoke-harness");
}
