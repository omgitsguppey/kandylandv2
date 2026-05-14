import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

function readJson(relativePath: string) {
  const source = readRequired(relativePath);
  if (!source) return {} as Record<string, unknown>;
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {} as Record<string, unknown>;
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

function requireNotIncludes(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) failures.push(`${label} must not include "${forbidden}".`);
}

function requireFalse(value: unknown, label: string) {
  if (value !== false) failures.push(`${label} must be false.`);
}

const report = readJson("agent/state/runtime-smoke-evidence.generated.json");
const readinessImpact = record(report.readinessImpact);
const doc = readRequired("docs/agent-truth/runtime-smoke-evidence.md");
const packageJson = readRequired("package.json");

if (report.reportKey !== "runtime-smoke-evidence") failures.push("runtime smoke reportKey must be runtime-smoke-evidence.");
if (typeof report.generatedAtUtc !== "string" || Number.isNaN(Date.parse(report.generatedAtUtc))) {
  failures.push("runtime smoke generatedAtUtc must be parseable UTC.");
}
if (typeof report.currentHead !== "string" || report.currentHead.includes("pending")) {
  failures.push("runtime smoke currentHead must be recorded.");
}
if (report.overallStatus !== "runtime_unverified") failures.push("runtime smoke overallStatus must be runtime_unverified.");
if (report.localEvidenceStatus !== "local_static_validators_recorded") {
  failures.push("runtime smoke localEvidenceStatus must be local_static_validators_recorded.");
}
for (const [key, value] of Object.entries({
  productionReadsPerformed: report.productionReadsPerformed,
  providerCallsPerformed: report.providerCallsPerformed,
  bigQueryCallsPerformed: report.bigQueryCallsPerformed,
  ga4PosthogCallsPerformed: report.ga4PosthogCallsPerformed,
  deploymentPerformed: report.deploymentPerformed,
  runtimeDeploymentSmokePassed: report.runtimeDeploymentSmokePassed,
  runtimeGatePassed: readinessImpact.runtimeGatePassed,
})) {
  requireFalse(value, `runtime smoke ${key}`);
}
const evidenceItems = Array.isArray(report.evidenceItems) ? report.evidenceItems.map(record) : [];
for (const command of ["npm run typecheck", "npm run check:release-notes"]) {
  if (!evidenceItems.some((item) => item.command === command)) {
    failures.push(`runtime smoke evidenceItems must include ${command}.`);
  }
}
for (const expected of [
  "Status: `runtime_unverified`",
  "This pass records local/static runtime evidence only.",
  "Local validators may prove source and contract safety, but they do not prove deployed runtime behavior.",
  "Do not clear runtime smoke from local static validators.",
]) {
  requireIncludes(doc, expected, "runtime smoke doc");
}
for (const forbidden of [
  "runtime smoke passed",
  "deployed runtime passed",
  "production runtime verified",
]) {
  requireNotIncludes(doc, forbidden, "runtime smoke doc");
}
requireIncludes(packageJson, "\"check:runtime-smoke-evidence\"", "package.json");
requireIncludes(packageJson, "scripts/agent/validate-runtime-smoke-evidence.ts", "package.json");

if (failures.length > 0) {
  console.error("Runtime smoke evidence validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Runtime smoke evidence validation passed.");
