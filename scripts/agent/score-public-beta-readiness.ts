import {
  printPublicBetaScoreSummary,
  writePublicBetaScoreReport,
} from "../../src/lib/agent-score/reporting";
import { buildPublicBetaReadinessReport } from "../../src/lib/agent-score/public-beta-scanner";

export function runPublicBetaReadinessScore(root = process.cwd(), safeAutofixesApplied = 0) {
  const report = buildPublicBetaReadinessReport({ root, safeAutofixesApplied });
  writePublicBetaScoreReport(report, root);
  return report;
}

const report = runPublicBetaReadinessScore();
printPublicBetaScoreSummary(report);
