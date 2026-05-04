import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    fail(`${label} must include "${expected}".`);
  }
}

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    fail(`${label} must not include "${forbidden}".`);
  }
}

function requireRegex(source: string, pattern: RegExp, label: string) {
  if (!pattern.test(source)) {
    fail(`${label} must match ${pattern}.`);
  }
}

function lineCount(source: string) {
  return source.split(/\r?\n/u).length;
}

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const helper = readRequired("src/lib/admin-debug-control-tower.ts");
const apiRoute = readRequired("src/app/api/admin/debug/control-tower/route.ts");
const runtimeHealth = readRequired("src/lib/route-runtime-health.ts");
const debugTabNow = readRequired("src/app/admin/debug/components/DebugTabNow.tsx");
const controlTower = readRequired("src/app/admin/debug/components/DebugControlTower.tsx");
const controlTowerCards = readRequired("src/app/admin/debug/components/DebugControlTowerCards.tsx");
const modelTest = readRequired("tests/unit/admin-debug-control-tower.spec.ts");
const componentTest = readRequired("tests/unit/admin-debug-control-tower-component.spec.tsx");
const controlTowerDoc = readRequired("docs/agent-truth/admin-debug-control-tower.md");
const adminTruthDoc = readRequired("docs/agent-truth/human-readable-admin-truth.md");
const evidenceDoc = readRequired("docs/agent-truth/debug-evidence-pipeline.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const repoMemory = readRequired("REPO_MEMORY_LEDGER.md");

if (packageJson.scripts?.["check:admin-debug-control-tower"] !== "tsx scripts/agent/validate-admin-debug-control-tower.ts") {
  fail("package.json must expose check:admin-debug-control-tower.");
}

for (const expected of [
  "ADMIN_DEBUG_CONTROL_TOWER_REPORTS",
  "public-beta-score.generated.json",
  "speed-security-hardening.generated.json",
  "codebase-hardening.generated.json",
  "device-ui-dry-audit.generated.json",
  "content-protection-score.generated.json",
  "gumdrop-economy-score.generated.json",
  "google-cost-bleed.generated.json",
  "cloudrun-sql-bigquery-guardrails.generated.json",
  "telemetry-parity-score.generated.json",
  "debug-evidence-index.generated.json",
  "precatch-runtime-issues.generated.json",
  "Required generated state is missing and cannot be treated as healthy.",
  "FRESH_MS = 24 * ONE_HOUR_MS",
  "STALE_MAJOR_MS = 72 * ONE_HOUR_MS",
  "nextActions",
  "debugEvidence",
  "slice(0, 10)",
]) {
  requireIncludes(helper, expected, "Admin debug control tower model helper");
}

for (const expected of [
  "guardApiRequest",
  "auth: \"admin\"",
  "listRecentDebugEvidence",
  "buildAdminDebugControlTowerModel",
  "Cache-Control",
  "private, max-age=30",
  "withRouteRuntimeHealth",
  "recordRouteRuntimeSample",
]) {
  requireIncludes(apiRoute, expected, "Admin debug control tower API route");
}
requireIncludes(runtimeHealth, "admin/debug/control-tower:GET", "Route runtime health targets");

for (const expected of [
  "import { DebugControlTower }",
  "<DebugControlTower />",
  "<DebugNowDiagnostics",
  "Creator Lane",
  "System health now",
]) {
  requireIncludes(debugTabNow, expected, "DebugTabNow must keep old diagnostics while mounting Control Tower");
}

for (const expected of [
  "data-admin-debug-v2=\"control-tower\"",
  "data-debug-mobile-layout=\"compact-card-stack\"",
  "data-debug-report-source",
  "data-debug-report-freshness",
  "data-debug-truth-state",
  "data-debug-critical-count",
  "data-debug-next-action-count",
  "Control Tower",
  "Public beta truth, live evidence, and next actions.",
  "Recommended Next Actions",
  "Live Issues",
  "min-h-11",
  "authFetch(\"/api/admin/debug/control-tower\")",
  "reportClientIssue",
]) {
  requireIncludes(controlTower, expected, "Admin debug Control Tower UI");
}

for (const expected of [
  "Beta Readiness",
  "Device + UI",
  "Money + Cost",
  "Telemetry + Behavior",
  "Support + Creator Monetization",
  "Top findings",
  "<details",
  "missing",
  "stale",
  "toBadgeState",
]) {
  requireIncludes(controlTowerCards, expected, "Admin debug Control Tower card layer");
}

for (const forbidden of [
  "setInterval",
  "useAdminPollingSWR",
  "JSON.stringify(",
  "<pre",
  "supportMessageBody",
  "rawSupportBody",
  "messageBody",
]) {
  requireNotIncludes(controlTower + controlTowerCards, forbidden, "Admin debug Control Tower UI must stay compact and redacted");
}

if (lineCount(controlTower) > 300) {
  fail(`DebugControlTower.tsx must stay below 300 lines; found ${lineCount(controlTower)}.`);
}
if (lineCount(controlTowerCards) > 300) {
  fail(`DebugControlTowerCards.tsx must stay below 300 lines; found ${lineCount(controlTowerCards)}.`);
}

for (const expected of [
  "labels required missing reports as missing and critical",
  "labels stale reports as stale instead of live",
  "surfaces critical findings and next actions first",
  "keeps debug evidence redacted and support-scoped",
]) {
  requireIncludes(modelTest, expected, "Admin debug Control Tower model tests");
}

for (const expected of [
  "renders mobile compact control tower sections without sensitive bodies",
  "data-admin-debug-v2",
  "Public Beta",
  "Device + UI",
  "Money + Cost",
  "Support message detail route returned forbidden.",
  "not.toContain(\"secret support body\")",
]) {
  requireIncludes(componentTest, expected, "Admin debug Control Tower component tests");
}

const doctrineBundle = [controlTowerDoc, adminTruthDoc, evidenceDoc, readme, agents, repoMemory].join("\n");
for (const expected of [
  "Admin Debug v2 is the mobile-first Control Tower",
  "Missing or stale data must never be shown as healthy",
  "Heavy raw JSON stays collapsed",
  "Existing ops health and creator lane parity remain",
]) {
  requireIncludes(doctrineBundle, expected, "Admin debug Control Tower doctrine docs");
}

requireRegex(controlTowerDoc, /Beta Readiness[\s\S]*Live Issues[\s\S]*Device \+ UI[\s\S]*Money \+ Cost[\s\S]*Telemetry \+ Behavior[\s\S]*Support \+ Creator Monetization/u, "Control Tower docs must describe the required information architecture");

try {
  const changedFiles = execSync("git diff --name-only", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const allowedPatterns = [
    /^src\/lib\/admin-debug-control-tower\.ts$/u,
    /^src\/lib\/route-runtime-health\.ts$/u,
    /^src\/app\/api\/admin\/debug\/control-tower\/route\.ts$/u,
    /^src\/app\/admin\/debug\/components\/DebugControlTower(?:Cards)?\.tsx$/u,
    /^src\/app\/admin\/debug\/components\/DebugTabNow\.tsx$/u,
    /^scripts\/agent\/validate-admin-debug-control-tower\.ts$/u,
    /^tests\/unit\/admin-debug-control-tower(?:-component)?\.spec\.tsx?$/u,
    /^docs\/agent-truth\/admin-debug-control-tower\.md$/u,
    /^docs\/agent-truth\/human-readable-admin-truth\.md$/u,
    /^docs\/agent-truth\/debug-evidence-pipeline\.md$/u,
    /^README\.md$/u,
    /^AGENTS\.md$/u,
    /^REPO_MEMORY_LEDGER\.md$/u,
    /^EVERY_FILE_FUNCTION_CHECKLIST\.md$/u,
    /^FULL_SCALE_CODEBASE_AUDIT\.md$/u,
    /^package\.json$/u,
  ];
  const unexpected = changedFiles.filter((filePath) => !allowedPatterns.some((pattern) => pattern.test(filePath.replace(/\\/g, "/"))));
  if (unexpected.length > 0) {
    fail(`Admin debug Control Tower pass must not touch public UI or unrelated surfaces. Unexpected diff: ${unexpected.join(", ")}`);
  }
} catch (error) {
  fail(`Unable to inspect changed files: ${(error as Error).message}`);
}

if (failures.length > 0) {
  console.error("Admin debug Control Tower validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin debug Control Tower validation passed.");
