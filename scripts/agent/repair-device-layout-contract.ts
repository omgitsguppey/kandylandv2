import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertDeviceLayoutAutofixGate,
  buildDeviceLayoutAutofixPlans,
  buildDeviceLayoutScoreReport,
  printDeviceLayoutScoreSummary,
  writeDeviceLayoutScoreReport,
} from "../../src/lib/device-layout-score";

const root = process.cwd();
const apply = process.argv.includes("--apply");

const before = buildDeviceLayoutScoreReport({ root });
const plans = buildDeviceLayoutAutofixPlans(before, root);

console.log(`Device layout repair mode: ${apply ? "apply" : "dry-run"}`);
console.log(`Safe plans available: ${plans.length}`);
for (const plan of plans) {
  console.log(`- ${plan.filePath}: ${plan.description} (${plan.expectedOccurrences} exact occurrence(s))`);
}

if (!apply) {
  writeDeviceLayoutScoreReport({ ...before, safeAutofixesApplied: 0 }, root);
  printDeviceLayoutScoreSummary(before);
  process.exit(0);
}

let currentReport = before;
let applied = 0;
const skipped: Array<{ findingId: string; reason: string }> = [];

for (const plan of plans) {
  const finding = currentReport.findings.find((candidate) => candidate.id === plan.findingId);
  if (!finding) {
    skipped.push({ findingId: plan.findingId, reason: "Finding was already resolved or changed by an earlier repair." });
    continue;
  }

  const fullPath = join(root, plan.filePath);
  const originalSource = readFileSync(fullPath, "utf8");
  const gateFailure = assertDeviceLayoutAutofixGate(finding, plan, originalSource);
  if (gateFailure) {
    skipped.push({ findingId: plan.findingId, reason: gateFailure });
    continue;
  }

  writeFileSync(fullPath, originalSource.split(plan.oldText).join(plan.newText));

  const afterPlan = buildDeviceLayoutScoreReport({ root, safeAutofixesApplied: applied + 1 });
  const newCriticals = afterPlan.findings.filter((candidate) =>
    candidate.severity === "critical" &&
    !currentReport.findings.some((existing) => existing.id === candidate.id));

  if (afterPlan.score < currentReport.score || newCriticals.length > 0) {
    writeFileSync(fullPath, originalSource);
    const reverted = buildDeviceLayoutScoreReport({ root, safeAutofixesApplied: applied });
    skipped.push({
      findingId: plan.findingId,
      reason: "Repair was reverted because the layout score decreased or a new critical finding appeared.",
    });
    currentReport = reverted;
    continue;
  }

  applied += 1;
  currentReport = afterPlan;
  console.log(`Applied: ${plan.filePath}: ${plan.description}`);
  console.log(`Score after fix: ${currentReport.score}/100 (${currentReport.status})`);
}

writeDeviceLayoutScoreReport(currentReport, root);
if (skipped.length > 0) {
  console.log("Skipped plans:");
  for (const skip of skipped) {
    console.log(`- ${skip.findingId}: ${skip.reason}`);
  }
}
printDeviceLayoutScoreSummary(currentReport);
