import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type EconomyFinding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  filePath: string;
  line?: number;
  excerpt?: string;
  scoreImpact: number;
  suggestedFix: string;
  canAutofix: boolean;
  escalation: string;
};

type EconomyReport = {
  score: number;
  status: string;
  generatedAt: string;
  repoRoot: string;
  findings: EconomyFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  checkedFiles: string[];
  rules: string[];
  summary: string;
};

const root = process.cwd();
const failures: string[] = [];
const reportPath = "agent/state/gumdrop-economy-score.generated.json";

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireNumber(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function expectedStatus(score: number, criticalCount: number) {
  if (criticalCount > 0) return "fail";
  if (score >= 95) return "clean";
  if (score >= 90) return "pass";
  if (score >= 80) return "warning";
  if (score >= 70) return "beta-risk";
  return "fail";
}

function parseReport() {
  const source = readRequired(reportPath);
  if (!source) return null;
  try {
    return JSON.parse(source) as EconomyReport;
  } catch (error) {
    failures.push(`${reportPath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateFinding(finding: EconomyFinding, index: number) {
  for (const key of ["id", "severity", "category", "title", "filePath", "suggestedFix", "escalation"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    failures.push(`findings[${index}].severity is invalid.`);
  }
  requireNumber(finding.scoreImpact, `findings[${index}].scoreImpact`, -25, 0);
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
}

const report = parseReport();
if (report) {
  requireNumber(report.score, "score", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    failures.push("status must be a valid economy score status.");
  }
  if (report.status !== expectedStatus(report.score, report.criticalCount)) {
    failures.push("status must match score thresholds and critical auto-fail behavior.");
  }
  if (!Array.isArray(report.findings)) {
    failures.push("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
  }
  requireNumber(report.criticalCount, "criticalCount", 0, 10_000);
  requireNumber(report.majorCount, "majorCount", 0, 10_000);
  requireNumber(report.safeAutofixesAvailable, "safeAutofixesAvailable", 0, 10_000);
  for (const field of ["generatedAt", "repoRoot", "summary"] as const) {
    if (typeof report[field] !== "string" || report[field].trim().length === 0) {
      failures.push(`${field} must be a non-empty string.`);
    }
  }
  for (const requiredFile of [
    "src/lib/gumdrop-ledger.ts",
    "src/lib/gumdrop-economics.ts",
    "src/app/api/paypal/capture/route.ts",
    "src/lib/server/creator-experiences.ts",
    "src/app/api/drops/unlock/route.ts",
    "tests/unit/gumdrop-ledger.spec.ts",
  ]) {
    if (!report.checkedFiles?.includes(requiredFile)) {
      failures.push(`checkedFiles must include ${requiredFile}.`);
    }
  }
  for (const requiredRule of [
    "paid package bonus GumDrops credit purchased balance",
    "creator monetization spends purchased balance only",
    "normal Drop unlocks may use total source-aware balance",
    "wallet UI is not required to expose source split everywhere",
  ]) {
    if (!report.rules?.includes(requiredRule)) {
      failures.push(`rules must include ${requiredRule}.`);
    }
  }
}

const packageJson = readRequired("package.json");
const scorer = readRequired("scripts/agent/score-gumdrop-economy.ts");
const validator = readRequired("scripts/agent/validate-gumdrop-economy.ts");
const docs = readRequired("docs/agent-truth/gumdrop-economy-score.md");
const ledger = readRequired("src/lib/gumdrop-ledger.ts");
const paypal = readRequired("src/app/api/paypal/capture/route.ts");
const creatorExperiences = readRequired("src/lib/server/creator-experiences.ts");
const dropUnlock = readRequired("src/app/api/drops/unlock/route.ts");
const ledgerTest = readRequired("tests/unit/gumdrop-ledger.spec.ts");
const paypalTest = readRequired("tests/unit/paypal-capture-route.spec.ts");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const memory = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const expected of [
  "\"score:economy\": \"tsx scripts/agent/score-gumdrop-economy.ts\"",
  "\"check:gumdrop-economy\": \"tsx scripts/agent/validate-gumdrop-economy.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
  "agent/state/gumdrop-economy-score.generated.json",
  "paid package bonus GumDrops credit purchased balance",
  "wallet UI is not required to expose source split everywhere",
  "suggestedFix",
  "criticalCount",
  "Forbidden default commands: Playwright, Lighthouse, Cypress",
]) {
  requireIncludes(scorer, expected, "GumDrops economy scorer");
}
for (const forbidden of ["node:child_process", "playwright", "cypress", "lighthouse"]) {
  if (forbidden === "playwright" || forbidden === "cypress" || forbidden === "lighthouse") {
    continue;
  }
  requireNotIncludes(scorer, forbidden, "GumDrops economy scorer default path");
}

for (const expected of [
  "purchasedCreditGumDrops: deliveredGumDrops",
  "rewardCreditGumDrops: 0",
  "purchaseBonusGumDrops: bonusGumDrops",
  "paid_purchase_including_bonus",
  "gumdropRewardTotal: isRewardTransaction ? positiveAmount : 0",
]) {
  requireIncludes(ledger, expected, "GumDrop ledger source truth");
}

for (const expected of [
  "buildPaidPurchaseBalanceCredit",
  "purchaseCredit.purchasedCreditGumDrops",
  "\"purchased\"",
  "purchaseSourceClassification",
]) {
  requireIncludes(paypal, expected, "PayPal capture source truth");
}

requireIncludes(creatorExperiences, "purchasedOnly: true", "Creator experience spend policy");
requireIncludes(creatorExperiences, "spendSourceAwareGumdrops(current, amount, {", "Creator experience spend helper");
requireIncludes(dropUnlock, "spendSourceAwareGumdrops(sourceAwareBalance, unlockCost)", "Normal Drop unlock spend policy");
requireNotIncludes(dropUnlock, "purchasedOnly: true", "Normal Drop unlock spend policy");

for (const expected of [
  "credits paid purchase base and bonus GumDrops into purchased source",
  "keeps daily and task rewards in reward source only",
  "lets creator paid-only spend use paid-pack bonus",
  "requires purchased balance for restricted creator spends",
]) {
  requireIncludes(ledgerTest, expected, "GumDrop ledger unit tests");
}
requireIncludes(paypalTest, "paid-pack bonus GumDrops into paid-source backend balance", "PayPal capture unit tests");

const doctrineNote = "GumDrops economy scoring is deterministic.";
for (const [label, source] of [
  ["gumdrop economy docs", docs],
  ["full audit ledger", audit],
  ["repo memory ledger", memory],
  ["file/function checklist", checklist],
] as const) {
  requireIncludes(source, doctrineNote, label);
}
requireIncludes(validator, "critical auto-fail behavior", "GumDrops economy validator");

if (failures.length > 0) {
  console.error("GumDrops economy validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("GumDrops economy validation passed.");
