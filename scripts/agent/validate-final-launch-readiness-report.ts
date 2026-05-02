import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

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

const gates = requireArray(report.gates, "report.gates", REQUIRED_GATES.length).map(asRecord);
const gateByKey = new Map(gates.map((gate) => [String(gate.gateKey), gate]));

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

const validationsRun = requireArray(report.validationsRun, "report.validationsRun", REQUIRED_COMMANDS.length).map(asRecord);
const commandSet = new Set(validationsRun.map((entry) => String(entry.command)));
for (const command of REQUIRED_COMMANDS) {
  if (!commandSet.has(command)) {
    failures.push(`validationsRun must include ${command}.`);
  }
}

const deploymentCheck = validationsRun.find((entry) => entry.command === "npm run check:deployment");
if (!deploymentCheck || deploymentCheck.status !== "warn" || !String(deploymentCheck.detail ?? "").toLowerCase().includes("unavailable")) {
  failures.push("Report must record npm run check:deployment as an unavailable warning.");
}

if (!report.summary || asRecord(report.summary).hardStopGatesPassed !== true) {
  failures.push("summary.hardStopGatesPassed must be true for this launch decision.");
}
if (asRecord(report.summary).runtimeCodeChanged !== false || asRecord(report.summary).featuresAdded !== false) {
  failures.push("summary must record no runtime code changes and no features added.");
}

for (const expected of [
  "LAUNCHABLE WITH WARNINGS",
  "User critical path passed",
  "Payment, wallet, unlock, and content entitlement passed",
  "Security role boundaries and Firebase rules passed",
  "npm run check:deployment",
  "GO WITH WARNINGS",
]) {
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
