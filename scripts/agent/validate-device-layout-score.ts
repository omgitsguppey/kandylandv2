import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertDeviceLayoutAutofixGate,
  DEVICE_LAYOUT_SCORE_REPORT_PATH,
  type DeviceLayoutAutofixPlan,
  type DeviceLayoutFinding,
  type DeviceLayoutScoreReport,
} from "../../src/lib/device-layout-score";

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

function requireNumber(value: unknown, label: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function readReport() {
  const source = readRequired(DEVICE_LAYOUT_SCORE_REPORT_PATH);
  if (!source) {
    return null;
  }
  try {
    return JSON.parse(source) as DeviceLayoutScoreReport;
  } catch (error) {
    failures.push(`${DEVICE_LAYOUT_SCORE_REPORT_PATH} must be valid JSON: ${(error as Error).message}`);
    return null;
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

function validateFinding(finding: DeviceLayoutFinding, index: number) {
  for (const key of ["id", "title", "severity", "category", "filePath", "escalation", "docsBasis"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`findings[${index}].${key} must be a non-empty string.`);
    }
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    failures.push(`findings[${index}].severity is invalid.`);
  }
  if (![
    "breakpoint",
    "display_mode",
    "viewport",
    "safe_area",
    "top_nav",
    "bottom_nav",
    "floating_control",
    "chat_shell",
    "modal_sheet",
    "drop_preview",
    "touch_target",
    "input_delay",
    "telemetry_debug",
    "content_protection",
    "apple_cohesion",
    "orphaned_logic",
  ].includes(finding.category)) {
    failures.push(`findings[${index}].category is invalid.`);
  }
  requireNumber(finding.scoreImpact, `findings[${index}].scoreImpact`, -25, 0);
  if (typeof finding.canAutofix !== "boolean") {
    failures.push(`findings[${index}].canAutofix must be boolean.`);
  }
  requireNumber(finding.autofixConfidence, `findings[${index}].autofixConfidence`, 0, 1);
  if (finding.canAutofix && finding.autofixConfidence >= 0.95 && !finding.autofixPlan) {
    failures.push(`findings[${index}] needs an autofixPlan for high-confidence autofix.`);
  }
}

const report = readReport();
if (report) {
  requireNumber(report.score, "score", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    failures.push("status must be a valid device layout status.");
  }
  if (report.status !== expectedStatus(report.score, report.criticalCount)) {
    failures.push("status must match score thresholds and critical auto-fail behavior.");
  }
  if (!Array.isArray(report.displayModeCoverage) || !report.displayModeCoverage.includes("standalone-pwa")) {
    failures.push("displayModeCoverage must include standalone-pwa.");
  }
  if (!Array.isArray(report.breakpointCoverage) || !report.breakpointCoverage.some((entry) => entry.startsWith("ultra-wide:1600"))) {
    failures.push("breakpointCoverage must include ultra-wide:1600-infinity.");
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
    const safeAutofixesAvailable = report.findings.filter((finding) => finding.canAutofix && finding.autofixConfidence >= 0.95).length;
    if (safeAutofixesAvailable !== report.safeAutofixesAvailable) {
      failures.push("safeAutofixesAvailable must match high-confidence autofixable findings.");
    }
    if (criticalCount > 0 && report.status !== "fail") {
      failures.push("critical findings must force fail status.");
    }
  }
  requireNumber(report.safeAutofixesAvailable, "safeAutofixesAvailable", 0, 10_000);
  requireNumber(report.safeAutofixesApplied, "safeAutofixesApplied", 0, 10_000);
  if (typeof report.summary !== "string" || report.summary.trim().length === 0) {
    failures.push("summary must be a non-empty string.");
  }
}

const core = readRequired("src/lib/device-layout-score.ts");
const scoreScript = readRequired("scripts/agent/score-device-layout-contract.ts");
const repairScript = readRequired("scripts/agent/repair-device-layout-contract.ts");
const validatorScript = readRequired("scripts/agent/validate-device-layout-score.ts");
const docs = readRequired("docs/agent-truth/device-layout-score.md");
const contractDocs = readRequired("docs/agent-truth/device-layout-contract.md");
const packageJson = readRequired("package.json");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const ledger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");

for (const expected of [
  "DeviceLayoutFinding",
  "DeviceLayoutScoreReport",
  "severityScoreImpact",
  "scoreCaps",
  "buildDeviceLayoutScoreReport",
  "collectDeviceLayoutFindings",
  "buildDeviceLayoutAutofixPlans",
  "assertDeviceLayoutAutofixGate",
  "autofixConfidence < 0.95",
  "CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = \\\"0px\\\"",
  "bottom-[calc(env(safe-area-inset-bottom)+",
  "contentUrl",
]) {
  requireIncludes(core, expected, "Device layout scoring core");
}

for (const expected of [
  "score:layout",
  "repair:layout",
  "check:device-layout-score",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
  "\"score:layout\": \"tsx scripts/agent/score-device-layout-contract.ts\"",
  "\"repair:layout\": \"tsx scripts/agent/repair-device-layout-contract.ts\"",
  "\"check:device-layout-score\": \"tsx scripts/agent/validate-device-layout-score.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const source of [core, scoreScript, repairScript]) {
  requireNotIncludes(source, "node:child_process", "Device layout score default path");
  requireNotIncludes(source, "execSync", "Device layout score default path");
  requireNotIncludes(source, "spawn(", "Device layout score default path");
  requireNotIncludes(source, "playwright", "Device layout score default path");
  requireNotIncludes(source, "cypress", "Device layout score default path");
  requireNotIncludes(source, "lighthouse", "Device layout score default path");
}

for (const expected of [
  "dry-run",
  "--apply",
  "score decreased",
  "new critical findings",
]) {
  requireIncludes(repairScript, expected, "Device layout repair script");
}

const lowConfidenceFinding = {
  id: "test-low-confidence",
  title: "Low confidence test",
  severity: "major",
  category: "viewport",
  filePath: "src/components/Chat/ChatRouteShell.tsx",
  scoreImpact: -10,
  canAutofix: true,
  autofixConfidence: 0.94,
  escalation: "test",
  docsBasis: "repo",
} satisfies DeviceLayoutFinding;
const lowConfidencePlan = {
  findingId: "test-low-confidence",
  filePath: "src/components/Chat/ChatRouteShell.tsx",
  oldText: "100vh",
  newText: "100dvh",
  expectedOccurrences: 1,
  description: "test",
  confidence: 0.94,
} satisfies DeviceLayoutAutofixPlan;
if (!assertDeviceLayoutAutofixGate(lowConfidenceFinding, lowConfidencePlan, "height: 100vh;")) {
  failures.push("Autofix gate must refuse confidence below 0.95.");
}

const doctrineNote = "KandyDrops layout scoring is deterministic.";
for (const [label, source] of [
  ["device layout score docs", docs],
  ["device layout contract docs", contractDocs],
  ["README", readme],
  ["AGENTS", agents],
  ["REPO_MEMORY_LEDGER", ledger],
  ["EVERY_FILE_FUNCTION_CHECKLIST", checklist],
  ["FULL_SCALE_CODEBASE_AUDIT", audit],
] as const) {
  requireIncludes(source, doctrineNote, label);
}

for (const expected of [
  "Google-style structure",
  "Apple-style cohesion",
  "auto-fix exact safe token/string replacements only",
  "keyboard runtime behavior",
  "locked content exposure",
]) {
  requireIncludes(docs, expected, "Device layout score docs");
}

requireIncludes(scoreScript, "writeDeviceLayoutScoreReport", "Device layout score script");
requireIncludes(validatorScript, "critical findings must force fail status", "Device layout score validator");

if (failures.length > 0) {
  console.error("Device layout score validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Device layout score validation passed.");
