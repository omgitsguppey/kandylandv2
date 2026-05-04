import {
  printPublicBetaScoreSummary,
  writePublicBetaScoreReport,
} from "../../src/lib/agent-score/reporting";
import { buildPublicBetaReadinessReport } from "../../src/lib/agent-score/public-beta-scanner";
import { PUBLIC_BETA_DOMAIN_WEIGHTS } from "../../src/lib/agent-score/weights";
import { loadDebugEvidenceForAuditDomains } from "./load-debug-evidence-for-audit";

export function runPublicBetaReadinessScore(root = process.cwd(), safeAutofixesApplied = 0) {
  const report = {
    ...buildPublicBetaReadinessReport({ root, safeAutofixesApplied }),
    debugEvidence: loadDebugEvidenceForAuditDomains([
      ...Object.keys(PUBLIC_BETA_DOMAIN_WEIGHTS),
      "support",
    ], root, 10),
  };
  writePublicBetaScoreReport(report, root);
  return report;
}

const report = runPublicBetaReadinessScore();
printPublicBetaScoreSummary(report);
