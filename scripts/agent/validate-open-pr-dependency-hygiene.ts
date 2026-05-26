import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildOpenPrDependencyHygieneReport,
  validateOpenPrDependencyHygieneReport,
} from "../../src/lib/release-readiness/open-pr-dependency-hygiene";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("open-pr-dependency-hygiene");
}
