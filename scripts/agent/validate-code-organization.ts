import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH,
  CODE_ORGANIZATION_CONTEXT_INDEX_PATH,
  CODE_ORGANIZATION_DOCTRINE_DOC_PATH,
  CODE_ORGANIZATION_DOCTRINE_NOTE,
  CODE_ORGANIZATION_FEATURES,
  CODE_ORGANIZATION_FEATURE_CHILDREN,
  CODE_ORGANIZATION_FORBIDDEN_COMMANDS,
  CODE_ORGANIZATION_REPORT_PATH,
  CODE_ORGANIZATION_ROUTE_GROUPS,
  CODE_ORGANIZATION_SCORE_BUCKETS,
  CODE_ORGANIZATION_TRUTH_LAYER_ORDER,
  type CodeOrganizationFinding,
  type CodeOrganizationReport,
} from "../../src/lib/code-organization/code-organization-contract";

const root = process.cwd();
const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
}

function readRequired(filePath: string) {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) {
    fail(`Missing required file: ${filePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function parseJson<T>(filePath: string, source: string) {
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    fail(`${filePath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} must include "${needle}".`);
  }
}

function requireNumber(value: unknown, label: string, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    fail(`${label} must be a number between ${min} and ${max}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function validateFinding(finding: CodeOrganizationFinding, index: number) {
  for (const field of [
    "id",
    "bucket",
    "severity",
    "filePath",
    "title",
    "expectedRule",
    "actualPattern",
    "suggestedFix",
  ] as const) {
    if (typeof finding[field] !== "string" || finding[field].trim().length === 0) {
      fail(`findings[${index}].${field} must be a non-empty string.`);
    }
  }

  if (!CODE_ORGANIZATION_SCORE_BUCKETS.some((bucket) => bucket.key === finding.bucket)) {
    fail(`findings[${index}].bucket is not an allowed code organization bucket.`);
  }
  if (!["info", "warning", "review_required", "critical"].includes(finding.severity)) {
    fail(`findings[${index}].severity is invalid.`);
  }
  if (!Array.isArray(finding.evidence) || finding.evidence.length === 0) {
    fail(`findings[${index}].evidence must be non-empty.`);
  }
}

function requireArray(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array.`);
    return [];
  }
  return value;
}

function validateReport(report: CodeOrganizationReport) {
  requireNumber(report.overallScore, "overallScore", 0, 100);
  if (!["clean", "pass", "warning", "review_required", "fail"].includes(report.status)) {
    fail("Report status must be valid.");
  }
  if (report.doctrine?.note !== CODE_ORGANIZATION_DOCTRINE_NOTE) {
    fail("Report doctrine note must match the contract doctrine note.");
  }
  if (!isRecord(report.bucketScores)) {
    fail("Report bucketScores must be present.");
  } else {
    const totalWeight = CODE_ORGANIZATION_SCORE_BUCKETS.reduce((sum, bucket) => sum + bucket.weight, 0);
    if (totalWeight !== 100) {
      fail("Code organization bucket weights must total 100.");
    }
    for (const bucket of CODE_ORGANIZATION_SCORE_BUCKETS) {
      const score = report.bucketScores[bucket.key];
      if (!score) {
        fail(`Report missing bucket score for ${bucket.key}.`);
        continue;
      }
      requireNumber(score.weight, `${bucket.key}.weight`, 0, 100);
      requireNumber(score.score, `${bucket.key}.score`, 0, 100);
      requireNumber(score.findingCount, `${bucket.key}.findingCount`, 0, 100_000);
      if (score.weight !== bucket.weight) {
        fail(`${bucket.key}.weight must equal contract weight ${bucket.weight}.`);
      }
    }
  }

  requireArray(report.findings, "findings").forEach((finding, index) =>
    validateFinding(finding as CodeOrganizationFinding, index),
  );
  if (report.criticalFindings?.length > 0 && report.status !== "fail") {
    fail("Critical findings must force report status to fail.");
  }

  for (const [field, minimum] of [
    ["largestSourceFiles", 1],
    ["largestDocs", 1],
    ["largestGeneratedStateFiles", 1],
    ["vagueHelperFiles", 0],
    ["misplacedFeatureLogicInSrcLib", 0],
    ["routeHandlersWithTooManyResponsibilities", 0],
    ["duplicateMetricScoringFormulas", 0],
    ["componentSplitCandidates", 0],
    ["missingFeatureOwnership", CODE_ORGANIZATION_FEATURES.length],
    ["legacyFilesWithoutPhaseOut", 0],
    ["docsLackingCompactCards", 0],
    ["suggestedFeatureFolderMigrations", CODE_ORGANIZATION_FEATURES.length],
  ] as const) {
    const arrayValue = requireArray(report[field], field);
    if (arrayValue.length < minimum) {
      fail(`${field} must include at least ${minimum} entries.`);
    }
  }

  const migrationFeatures = new Set(report.suggestedFeatureFolderMigrations?.map((entry) => entry.feature));
  for (const feature of CODE_ORGANIZATION_FEATURES) {
    if (!migrationFeatures.has(feature)) {
      fail(`Migration plan missing feature target: ${feature}.`);
    }
  }

  for (const command of ["npm run score:code-organization", "npm run check:code-organization"]) {
    if (!report.minimalCommands?.includes(command)) {
      fail(`Report minimalCommands must include ${command}.`);
    }
  }
  for (const forbidden of CODE_ORGANIZATION_FORBIDDEN_COMMANDS) {
    if (!report.forbiddenCommands?.includes(forbidden)) {
      fail(`Report forbiddenCommands must include ${forbidden}.`);
    }
  }
}

const requiredFiles = [
  "src/lib/code-organization/code-organization-contract.ts",
  "scripts/agent/score-code-organization.ts",
  "scripts/agent/validate-code-organization.ts",
  CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH,
  CODE_ORGANIZATION_DOCTRINE_DOC_PATH,
  CODE_ORGANIZATION_REPORT_PATH,
  CODE_ORGANIZATION_CONTEXT_INDEX_PATH,
];

for (const filePath of requiredFiles) {
  readRequired(filePath);
}

const reportSource = readRequired(CODE_ORGANIZATION_REPORT_PATH);
const report = reportSource ? parseJson<CodeOrganizationReport>(CODE_ORGANIZATION_REPORT_PATH, reportSource) : null;
if (report) {
  validateReport(report);
}

const contextSource = readRequired(CODE_ORGANIZATION_CONTEXT_INDEX_PATH);
const context = contextSource ? parseJson<Record<string, unknown>>(CODE_ORGANIZATION_CONTEXT_INDEX_PATH, contextSource) : null;
if (context) {
  if (context.surface !== "code-organization") {
    fail("Compact code organization index must declare surface code-organization.");
  }
  const loadPlan = requireArray(context.loadPlan, "context.loadPlan");
  for (const required of [CODE_ORGANIZATION_REPORT_PATH, CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH, CODE_ORGANIZATION_DOCTRINE_DOC_PATH]) {
    if (!loadPlan.includes(required)) {
      fail(`Compact code organization loadPlan must include ${required}.`);
    }
  }
}

const packageJson = readRequired("package.json");
for (const expected of [
  '"score:code-organization": "tsx scripts/agent/score-code-organization.ts"',
  '"check:code-organization": "tsx scripts/agent/validate-code-organization.ts"',
]) {
  requireIncludes(packageJson, expected, "package.json scripts");
}

const agentTruthDoc = readRequired(CODE_ORGANIZATION_AGENT_TRUTH_DOC_PATH);
const productDoctrineDoc = readRequired(CODE_ORGANIZATION_DOCTRINE_DOC_PATH);
for (const [label, source] of [
  ["agent truth doc", agentTruthDoc],
  ["product doctrine doc", productDoctrineDoc],
] as const) {
  for (const needle of [
    CODE_ORGANIZATION_DOCTRINE_NOTE,
    "src/app is for route entrypoints only",
    "src/features is for domain/product ownership",
    "contract -> server truth -> client projection -> UI display -> telemetry -> validator -> docs",
    "Do not perform route move automatically",
    "Large markdown docs must have compact doctrine card",
    "blocked legacy cannot be imported by canonical runtime",
  ]) {
    requireIncludes(source, needle, label);
  }
  for (const feature of CODE_ORGANIZATION_FEATURES) {
    requireIncludes(source, `src/features/${feature}`, label);
  }
  for (const child of CODE_ORGANIZATION_FEATURE_CHILDREN) {
    requireIncludes(source, child, label);
  }
  for (const group of CODE_ORGANIZATION_ROUTE_GROUPS) {
    requireIncludes(source, group, label);
  }
  for (const layer of CODE_ORGANIZATION_TRUTH_LAYER_ORDER) {
    requireIncludes(source, layer, label);
  }
}

const scoreScript = readRequired("scripts/agent/score-code-organization.ts");
const validateScript = readRequired("scripts/agent/validate-code-organization.ts");
const contract = readRequired("src/lib/code-organization/code-organization-contract.ts");
for (const [label, source] of [
  ["score script", scoreScript],
  ["validator script", validateScript],
  ["contract", contract],
] as const) {
  const childProcessModule = "node:child" + "_process";
  const forbiddenNeedles = [
    `from "${childProcessModule}"`,
    `from '${childProcessModule}'`,
    "exec" + "Sync(",
    "exec" + "FileSync(",
    "spawn" + "(",
  ];
  for (const forbidden of forbiddenNeedles) {
    if (source.includes(forbidden)) {
      fail(`${label} must not invoke broad audit commands or child-process runners.`);
    }
  }
}

if (failures.length > 0) {
  console.error("Code organization validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Code organization validation passed.");
