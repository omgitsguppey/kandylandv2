import { fileURLToPath } from "node:url";

import { runReleaseReadinessReport } from "./release-readiness-report-runner";

export {
  buildAdminTruthRedactionPacketReport,
  validateAdminTruthRedactionPacketReport,
} from "../../src/lib/release-readiness/admin-truth-redaction-contract";

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runReleaseReadinessReport("admin-truth-redaction-packet");
}
