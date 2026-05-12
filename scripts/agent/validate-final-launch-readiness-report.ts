import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];
const GENERATED_REPORT_STALE_MS = 24 * 60 * 60 * 1000;
const RUNTIME_ROOTS = ["src/app", "src/components", "src/lib/server", "functions/src"];
const RUNTIME_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

const REQUIRED_GATES = [
  "scope-freeze",
  "pr-triage",
  "user-critical-path",
  "payment-unlock-wallet-entitlement",
  "notification-return-loop",
  "security-rules-role-boundaries",
  "environment-deployment-truth",
  "background-jobs-idempotency",
  "admin-analytics-debug-truth",
  "speed-hydration-cache",
  "mobile-shell-pwa",
  "human-readable-copy",
  "accessibility-tap-targets",
  "design-system-drift",
  "content-media-pipeline",
  "admin-cms-workflow",
  "event-catalog-telemetry",
  "support-recovery",
  "legal-payment-copy",
  "test-fixtures-demo",
  "rollback-incident-response",
];

const HARD_STOP_GATES = [
  "user-critical-path",
  "payment-unlock-wallet-entitlement",
  "security-rules-role-boundaries",
  "content-media-pipeline",
];

const REQUIRED_COMMANDS = [
  "npm run check:launch-finalization-baseline",
  "npm run check:launch-pr-triage",
  "npm run check:user-critical-path-launch",
  "npm run check:payment-unlock-security",
  "npm run check:notification-return-loop",
  "npm run check:security-role-boundaries",
  "npm run check:environment-deployment-truth",
  "npm run check:background-job-idempotency",
  "npm run check:admin-analytics-finalization",
  "npm run check:global-speed-hydration-cache",
  "npm run check:mobile-shell-safe-area",
  "npm run check:pwa-service-worker",
  "npm run check:human-readable-admin-copy",
  "npm run check:accessibility-tap-targets",
  "npm run check:design-system-drift",
  "npm run check:content-media-pipeline",
  "npm run check:admin-cms-workflow",
  "npm run check:event-catalog-telemetry",
  "npm run check:support-recovery-flows",
  "npm run check:legal-payment-copy",
  "npm run check:test-fixtures-demo",
  "npm run check:rollback-incident-response",
  "npm run typecheck",
  "npm run check:functions",
  "npm run check:firebase:rules",
];

const EVIDENCE_REFRESH_COMMANDS = [
  "npm run score:beta",
  "npm run check:beta-score",
  "npm run check:launch-readiness-final",
  "npm run check:final-launch-readiness-report",
  "npm run typecheck",
];

const HONEST_READINESS_STATUSES = [
  "Ready",
  "Ready with smoke required",
  "Needs review",
  "Blocked",
  "Unknown evidence",
  "Stale evidence",
  "Runtime unverified",
  "Visual QA required",
];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  const buffer = readFileSync(fullPath);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }
  return buffer.toString("utf8").replace(/^\uFEFF/u, "");
}

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function parseDate(value: unknown, label: string) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    failures.push(`${label} must be a valid generatedAt timestamp.`);
    return null;
  }
  return Date.parse(value);
}

function walkRuntimeFiles(relativePath: string, output: string[] = []) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) return output;
  for (const entry of readdirSync(fullPath)) {
    const child = join(relativePath, entry).replace(/\\/gu, "/");
    const stats = statSync(join(root, child));
    if (stats.isDirectory()) {
      walkRuntimeFiles(child, output);
      continue;
    }
    if (RUNTIME_EXTENSIONS.some((extension) => child.endsWith(extension))) {
      output.push(child);
    }
  }
  return output;
}

function latestRuntimeModifiedMs() {
  try {
    const latestCommitDate = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...RUNTIME_ROOTS], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (latestCommitDate && !Number.isNaN(Date.parse(latestCommitDate))) {
      return Date.parse(latestCommitDate);
    }
  } catch {
    // Fall back to filesystem mtimes when git metadata is unavailable.
  }
  const runtimeFiles = RUNTIME_ROOTS.flatMap((runtimeRoot) => walkRuntimeFiles(runtimeRoot));
  return runtimeFiles.reduce((latest, filePath) => Math.max(latest, statSync(join(root, filePath)).mtimeMs), 0);
}

function countGatesByStatus(gates: Array<Record<string, unknown>>, status: string) {
  return gates.filter((gate) => gate.status === status).length;
}

const report = parseJson("agent/state/final-launch-readiness-report.generated.json");
const doc = readRequired("docs/agent-truth/final-launch-readiness-report.md");
const packageJson = readRequired("package.json");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

const launchDecision = report.launchDecision;
if (!["LAUNCHABLE", "LAUNCHABLE WITH WARNINGS", "NOT LAUNCHABLE"].includes(String(launchDecision))) {
  failures.push("launchDecision must be one of LAUNCHABLE, LAUNCHABLE WITH WARNINGS, NOT LAUNCHABLE.");
}
const reportMode = String(report.reportMode ?? "launch_signoff");
if (!["launch_signoff", "evidence_refresh"].includes(reportMode)) {
  failures.push("reportMode must be launch_signoff or evidence_refresh.");
}
if (reportMode === "evidence_refresh" && launchDecision !== "NOT LAUNCHABLE") {
  failures.push("Evidence refresh reports with missing smoke/visual evidence must use NOT LAUNCHABLE until evidence is recorded.");
}
if (reportMode === "evidence_refresh" && !HONEST_READINESS_STATUSES.includes(String(report.phaseOneStatus ?? report.readinessStatus))) {
  failures.push("Evidence refresh reports must expose an honest phaseOneStatus/readinessStatus.");
}

const generatedAtMs = parseDate(report.generatedAt, "report.generatedAt");
if (generatedAtMs && Date.now() - generatedAtMs > GENERATED_REPORT_STALE_MS && launchDecision !== "NOT LAUNCHABLE") {
  failures.push("Stale final launch readiness reports must not remain launchable; regenerate affected gates or mark NOT LAUNCHABLE/Needs review.");
}

const gates = requireArray(report.gates, "report.gates", REQUIRED_GATES.length).map(asRecord);
const gateByKey = new Map(gates.map((gate) => [String(gate.gateKey), gate]));
const passCount = countGatesByStatus(gates, "pass");
const warnCount = countGatesByStatus(gates, "warn");
const failCount = countGatesByStatus(gates, "fail");
const notRunCount = countGatesByStatus(gates, "not run");

for (const gateKey of REQUIRED_GATES) {
  const gate = gateByKey.get(gateKey);
  if (!gate) {
    failures.push(`Missing gate ${gateKey}.`);
    continue;
  }
  if (!["pass", "warn", "fail", "not run"].includes(String(gate.status))) {
    failures.push(`${gateKey}.status must be pass/warn/fail/not run.`);
  }
  requireArray(gate.evidenceFiles, `${gateKey}.evidenceFiles`, 1);
  requireArray(gate.validationsRun, `${gateKey}.validationsRun`, 1);
  if (!Array.isArray(gate.unresolvedBlockers)) {
    failures.push(`${gateKey}.unresolvedBlockers must be an array.`);
  }
  if (!Array.isArray(gate.unresolvedWarnings)) {
    failures.push(`${gateKey}.unresolvedWarnings must be an array.`);
  }
  if (typeof gate.launchRecommendation !== "string" || gate.launchRecommendation.trim().length === 0) {
    failures.push(`${gateKey}.launchRecommendation must be non-empty.`);
  }
  requireArray(gate.postLaunchTasks, `${gateKey}.postLaunchTasks`, 1);
}

for (const gateKey of HARD_STOP_GATES) {
  const gate = gateByKey.get(gateKey);
  if (!gate) continue;
  const blockers = Array.isArray(gate.unresolvedBlockers) ? gate.unresolvedBlockers : [];
  if ((gate.status === "fail" || blockers.length > 0) && launchDecision !== "NOT LAUNCHABLE") {
    failures.push(`${gateKey} is a hard-stop gate; failed status or blockers require NOT LAUNCHABLE.`);
  }
}

const overallBlockers = requireArray(report.overallUnresolvedBlockers, "overallUnresolvedBlockers", 0);
if (overallBlockers.length > 0 && launchDecision !== "NOT LAUNCHABLE") {
  failures.push("Any overall unresolved blocker requires NOT LAUNCHABLE.");
}

const summary = asRecord(report.summary);
if (summary.gatesPassed !== passCount || summary.gatesWarn !== warnCount || summary.gatesFailed !== failCount || summary.gatesNotRun !== notRunCount) {
  failures.push("summary gate counts must match the gate list; inconsistent launch summaries require Needs review.");
}
if (warnCount > 0 && launchDecision === "LAUNCHABLE") {
  failures.push("Launch warnings must reduce readiness confidence; LAUNCHABLE is not allowed while warning gates remain.");
}
if (String(report.requiredNextAction ?? "").toLowerCase().includes("smoke") && launchDecision === "LAUNCHABLE") {
  failures.push("Required production smoke must cap launch at warnings/smoke-required, not LAUNCHABLE.");
}

const requiredCommands = reportMode === "evidence_refresh" ? EVIDENCE_REFRESH_COMMANDS : REQUIRED_COMMANDS;
const validationsRun = requireArray(report.validationsRun, "report.validationsRun", requiredCommands.length).map(asRecord);
const commandSet = new Set(validationsRun.map((entry) => String(entry.command)));
for (const command of requiredCommands) {
  if (!commandSet.has(command)) {
    failures.push(`validationsRun must include ${command}.`);
  }
}

const deploymentCheck = validationsRun.find((entry) => entry.command === "npm run check:deployment");
if (reportMode !== "evidence_refresh" && (!deploymentCheck || deploymentCheck.status !== "warn" || !String(deploymentCheck.detail ?? "").toLowerCase().includes("unavailable"))) {
  failures.push("Report must record npm run check:deployment as an unavailable warning.");
}

if (!report.summary || (launchDecision !== "NOT LAUNCHABLE" && summary.hardStopGatesPassed !== true)) {
  failures.push("summary.hardStopGatesPassed must be true for this launch decision.");
}
if (launchDecision !== "NOT LAUNCHABLE" && (summary.runtimeCodeChanged !== false || summary.featuresAdded !== false)) {
  failures.push("summary must record no runtime code changes and no features added.");
}
if (generatedAtMs && summary.runtimeCodeChanged === false && latestRuntimeModifiedMs() > generatedAtMs) {
  failures.push("runtimeCodeChanged:false is stale because runtime files were modified after report.generatedAt.");
}

const docExpectations = reportMode === "evidence_refresh"
  ? [
    "Evidence-Aware Readiness Rule",
    "Visual QA required",
    "Ready with smoke required",
    "Unknown evidence",
    "NOT LAUNCHABLE",
  ]
  : [
    "LAUNCHABLE WITH WARNINGS",
    "User critical path passed",
    "Payment, wallet, unlock, and content entitlement passed",
    "Security role boundaries and Firebase rules passed",
    "npm run check:deployment",
    "GO WITH WARNINGS",
  ];
for (const expected of docExpectations) {
  requireIncludes(doc, expected, "Final launch readiness doc");
}

if (!packageJson.includes("\"check:final-launch-readiness-report\": \"tsx scripts/agent/validate-final-launch-readiness-report.ts\"")) {
  failures.push("package.json must expose check:final-launch-readiness-report.");
}
requireIncludes(fullAudit, "Final Launch Readiness Report", "FULL_SCALE_CODEBASE_AUDIT.md");
requireIncludes(repoLedger, "Final launch readiness is launchable with warnings", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Final Launch Readiness Report Coverage", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("Final launch readiness report validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Final launch readiness report validation passed.");
