import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  type CodebaseHardeningFinding,
  type CodebaseHardeningReport,
} from "../../src/lib/codebase-hardening-contract";
import {
  buildCodebaseHardeningReport,
  printCodebaseHardeningSummary,
  writeCodebaseHardeningReport,
} from "./score-codebase-hardening";

type HardeningRepairPlan = {
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

function exactPlanForFinding(finding: CodebaseHardeningFinding): HardeningRepairPlan | null {
  if (!finding.canAutofix || finding.autofixConfidence < 0.95) return null;

  if (finding.actualPattern === "100vh") {
    return {
      findingId: finding.id,
      filePath: finding.filePath,
      oldText: "100vh",
      newText: "100dvh",
      expectedOccurrences: 1,
      confidence: finding.autofixConfidence,
      description: "Replace exact raw viewport unit in approved shell-critical file.",
    };
  }

  if (finding.actualPattern === 'CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"') {
    return {
      findingId: finding.id,
      filePath: finding.filePath,
      oldText: 'CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"',
      newText: "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = CHAT_LIST_CONTROLS_BOTTOM_OFFSET",
      expectedOccurrences: 1,
      confidence: finding.autofixConfidence,
      description: "Replace exact zero chat bottom offset with the shared chat controls token.",
    };
  }

  if (finding.actualPattern.includes("emerald")) {
    return {
      findingId: finding.id,
      filePath: finding.filePath,
      oldText: "emerald",
      newText: "brand-purple",
      expectedOccurrences: countOccurrences(readFileSync(join(root, finding.filePath), "utf8"), "emerald"),
      confidence: finding.autofixConfidence,
      description: "Replace old wallet emerald bonus-chip token with brand-purple token.",
    };
  }

  return null;
}

function buildSafePlans(report: CodebaseHardeningReport) {
  return report.findings
    .map(exactPlanForFinding)
    .filter((plan): plan is HardeningRepairPlan => Boolean(plan));
}

function applyPlan(plan: HardeningRepairPlan) {
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

const before = buildCodebaseHardeningReport(root, 0);
const plans = buildSafePlans(before);

console.log(`Safe codebase hardening repair mode: ${apply ? "apply" : "dry-run"}`);
console.log(`Safe plans available: ${plans.length}`);
for (const plan of plans) {
  console.log(`- ${plan.filePath}: ${plan.description} (${plan.expectedOccurrences} exact occurrence(s))`);
}

if (!apply) {
  writeCodebaseHardeningReport(before, root);
  printCodebaseHardeningSummary(before);
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

  const afterPlan = buildCodebaseHardeningReport(root, applied + 1);
  const newCriticals = afterPlan.criticalFindings.filter((finding) =>
    !before.criticalFindings.some((existing) => existing.id === finding.id));

  if (afterPlan.overallScore < before.overallScore || newCriticals.length > 0) {
    const original = originalFiles.get(plan.filePath);
    if (original !== undefined) {
      writeFileSync(fullPath, original, "utf8");
    }
    const reverted = buildCodebaseHardeningReport(root, applied);
    writeCodebaseHardeningReport(reverted, root);
    console.error(`Reverted ${plan.findingId}: score decreased or new critical finding appeared.`);
    process.exit(1);
  }

  applied += 1;
}

const finalReport = buildCodebaseHardeningReport(root, applied);
writeCodebaseHardeningReport(finalReport, root);
printCodebaseHardeningSummary(finalReport);
