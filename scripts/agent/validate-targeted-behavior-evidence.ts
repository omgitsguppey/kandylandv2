import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

const ARTIFACT_PATH = "agent/state/targeted-behavior-evidence.generated.json";
const DOC_PATH = "docs/agent-truth/targeted-behavior-evidence.md";

const REQUIRED_COMMANDS = [
  "npm run check:beta-score",
  "npm run check:provider-smoke-evidence",
  "npm run check:runtime-smoke-evidence",
  "npm run check:admin-truth-sample-evidence",
  "npm run check:phase-one-score-ui-triage",
  "npm run check:settings-creator-dashboard-split",
  "npm run check:watch-time-rollup-truth",
  "npm run check:admin-debug-control-tower",
  "npm run check:admin-truth",
] as const;

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function readJson(relativePath: string) {
  const source = readRequired(relativePath);
  if (!source) return {} as Record<string, unknown>;
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function requireFalse(value: unknown, label: string) {
  if (value !== false) failures.push(`${label} must be false.`);
}

const artifact = readJson(ARTIFACT_PATH);
const doc = readRequired(DOC_PATH);
const packageJson = readRequired("package.json");
const readinessImpact = record(artifact.readinessImpact);
const commands = Array.isArray(artifact.commands) ? artifact.commands.map(record) : [];

if (artifact.reportKey !== "targeted-behavior-evidence") {
  failures.push("targeted behavior reportKey must be targeted-behavior-evidence.");
}
if (typeof artifact.generatedAtUtc !== "string" || Number.isNaN(Date.parse(artifact.generatedAtUtc))) {
  failures.push("targeted behavior generatedAtUtc must be parseable UTC.");
}
if (typeof artifact.currentHead !== "string" || artifact.currentHead.length < 7 || artifact.currentHead.includes("pending")) {
  failures.push("targeted behavior currentHead must be recorded.");
}
for (const [key, value] of Object.entries({
  productionReadsPerformed: artifact.productionReadsPerformed,
  providerCallsPerformed: artifact.providerCallsPerformed,
  bigQueryCallsPerformed: artifact.bigQueryCallsPerformed,
  visualQaPerformed: artifact.visualQaPerformed,
  realDeviceSmokePerformed: artifact.realDeviceSmokePerformed,
})) {
  requireFalse(value, `targeted behavior ${key}`);
}
if (!["passed", "partial", "failed"].includes(String(artifact.overallStatus))) {
  failures.push("targeted behavior overallStatus must be passed, partial, or failed.");
}
if (typeof artifact.passed !== "boolean") {
  failures.push("targeted behavior passed must be boolean.");
}
if (commands.length === 0) {
  failures.push("targeted behavior commands must be a non-empty array.");
}

for (const requiredCommand of REQUIRED_COMMANDS) {
  const command = commands.find((entry) => entry.command === requiredCommand);
  if (!command) {
    failures.push(`targeted behavior commands must include ${requiredCommand}.`);
    continue;
  }
  if (!["pass", "fail", "unavailable"].includes(String(command.status))) {
    failures.push(`${requiredCommand} status must be pass, fail, or unavailable.`);
  }
  if (typeof command.proves !== "string" || command.proves.trim().length === 0) {
    failures.push(`${requiredCommand} must record what it proves.`);
  }
  const doesNotProve = String(command.doesNotProve ?? "");
  for (const expected of ["visual", "provider smoke", "runtime smoke", "real-device smoke"]) {
    requireIncludes(doesNotProve, expected, `${requiredCommand} doesNotProve`);
  }
}

if (artifact.passed === true) {
  for (const command of commands) {
    if (command.status !== "pass") {
      failures.push("targeted behavior passed=true requires every command status to be pass.");
    }
  }
  if (readinessImpact.targetedBehaviorGatePassed !== true) {
    failures.push("readinessImpact.targetedBehaviorGatePassed must be true when passed is true.");
  }
}

for (const expected of [
  "Status: `passed`",
  "Artifact: `agent/state/targeted-behavior-evidence.generated.json`",
  "Validator: `npm run check:targeted-behavior-evidence`",
  "visual/manual QA evidence",
  "provider smoke evidence",
  "real-device smoke evidence",
  "deployed runtime smoke evidence",
  "production admin truth samples",
]) {
  requireIncludes(doc, expected, DOC_PATH);
}

requireIncludes(packageJson, "\"check:targeted-behavior-evidence\"", "package.json");
requireIncludes(packageJson, "scripts/agent/validate-targeted-behavior-evidence.ts", "package.json");

if (failures.length > 0) {
  console.error("Targeted behavior evidence validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Targeted behavior evidence validation passed.");
