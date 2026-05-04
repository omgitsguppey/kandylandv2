import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  applySafeAutofixPlans,
  buildSafeAutofixPlans,
} from "../../src/lib/agent-score/autofix";
import { buildPublicBetaReadinessReport } from "../../src/lib/agent-score/public-beta-scanner";
import {
  printPublicBetaScoreSummary,
  writePublicBetaScoreReport,
} from "../../src/lib/agent-score/reporting";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const before = buildPublicBetaReadinessReport({ root });
const plans = buildSafeAutofixPlans(before, root);

console.log(`Safe public beta repair mode: ${apply ? "apply" : "dry-run"}`);
console.log(`Safe plans available: ${plans.length}`);
for (const plan of plans) {
  console.log(`- ${plan.filePath}: ${plan.description} (${plan.expectedOccurrences} exact occurrence(s))`);
}

if (!apply) {
  const dryRunReport = {
    ...before,
    safeAutofixesApplied: 0,
  };
  writePublicBetaScoreReport(dryRunReport, root);
  printPublicBetaScoreSummary(dryRunReport);
  process.exit(0);
}

const originalFiles = new Map<string, string>();
for (const plan of plans) {
  if (!originalFiles.has(plan.filePath)) {
    originalFiles.set(plan.filePath, readFileSync(join(root, plan.filePath), "utf8"));
  }
}

const result = applySafeAutofixPlans(before, plans, root);
const after = buildPublicBetaReadinessReport({ root, safeAutofixesApplied: result.applied });
const newCriticals = after.findings.filter((finding) =>
  finding.severity === "critical" && !before.findings.some((existing) => existing.id === finding.id));

if (after.overallScore < before.overallScore || newCriticals.length > 0) {
  for (const [filePath, source] of originalFiles.entries()) {
    writeFileSync(join(root, filePath), source);
  }
  const reverted = buildPublicBetaReadinessReport({ root, safeAutofixesApplied: 0 });
  writePublicBetaScoreReport(reverted, root);
  console.error("Safe repair reverted because score decreased or new critical findings appeared.");
  process.exit(1);
}

writePublicBetaScoreReport(after, root);
if (result.skipped.length > 0) {
  console.log("Skipped plans:");
  for (const skip of result.skipped) {
    console.log(`- ${skip.findingId}: ${skip.reason}`);
  }
}
printPublicBetaScoreSummary(after);
