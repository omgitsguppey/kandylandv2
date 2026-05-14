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

const report = readJson("agent/state/provider-smoke-evidence.generated.json");
const paypal = record(report.paypalRefillSmoke);
const provider = record(report.providerSmoke);
const readinessImpact = record(report.readinessImpact);
const providerDoc = readRequired("docs/agent-truth/provider-smoke-evidence.md");
const paypalDoc = readRequired("docs/agent-truth/paypal-smoke-evidence.md");
const packageJson = readRequired("package.json");

if (report.reportKey !== "provider-smoke-evidence") failures.push("provider smoke reportKey must be provider-smoke-evidence.");
if (typeof report.generatedAtUtc !== "string" || Number.isNaN(Date.parse(report.generatedAtUtc))) {
  failures.push("provider smoke generatedAtUtc must be parseable UTC.");
}
if (typeof report.currentHead !== "string" || report.currentHead.includes("pending")) {
  failures.push("provider smoke currentHead must be recorded.");
}
if (report.overallStatus !== "missing_formal_evidence") {
  failures.push("Provider smoke overallStatus must remain missing_formal_evidence until formal repo evidence exists.");
}
for (const [key, value] of Object.entries({
  productionReadsPerformed: report.productionReadsPerformed,
  providerCallsPerformed: report.providerCallsPerformed,
  bigQueryCallsPerformed: report.bigQueryCallsPerformed,
  ga4PosthogCallsPerformed: report.ga4PosthogCallsPerformed,
  deploymentPerformed: report.deploymentPerformed,
})) {
  requireFalse(value, `provider smoke ${key}`);
}

if (paypal.status !== "operator_reported_not_formal_provider_smoke") {
  failures.push("PayPal refill smoke must be operator_reported_not_formal_provider_smoke without formal evidence.");
}
requireIncludes(String(paypal.note ?? ""), "Operator reported PayPal refill was tested yesterday, but no repo evidence artifact/log/screenshot was attached.", "PayPal smoke note");
requireFalse(paypal.formalRepoArtifactAttached, "paypal.formalRepoArtifactAttached");
requireFalse(paypal.passed, "paypal.passed");
if (!Array.isArray(paypal.machineEvidenceFiles) || paypal.machineEvidenceFiles.length !== 0) {
  failures.push("paypal.machineEvidenceFiles must be empty until an artifact is attached.");
}

if (provider.status !== "missing_formal_evidence") failures.push("providerSmoke.status must be missing_formal_evidence.");
requireFalse(provider.formalRepoArtifactAttached, "providerSmoke.formalRepoArtifactAttached");
requireFalse(provider.passed, "providerSmoke.passed");
requireFalse(readinessImpact.providerSmokeGatePassed, "readinessImpact.providerSmokeGatePassed");
requireFalse(readinessImpact.paypalSmokeGatePassed, "readinessImpact.paypalSmokeGatePassed");

for (const expected of [
  "Status: `missing_formal_evidence`",
  "Status: `operator_reported_not_formal_provider_smoke`",
  "This report does not mark PayPal smoke as passed.",
  "No formal provider smoke artifact exists",
]) {
  requireIncludes(providerDoc + paypalDoc, expected, "provider/PayPal smoke docs");
}
for (const forbidden of [
  "PayPal smoke passed",
  "provider smoke passed",
  "formal provider smoke passed",
]) {
  requireNotIncludes(providerDoc + paypalDoc, forbidden, "provider/PayPal smoke docs");
}
requireIncludes(packageJson, "\"check:provider-smoke-evidence\"", "package.json");
requireIncludes(packageJson, "scripts/agent/validate-provider-smoke-evidence.ts", "package.json");

if (failures.length > 0) {
  console.error("Provider smoke evidence validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Provider smoke evidence validation passed.");
