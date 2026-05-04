import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildSpeedSecurityHardeningReport,
  printSpeedSecurityHardeningSummary,
  writeSpeedSecurityHardeningReport,
} from "./score-speed-security-hardening";

type SpeedSecurityFinding = ReturnType<typeof buildSpeedSecurityHardeningReport>["findings"][number];

type SpeedSecurityRepairPlan = {
  findingId: string;
  filePath: string;
  oldText: string;
  newText: string;
  expectedOccurrences: number;
  confidence: number;
  description: string;
};

const root = process.cwd();
const apply = process.argv.includes("--apply");

function countOccurrences(source: string, needle: string) {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = source.indexOf(needle);
  while (index >= 0) {
    count += 1;
    index = source.indexOf(needle, index + needle.length);
  }
  return count;
}

function exactPlanForFinding(finding: SpeedSecurityFinding): SpeedSecurityRepairPlan | null {
  if (!finding.canAutofix || finding.autofixConfidence < 0.95) return null;

  if (finding.actualPattern === "100vh") {
    return {
      findingId: finding.id,
      filePath: finding.filePath,
      oldText: "100vh",
      newText: "100dvh",
      expectedOccurrences: 1,
      confidence: finding.autofixConfidence,
      description: "Replace exact raw viewport unit in approved shell-critical source.",
    };
  }

  return null;
}

function buildSafePlans(report: ReturnType<typeof buildSpeedSecurityHardeningReport>) {
  return report.findings
    .map(exactPlanForFinding)
    .filter((plan): plan is SpeedSecurityRepairPlan => Boolean(plan));
}

function applyPlan(plan: SpeedSecurityRepairPlan) {
  const fullPath = join(root, plan.filePath);
  if (!existsSync(fullPath)) {
    return { applied: false, reason: "file missing" };
  }

  const source = readFileSync(fullPath, "utf8");
  const occurrences = countOccurrences(source, plan.oldText);
  if (occurrences !== plan.expectedOccurrences || occurrences === 0) {
    return { applied: false, reason: `expected ${plan.expectedOccurrences} occurrence(s), found ${occurrences}` };
  }

  writeFileSync(fullPath, source.split(plan.oldText).join(plan.newText), "utf8");
  return { applied: true, reason: "applied" };
}

const before = buildSpeedSecurityHardeningReport(root, 0);
const plans = buildSafePlans(before);

console.log(`Safe speed/security hardening repair mode: ${apply ? "apply" : "dry-run"}`);
console.log(`Safe plans available: ${plans.length}`);
for (const plan of plans) {
  console.log(`- ${plan.filePath}: ${plan.description} (${plan.expectedOccurrences} exact occurrence(s))`);
}

if (!apply) {
  writeSpeedSecurityHardeningReport(before, root);
  printSpeedSecurityHardeningSummary(before);
  process.exit(0);
}

let applied = 0;
const originalFiles = new Map<string, string>();
for (const plan of plans) {
  const fullPath = join(root, plan.filePath);
  if (!originalFiles.has(plan.filePath) && existsSync(fullPath)) {
    originalFiles.set(plan.filePath, readFileSync(fullPath, "utf8"));
  }

  const result = applyPlan(plan);
  if (!result.applied) {
    console.log(`Skipped ${plan.findingId}: ${result.reason}`);
    continue;
  }

  const afterPlan = buildSpeedSecurityHardeningReport(root, applied + 1);
  const newCriticals = afterPlan.criticalFindings.filter((finding) =>
    !before.criticalFindings.some((existing) => existing.id === finding.id));

  if (afterPlan.overallScore < before.overallScore || newCriticals.length > 0) {
    const original = originalFiles.get(plan.filePath);
    if (original !== undefined) {
      writeFileSync(fullPath, original, "utf8");
    }
    const reverted = buildSpeedSecurityHardeningReport(root, applied);
    writeSpeedSecurityHardeningReport(reverted, root);
    console.error(`Reverted ${plan.findingId}: score decreased or new critical finding appeared.`);
    process.exit(1);
  }

  applied += 1;
}

const finalReport = buildSpeedSecurityHardeningReport(root, applied);
writeSpeedSecurityHardeningReport(finalReport, root);
printSpeedSecurityHardeningSummary(finalReport);
