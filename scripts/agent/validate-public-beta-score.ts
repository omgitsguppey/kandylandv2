import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assertAutofixGate, type PublicBetaAutofixPlan } from "../../src/lib/agent-score/autofix";
import type { PublicBetaEvidenceGate, PublicBetaFinding, PublicBetaScoreReport } from "../../src/lib/agent-score/core";
import { PUBLIC_BETA_SCORE_REPORT_PATH } from "../../src/lib/agent-score/reporting";

const root = process.cwd();
const failures: string[] = [];

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

function readReport() {
  const source = readRequired(PUBLIC_BETA_SCORE_REPORT_PATH);
  if (!source) {
    return null;
  }
  try {
    return JSON.parse(source) as PublicBetaScoreReport;
  } catch (error) {
    failures.push(`${PUBLIC_BETA_SCORE_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function requireNumber(value: unknown, label: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function validateEvidenceGate(gate: PublicBetaEvidenceGate, index: number) {
  for (const key of ["id", "label", "status", "detail", "recommendedAction"] as const) {
    if (typeof gate[key] !== "string" || gate[key].trim().length === 0) {
      failures.push(`evidenceGates[${index}].${key} must be a non-empty string.`);
    }
  }
  if (![
    "Ready",
    "Ready with smoke required",
    "Needs review",
    "Blocked",
    "Unknown evidence",
    "Stale evidence",
    "Runtime unverified",
    "Visual QA required",
  ].includes(gate.status)) {
    failures.push(`evidenceGates[${index}].status is invalid.`);
  }
  requireNumber(gate.weight, `evidenceGates[${index}].weight`, 0, 100);
  requireNumber(gate.score, `evidenceGates[${index}].score`, 0, 100);
  if (!Array.isArray(gate.evidence)) {
    failures.push(`evidenceGates[${index}].evidence must be an array.`);
  }
}

function validateFinding(finding: PublicBetaFinding, index: number) {
  for (const key of ["id", "domain", "category", "title", "severity", "filePath", "escalation"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  requireNumber(finding.confidence, `findings[${index}].confidence`, 0, 1);
  requireNumber(finding.rawPenalty, `findings[${index}].rawPenalty`, 0, 100);
  requireNumber(finding.weightedPenalty, `findings[${index}].weightedPenalty`, 0, 200);
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    failures.push(`findings[${index}].evidence must be a non-empty array.`);
  }
  if (!Array.isArray(finding.docsBasis) || finding.docsBasis.length === 0) {
    failures.push(`findings[${index}].docsBasis must be a non-empty array.`);
  }
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
  requireNumber(finding.autofixConfidence, `findings[${index}].autofixConfidence`, 0, 1);
}

const report = readReport();
if (report) {
  requireNumber(report.scannerScore, "scannerScore", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.scannerStatus)) {
    failures.push("scannerStatus must be a valid public beta status.");
  }
  requireNumber(report.overallScore, "overallScore", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.overallStatus)) {
    failures.push("overallStatus must be a valid public beta status.");
  }
  if (![
    "Ready",
    "Ready with smoke required",
    "Needs review",
    "Blocked",
    "Unknown evidence",
    "Stale evidence",
    "Runtime unverified",
    "Visual QA required",
  ].includes(report.readinessStatus)) {
    failures.push("readinessStatus must be an honest evidence-aware readiness status.");
  }
  if (typeof report.readinessStatusReason !== "string" || report.readinessStatusReason.trim().length === 0) {
    failures.push("readinessStatusReason must be non-empty.");
  }
  requireNumber(report.evidenceScore, "evidenceScore", 0, 100);
  if (!Array.isArray(report.evidenceGates) || report.evidenceGates.length === 0) {
    failures.push("evidenceGates must be a non-empty array.");
  } else {
    report.evidenceGates.forEach(validateEvidenceGate);
  }
  if (!Array.isArray(report.evidenceCapsApplied)) {
    failures.push("evidenceCapsApplied must be an array.");
  }
  if (!report.evidenceWeights || typeof report.evidenceWeights !== "object") {
    failures.push("evidenceWeights must be present.");
  }
  if (report.scannerScore === 100 && report.findings?.length === 0 && report.evidenceCapsApplied.length > 0) {
    if (report.overallScore >= 100 || report.overallStatus === "clean" || report.readinessStatus === "Ready") {
      failures.push("Zero scanner findings with missing evidence must not produce clean/Ready/100.");
    }
  }
  if (!report.domainScores || typeof report.domainScores !== "object") {
    failures.push("domainScores must be present.");
  }
  if (!Array.isArray(report.findings)) {
    failures.push("findings must be an array.");
  } else {
    report.findings.forEach(validateFinding);
    const hasCritical = report.findings.some((finding) => finding.severity === "critical" && finding.confidence >= 0.85);
    if (hasCritical && report.overallStatus !== "fail") {
      failures.push("critical findings with confidence >= 0.85 must force overallStatus fail.");
    }
  }
  if (report.readinessStatus !== "Ready" && report.summary.includes("(clean)")) {
    failures.push("summary must not present evidence-capped readiness as clean.");
  }
  const hasEmptyDebugGate = report.evidenceGates?.some((gate) =>
    gate.id === "debugRuntimeEvidence" && gate.status === "Unknown evidence");
  const debugEvidence = report.debugEvidence ?? {};
  const debugEvidenceEmpty = Object.values(debugEvidence).every((entries) => Array.isArray(entries) && entries.length === 0);
  if (debugEvidenceEmpty && !hasEmptyDebugGate) {
    failures.push("Empty debugEvidence must be represented as Unknown evidence.");
  }
  requireNumber(report.dedupedFindingCount, "dedupedFindingCount", 0, 10_000);
  requireNumber(report.safeAutofixesAvailable, "safeAutofixesAvailable", 0, 10_000);
  requireNumber(report.safeAutofixesApplied, "safeAutofixesApplied", 0, 10_000);
  if (!Array.isArray(report.recommendedNextActions)) {
    failures.push("recommendedNextActions must be an array.");
  }
  if (!Array.isArray(report.minimalVerificationCommands) || !report.minimalVerificationCommands.includes("npm run check:beta-score")) {
    failures.push("minimalVerificationCommands must include npm run check:beta-score.");
  }
  if (!report.commandBudget?.forbiddenCommands?.includes("playwright")) {
    failures.push("commandBudget.forbiddenCommands must include playwright.");
  }
  if (report.commandBudget.allowedCommands.some((command) => /playwright|cypress|lighthouse/u.test(command))) {
    failures.push("Allowed default commands must not include Playwright, Cypress, or Lighthouse.");
  }
}

const scoreScript = readRequired("scripts/agent/score-public-beta-readiness.ts");
const repairScript = readRequired("scripts/agent/repair-public-beta-safe.ts");
const validatorScript = readRequired("scripts/agent/validate-public-beta-score.ts");
const core = readRequired("src/lib/agent-score/core.ts");
const weights = readRequired("src/lib/agent-score/weights.ts");
const reporting = readRequired("src/lib/agent-score/reporting.ts");
const autofix = readRequired("src/lib/agent-score/autofix.ts");
const scanner = readRequired("src/lib/agent-score/public-beta-scanner.ts");
const docs = readRequired("docs/agent-truth/public-beta-score.md");
const packageJson = readRequired("package.json");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");

for (const expected of [
  "PUBLIC_BETA_DOMAIN_WEIGHTS",
  "PUBLIC_BETA_EVIDENCE_WEIGHTS",
  "PUBLIC_BETA_SEVERITY_PENALTIES",
  "PUBLIC_BETA_BLAST_RADIUS_MULTIPLIERS",
  "buildPublicBetaScoreReport",
  "buildPublicBetaEvidenceGates",
  "dedupePublicBetaFindings",
  "readinessStatus",
  "critical",
]) {
  requireIncludes(core + weights, expected, "Public beta score math core");
}

for (const expected of [
  "buildSafeAutofixPlans",
  "assertAutofixGate",
  "autofixConfidence < 0.95",
  "src\\/lib\\/gumdrop-ledger\\.ts",
]) {
  requireIncludes(autofix, expected, "Public beta safe autofix gate");
}

for (const expected of [
  "collectPublicBetaFindings",
  "scanEconomy",
  "scanContentProtection",
  "scanTestingCoverage",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \\\"0px\\\"",
  "economics.bonusGumDrops, \\\"reward\\\"",
]) {
  requireIncludes(scanner, expected, "Public beta deterministic scanner");
}

for (const source of [scoreScript, repairScript, core, reporting, autofix, scanner]) {
  requireNotIncludes(source, "node:child_process", "Public beta score default path");
  requireNotIncludes(source, "execSync", "Public beta score default path");
  requireNotIncludes(source, "spawn(", "Public beta score default path");
}
requireNotIncludes(scoreScript + repairScript, "playwright", "Public beta score scripts");
requireNotIncludes(scoreScript + repairScript, "cypress", "Public beta score scripts");
requireNotIncludes(scoreScript + repairScript, "lighthouse", "Public beta score scripts");

const lowConfidenceFinding = {
  id: "test-low-confidence",
  domain: "layout",
  category: "viewport-unit",
  title: "Low confidence test",
  severity: "major",
  confidence: 0.9,
  blastRadius: "component",
  filePath: "src/components/Chat/ChatRouteShell.tsx",
  rawPenalty: 9,
  weightedPenalty: 9,
  canAutofix: true,
  autofixConfidence: 0.94,
  escalation: "test",
  evidence: ["test"],
  docsBasis: ["repo"],
} satisfies PublicBetaFinding;
const lowConfidencePlan = {
  findingId: "test-low-confidence",
  filePath: "src/components/Chat/ChatRouteShell.tsx",
  oldText: "100vh",
  newText: "100dvh",
  expectedOccurrences: 1,
  description: "test",
  confidence: 0.94,
} satisfies PublicBetaAutofixPlan;
if (!assertAutofixGate(lowConfidenceFinding, lowConfidencePlan, "height: 100vh;")) {
  failures.push("Autofix gate must refuse confidence below 0.95.");
}

const doctrineNote = "KandyDrops public beta scoring is deterministic and mathematical.";
for (const [label, source] of [
  ["public beta score doc", docs],
  ["README", readme],
  ["AGENTS", agents],
  ["FULL_SCALE_CODEBASE_AUDIT", auditLedger],
] as const) {
  requireIncludes(source, doctrineNote, label);
}
for (const expected of [
  "\"score:beta\": \"tsx scripts/agent/score-public-beta-readiness.ts\"",
  "\"repair:beta\": \"tsx scripts/agent/repair-public-beta-safe.ts\"",
  "\"check:beta-score\": \"tsx scripts/agent/validate-public-beta-score.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}
requireIncludes(validatorScript, "commandBudget.forbiddenCommands", "Public beta score validator");
requireIncludes(validatorScript, "Zero scanner findings with missing evidence", "Public beta evidence-aware validator");

if (failures.length > 0) {
  console.error("Public beta score validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public beta score validation passed.");
