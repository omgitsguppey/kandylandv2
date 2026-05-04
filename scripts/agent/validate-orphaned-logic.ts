import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type OrphanedLogicFinding = {
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
  autofixPlan?: string;
  escalation: string;
  evidence: unknown[];
};

type OrphanedLogicReport = {
  score: number;
  status: string;
  generatedAt: string;
  repoRoot: string;
  findings: OrphanedLogicFinding[];
  criticalCount: number;
  majorCount: number;
  safeAutofixesAvailable: number;
  scannedFileCount: number;
  checkedFiles: string[];
  rules: string[];
  commandBudget: { allowedCommands: string[]; forbiddenCommands: string[] };
  summary: string;
};

const root = process.cwd();
const failures: string[] = [];
const REPORT_PATH = "agent/state/orphaned-logic-score.generated.json";

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
  const source = readRequired(REPORT_PATH);
  if (!source) return null;
  try {
    return JSON.parse(source) as OrphanedLogicReport;
  } catch (error) {
    failures.push(`${REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateFinding(finding: OrphanedLogicFinding, index: number) {
  for (const key of ["id", "severity", "category", "title", "filePath", "suggestedFix", "escalation"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    failures.push(`findings[${index}].severity is invalid.`);
  }
  if (![
    "duplicate_normalizer",
    "legacy_preview_ownership",
    "use_drops_notes",
    "duplicate_pr_audit",
    "route_migration",
    "stale_docs",
    "vocabulary",
    "realtime_hot_cache",
    "telemetry_duplicate_intent",
    "dead_import",
    "autofix_policy",
  ].includes(finding.category)) {
    failures.push(`findings[${index}].category is invalid.`);
  }
  requireNumber(finding.scoreImpact, `findings[${index}].scoreImpact`, -25, 0);
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
  if (!Array.isArray(finding.evidence)) {
    failures.push(`findings[${index}].evidence must be an array.`);
  }
  if (finding.canAutofix && typeof finding.autofixPlan !== "string") {
    failures.push(`findings[${index}].autofixPlan must explain safe autofix when canAutofix is true.`);
  }
}

const report = parseReport();
if (report) {
  requireNumber(report.score, "score", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    failures.push("status must be a valid orphaned-logic score status.");
  }
  if (report.status !== expectedStatus(report.score, report.criticalCount)) {
    failures.push("status must match score thresholds and critical auto-fail behavior.");
  }
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
    failures.push("generatedAt must be an ISO timestamp string.");
  }
  if (!Array.isArray(report.findings)) {
    failures.push("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
    const criticalCount = report.findings.filter((finding) => finding.severity === "critical").length;
    const majorCount = report.findings.filter((finding) => finding.severity === "major").length;
    if (criticalCount !== report.criticalCount) {
      failures.push("criticalCount must match critical findings.");
    }
    if (majorCount !== report.majorCount) {
      failures.push("majorCount must match major findings.");
    }
  }
  requireNumber(report.scannedFileCount, "scannedFileCount", 1, 100_000);
  requireNumber(report.safeAutofixesAvailable, "safeAutofixesAvailable", 0, 10_000);
  if (!Array.isArray(report.checkedFiles) || report.checkedFiles.length < 10) {
    failures.push("checkedFiles must list current orphaned-logic surfaces.");
  }
  for (const requiredFile of [
    "src/app/drops/[id]/preview/page.tsx",
    "src/components/DropPreviewModal.tsx",
    "src/hooks/useDrops.ts",
    "src/lib/telemetry-catalog.ts",
  ]) {
    if (!report.checkedFiles.includes(requiredFile)) {
      failures.push(`checkedFiles must include ${requiredFile}.`);
    }
  }
  for (const rule of [
    "duplicate normalizers for same domain",
    "old DropPreviewModal must not own locked preview after full-page route exists",
    "duplicate PR audit chunks with broken template text",
    "old Coins or wrong GumDrops vocabulary",
    "duplicate telemetry events with same intent but different names",
    "dead imports in public beta surfaces",
  ]) {
    if (!report.rules.includes(rule)) {
      failures.push(`rules must include ${rule}.`);
    }
  }
  for (const forbidden of ["playwright", "cypress", "lighthouse", "npm run check"]) {
    if (!report.commandBudget.forbiddenCommands.includes(forbidden)) {
      failures.push(`commandBudget.forbiddenCommands must include ${forbidden}.`);
    }
  }
}

const packageJson = readRequired("package.json");
const scorer = readRequired("scripts/agent/score-orphaned-logic.ts");
const validator = readRequired("scripts/agent/validate-orphaned-logic.ts");
const docs = readRequired("docs/agent-truth/orphaned-logic-score.md");
const publicBetaScoreDocs = readRequired("docs/agent-truth/public-beta-score.md");
const dropPreviewDocs = readRequired("docs/agent-truth/drop-preview-page.md");
const launchTriageDocs = readRequired("docs/agent-truth/launch-pr-triage.md");
const telemetryCatalog = readRequired("src/lib/telemetry-catalog.ts");
const dropsClient = readRequired("src/app/drops/DropsClient.tsx");
const dropPreviewModal = readRequired("src/components/DropPreviewModal.tsx");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const memory = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const expected of [
  "\"score:orphans\": \"tsx scripts/agent/score-orphaned-logic.ts\"",
  "\"check:orphaned-logic\": \"tsx scripts/agent/validate-orphaned-logic.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
  "OrphanedLogicFinding",
  "OrphanedLogicReport",
  "duplicate normalizers for same domain",
  "DropPreviewModal",
  "duplicate PR audit chunks with broken template text",
  "old Coins or wrong GumDrops vocabulary",
  "obsolete realtime logic where hot-cache doctrine applies",
  "duplicate telemetry events with same intent but different names",
  "dead imports in public beta surfaces",
  "safe autofix plans only",
  "agent/state/orphaned-logic-score.generated.json",
]) {
  requireIncludes(scorer, expected, "orphaned logic scorer");
}
for (const source of [scorer]) {
  requireNotIncludes(source, "node:child_process", "orphaned logic score default path");
  requireNotIncludes(source, "execSync", "orphaned logic score default path");
  requireNotIncludes(source, "spawnSync", "orphaned logic score default path");
  requireNotIncludes(source, "spawn(", "orphaned logic score default path");
}

requireIncludes(dropPreviewDocs, "Locked Drop preview is a dedicated full-page conversion surface", "drop preview doctrine");
requireIncludes(dropPreviewModal, "Legacy fallback only. Locked Drop preview ownership moved to /drops/[id]/preview.", "legacy DropPreviewModal marker");
requireIncludes(dropsClient, "/preview?source_component=", "DropsClient full-page preview routing");
requireNotIncludes(dropsClient, "DropPreviewModal", "DropsClient locked preview ownership");
requireIncludes(launchTriageDocs, "Open bot PRs must be cherry-picked by current-source relevance", "launch PR triage doctrine");
requireIncludes(publicBetaScoreDocs, "orphanedLogic", "public beta score domain docs");
requireIncludes(telemetryCatalog, "drop_preview_opened", "telemetry catalog duplicate-intent evidence");
requireIncludes(telemetryCatalog, "drop_preview_page_viewed", "telemetry catalog duplicate-intent evidence");

const doctrineNote = "KandyDrops orphaned logic scoring is deterministic and source-only.";
for (const [label, source] of [
  ["orphaned logic docs", docs],
  ["full audit ledger", audit],
  ["repo memory ledger", memory],
  ["file function checklist", checklist],
] as const) {
  requireIncludes(source, doctrineNote, label);
}
for (const expected of [
  "Do not delete route files or components without an explicit deprecated marker",
  "Autofix plans are suggestions only",
  "score:orphans",
  "check:orphaned-logic",
]) {
  requireIncludes(docs, expected, "orphaned logic docs");
}

if (failures.length > 0) {
  console.error("Orphaned logic validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Orphaned logic scorer validated.");
