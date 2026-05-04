import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CODEBASE_HARDENING_DOCTRINE_NOTE,
  CODEBASE_HARDENING_DOMAINS,
  CODEBASE_HARDENING_FORBIDDEN_COMMANDS,
  CODEBASE_HARDENING_REPORT_PATH,
  type CodebaseHardeningFinding,
  type CodebaseHardeningReport,
} from "../../src/lib/codebase-hardening-contract";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function requireNumber(value: unknown, label: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    fail(`${label} must be a number between ${min} and ${max}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateFinding(finding: CodebaseHardeningFinding, index: number) {
  for (const field of [
    "id",
    "domain",
    "severity",
    "filePath",
    "title",
    "expectedRule",
    "actualPattern",
    "suggestedFix",
    "humanReadableEscalation",
  ] as const) {
    if (typeof finding[field] !== "string" || finding[field].trim().length === 0) {
      fail(`findings[${index}].${field} must be a non-empty string.`);
    }
  }
  if (!CODEBASE_HARDENING_DOMAINS.includes(finding.domain)) {
    fail(`findings[${index}].domain is not an allowed hardening domain.`);
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    fail(`findings[${index}].severity is invalid.`);
  }
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    fail(`findings[${index}].evidence must be non-empty.`);
  }
  if (typeof finding.canAutofix !== "boolean") {
    fail(`findings[${index}].canAutofix must be boolean.`);
  }
  requireNumber(finding.autofixConfidence, `findings[${index}].autofixConfidence`, 0, 1);
  if (finding.canAutofix && finding.autofixConfidence < 0.95) {
    fail(`findings[${index}] marks autofixable below 0.95 confidence.`);
  }
  if (!Array.isArray(finding.blockedBroadCommands) || !finding.blockedBroadCommands.includes("npm run check")) {
    fail(`findings[${index}].blockedBroadCommands must include broad forbidden commands.`);
  }
}

const reportSource = readRequired(CODEBASE_HARDENING_REPORT_PATH);
let report: CodebaseHardeningReport | null = null;
if (reportSource) {
  try {
    report = JSON.parse(reportSource) as CodebaseHardeningReport;
  } catch (error) {
    fail(`${CODEBASE_HARDENING_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
  }
}

if (report) {
  requireNumber(report.overallScore, "overallScore", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    fail("Report status must be valid.");
  }
  if (!isRecord(report.domainScores)) {
    fail("Report domainScores must be present.");
  } else {
    for (const domain of CODEBASE_HARDENING_DOMAINS) {
      const domainScore = report.domainScores[domain];
      if (!domainScore) {
        fail(`Report missing domain score for ${domain}.`);
      } else {
        requireNumber(domainScore.weight, `${domain}.weight`, 0, 100);
        requireNumber(domainScore.score, `${domain}.score`, 0, 100);
        requireNumber(domainScore.findingCount, `${domain}.findingCount`, 0, 100_000);
      }
    }
  }
  if (!Array.isArray(report.findings)) {
    fail("Report findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
  }
  if (report.criticalFindings?.length > 0 && report.status !== "fail") {
    fail("Critical findings must force report status to fail.");
  }
  if (!Array.isArray(report.minimalCommands) || !report.minimalCommands.includes("npm run check:hardening")) {
    fail("Report minimalCommands must include npm run check:hardening.");
  }
  if (!Array.isArray(report.forbiddenCommands) || !report.forbiddenCommands.includes("playwright")) {
    fail("Report forbiddenCommands must include Playwright.");
  }
  if (!report.commandBudget?.forbiddenCommands?.includes("npm run check:ui:audits")) {
    fail("Report commandBudget must include broad UI audit prohibition.");
  }
  if (!report.routeCostClassificationSummary || typeof report.routeCostClassificationSummary.unknown !== "number") {
    fail("Report routeCostClassificationSummary must classify routes.");
  }
  if (!Array.isArray(report.filesMostAtRisk)) {
    fail("Report filesMostAtRisk must be present.");
  }
  if (!Array.isArray(report.legacyCleanupPlan)) {
    fail("Report legacyCleanupPlan must be present.");
  }
}

for (const filePath of [
  "src/lib/codebase-hardening-contract.ts",
  "scripts/agent/score-codebase-hardening.ts",
  "scripts/agent/validate-codebase-hardening.ts",
  "scripts/agent/repair-codebase-hardening-safe.ts",
  "docs/agent-truth/codebase-hardening.md",
]) {
  readRequired(filePath);
}

const packageJson = readRequired("package.json");
for (const expected of [
  '"score:hardening": "tsx scripts/agent/score-codebase-hardening.ts"',
  '"check:hardening": "tsx scripts/agent/validate-codebase-hardening.ts"',
  '"repair:hardening": "tsx scripts/agent/repair-codebase-hardening-safe.ts"',
]) {
  requireIncludes(packageJson, expected, "package.json scripts");
}

const scoreScript = readRequired("scripts/agent/score-codebase-hardening.ts");
const repairScript = readRequired("scripts/agent/repair-codebase-hardening-safe.ts");
const contract = readRequired("src/lib/codebase-hardening-contract.ts");
for (const source of [scoreScript, repairScript, contract]) {
  if (/node:child_process|execSync|spawn\(|playwright\.test|cypress\.run|lighthouse\(/u.test(source)) {
    fail("Hardening default path must not invoke broad command runners or browser audit tools.");
  }
}
requireIncludes(repairScript, "finding.autofixConfidence < 0.95", "repair:hardening safe repair gate");
requireIncludes(contract, "CODEBASE_HARDENING_FORBIDDEN_COMMANDS", "hardening contract command budget");
for (const forbidden of CODEBASE_HARDENING_FORBIDDEN_COMMANDS) {
  requireIncludes(contract, forbidden, "hardening forbidden command list");
}

const docs = readRequired("docs/agent-truth/codebase-hardening.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const publicBetaDoc = readRequired("docs/agent-truth/public-beta-score.md");
const googleCostDoc = readRequired("docs/agent-truth/google-cost-bleed.md");
const deviceUiDoc = readRequired("docs/agent-truth/device-ui-dry-audit.md");
for (const [label, source] of [
  ["codebase hardening doc", docs],
  ["README", readme],
  ["AGENTS", agents],
  ["FULL_SCALE_CODEBASE_AUDIT", audit],
  ["public beta score doc", publicBetaDoc],
  ["google cost bleed doc", googleCostDoc],
  ["device UI dry audit doc", deviceUiDoc],
] as const) {
  requireIncludes(source, CODEBASE_HARDENING_DOCTRINE_NOTE, label);
}

if (failures.length > 0) {
  console.error("Codebase hardening validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Codebase hardening validation passed.");
