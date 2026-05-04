import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  applyDeviceLayoutAutofixPlans,
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

const originalFiles = new Map<string, string>();
for (const plan of plans) {
  if (!originalFiles.has(plan.filePath)) {
    originalFiles.set(plan.filePath, readFileSync(join(root, plan.filePath), "utf8"));
  }
}

const result = applyDeviceLayoutAutofixPlans(before, plans, root);
const after = buildDeviceLayoutScoreReport({ root, safeAutofixesApplied: result.applied });
const newCriticals = after.findings.filter((finding) =>
  finding.severity === "critical" && !before.findings.some((existing) => existing.id === finding.id));

if (after.score < before.score || newCriticals.length > 0) {
  for (const [filePath, source] of originalFiles.entries()) {
    writeFileSync(join(root, filePath), source);
  }
  const reverted = buildDeviceLayoutScoreReport({ root, safeAutofixesApplied: 0 });
  writeDeviceLayoutScoreReport(reverted, root);
  console.error("Device layout repair reverted because score decreased or new critical findings appeared.");
  process.exit(1);
}

writeDeviceLayoutScoreReport(after, root);
if (result.skipped.length > 0) {
  console.log("Skipped plans:");
  for (const skip of result.skipped) {
    console.log(`- ${skip.findingId}: ${skip.reason}`);
  }
}
printDeviceLayoutScoreSummary(after);
