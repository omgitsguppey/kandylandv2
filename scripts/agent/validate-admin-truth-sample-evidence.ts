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

const report = readJson("agent/state/admin-truth-sample-evidence.generated.json");
const readinessImpact = record(report.readinessImpact);
const doc = readRequired("docs/agent-truth/admin-truth-sample-evidence.md");
const packageJson = readRequired("package.json");

if (report.reportKey !== "admin-truth-sample-evidence") failures.push("admin truth sample reportKey must be admin-truth-sample-evidence.");
if (typeof report.generatedAtUtc !== "string" || Number.isNaN(Date.parse(report.generatedAtUtc))) {
  failures.push("admin truth sample generatedAtUtc must be parseable UTC.");
}
if (typeof report.currentHead !== "string" || report.currentHead.includes("pending")) {
  failures.push("admin truth sample currentHead must be recorded.");
}
if (report.overallStatus !== "missing_or_unknown") failures.push("admin truth sample overallStatus must be missing_or_unknown.");
if (report.sampleCount !== 0) failures.push("admin truth sampleCount must be 0 until a sample artifact exists.");
for (const [key, value] of Object.entries({
  productionReadsPerformed: report.productionReadsPerformed,
  providerCallsPerformed: report.providerCallsPerformed,
  bigQueryCallsPerformed: report.bigQueryCallsPerformed,
  deploymentPerformed: report.deploymentPerformed,
  freshAdminTruthSampleAttached: report.freshAdminTruthSampleAttached,
  adminTruthSampleGatePassed: readinessImpact.adminTruthSampleGatePassed,
})) {
  requireFalse(value, `admin truth sample ${key}`);
}
if (!Array.isArray(report.sampleEvidenceFiles) || report.sampleEvidenceFiles.length !== 0) {
  failures.push("admin truth sampleEvidenceFiles must be empty until a sample is attached.");
}
for (const expected of [
  "Status: `missing_or_unknown`",
  "No fresh admin truth screenshot or JSON sample is attached",
  "does not prove current production sample values",
  "Do not treat empty Debug evidence or missing admin truth samples as healthy.",
]) {
  requireIncludes(doc, expected, "admin truth sample evidence doc");
}
for (const forbidden of [
  "admin truth sample passed",
  "admin samples healthy",
  "production samples verified",
]) {
  requireNotIncludes(doc, forbidden, "admin truth sample evidence doc");
}
requireIncludes(packageJson, "\"check:admin-truth-sample-evidence\"", "package.json");
requireIncludes(packageJson, "scripts/agent/validate-admin-truth-sample-evidence.ts", "package.json");

if (failures.length > 0) {
  console.error("Admin truth sample evidence validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin truth sample evidence validation passed.");
