import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildFormalEvidenceStatusLedgerReport,
  validateFormalEvidenceStatusLedgerReport,
} from "../../src/lib/release-readiness/formal-evidence-status-ledger";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("formal-evidence-status-ledger");
}
