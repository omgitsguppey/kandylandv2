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
  if (!source.includes(expected)) fail(`${label} must include "${expected}".`);
}

const packageJson = JSON.parse(readRequired("package.json")) as { scripts?: Record<string, string> };
const validateScript = readRequired("scripts/validate-behavioral-models.ts");
const trainScript = readRequired("scripts/train-behavioral-models.ts");
const mlRanker = readRequired("src/lib/recommendations/ml-ranker.ts");
const doc = readRequired("docs/agent-truth/math-goal-alignment.md");
const report = JSON.parse(readRequired("agent/state/behavioral-model-validation.generated.json") || "{}") as Record<string, unknown>;

if (packageJson.scripts?.["train:behavioral-models"] !== "tsx scripts/train-behavioral-models.ts") {
  fail("package.json must expose train:behavioral-models.");
}
if (packageJson.scripts?.["validate:behavioral-models"] !== "tsx scripts/validate-behavioral-models.ts") {
  fail("package.json must expose validate:behavioral-models.");
}
if (packageJson.scripts?.["check:math-goal-alignment"] !== "tsx scripts/agent/validate-math-goal-alignment.ts") {
  fail("package.json must expose check:math-goal-alignment.");
}

for (const expected of [
  "behavioral-model-validation.generated.json",
  "\"time_based\"",
  "precisionAt5",
  "precisionAt10",
  "recallAt10",
  "calibrationError",
  "falsePositiveRate",
  "staleSourceRate",
  "sourceDisagreementRate",
  "recommendationRanker",
  "watchTimeEstimation",
  "theftRiskScore",
  "behavioralConfidenceScore",
]) requireIncludes(validateScript, expected, "Behavioral validation script");

for (const expected of [
  "train:recommendations",
  "validate:behavioral-models",
]) requireIncludes(trainScript, expected, "Behavioral training script");

for (const expected of [
  "behavioral-model-validation.generated.json",
  "activeMode !== \"hybrid\" && activeMode !== \"ml_active\"",
]) requireIncludes(mlRanker, expected, "Recommendation ML gate");

for (const expected of [
  "time-based split",
  "ML cannot activate without beating deterministic baseline",
  "If sample size < 50, no ML verdict, deterministic-only",
  "If sample size < 200, ML result is experimental",
]) requireIncludes(doc, expected, "Math goal alignment doc");

if (typeof report.version !== "number") fail("Validation report must include numeric version.");
if (typeof report.generatedAt !== "string") fail("Validation report must include generatedAt.");
if (typeof report.overallStatus !== "string") fail("Validation report must include overallStatus.");
if (typeof report.overallActiveMode !== "string") fail("Validation report must include overallActiveMode.");

const models = (report.models as Record<string, unknown> | undefined) ?? {};
for (const key of [
  "userEngagementScore",
  "userValueScore",
  "recommendationRanker",
  "watchTimeEstimation",
  "theftRiskScore",
  "behavioralConfidenceScore",
]) {
  const model = models[key] as Record<string, unknown> | undefined;
  if (!model) {
    fail(`Validation report must include ${key}.`);
    continue;
  }
  if (typeof model.activeMode !== "string") fail(`${key} must include activeMode.`);
  if (typeof model.trainingSampleSize !== "number") fail(`${key} must include trainingSampleSize.`);
  if (typeof model.validationSampleSize !== "number") fail(`${key} must include validationSampleSize.`);
  if (!model.metrics || typeof model.metrics !== "object") fail(`${key} must include metrics.`);
  if (!model.baselineComparison || typeof model.baselineComparison !== "object") fail(`${key} must include baselineComparison.`);
}

if (failures.length > 0) {
  console.error("Math goal alignment validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Math goal alignment validation passed.");
