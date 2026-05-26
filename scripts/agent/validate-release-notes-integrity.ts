import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildReleaseNotesIntegrityReport,
  validateReleaseNotesIntegrityReport,
} from "../../src/lib/release-readiness/release-notes-integrity";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("release-notes-integrity");
}
