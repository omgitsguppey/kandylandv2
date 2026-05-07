import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Finding = {
  id: string;
  severity: string;
  category: string;
  title: string;
  filePath: string;
  scoreImpact: number;
  suggestedFix: string;
  evidence: unknown[];
};

type Report = {
  generatedAt: string;
  score: number;
  status: string;
  cloudRunFindings: Finding[];
  sqlFindings: Finding[];
  bigQueryFindings: Finding[];
  recommendedLimits: Array<Record<string, unknown>>;
  sqlCostSurfaces: Array<Record<string, unknown>>;
  bigQueryPipelines: Array<Record<string, unknown>>;
  manualCloudConsoleChecklist: string[];
  forbiddenRuntimePaths: readonly string[];
  allowedSqlMirrorPaths: readonly string[];
  bigQueryExportStatus: string;
  bigQueryImportStatus: string;
  minimalCommands: string[];
  forbiddenCommands: string[];
  suggestedCommands: string[];
  summary: string;
};

const root = process.cwd();
const failures: string[] = [];
const reportPath = "agent/state/cloudrun-sql-bigquery-guardrails.generated.json";

function readRequired(relativePath: string) {
  const fullPath = path.join(root, relativePath);
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

function requireNumber(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failures.push(`${label} must be a number between ${min} and ${max}.`);
  }
}

function readReport() {
  const source = readRequired(reportPath);
  if (!source) return null;
  try {
    return JSON.parse(source) as Report;
  } catch (error) {
    failures.push(`${reportPath} must be valid JSON: ${(error as Error).message}`);
    return null;
  }
}

function validateFinding(finding: Finding, pathLabel: string) {
  for (const key of ["id", "severity", "category", "title", "filePath", "suggestedFix"] as const) {
    if (typeof finding[key] !== "string" || finding[key].trim().length === 0) {
      failures.push(`${pathLabel}.${key} must be a non-empty string.`);
    }
  }
  if (!["info", "minor", "moderate", "major", "critical"].includes(finding.severity)) {
    failures.push(`${pathLabel}.severity is invalid.`);
  }
  if (!Array.isArray(finding.evidence)) {
    failures.push(`${pathLabel}.evidence must be an array.`);
  }
  requireNumber(finding.scoreImpact, `${pathLabel}.scoreImpact`, -25, 0);
}

const contract = readRequired("src/lib/server/cloud-cost-contract.ts");
const scorer = readRequired("scripts/agent/score-cloudrun-sql-bigquery-guardrails.ts");
const validator = readRequired("scripts/agent/validate-cloudrun-sql-bigquery-guardrails.ts");
const packageJson = readRequired("package.json");
const dataconnect = readRequired("dataconnect/dataconnect.yaml");
const docs = readRequired("docs/agent-truth/cloudrun-sql-bigquery-guardrails.md");
const doctrine = readRequired("docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const audit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const report = readReport();

for (const expected of [
  "\"score:cloud-cost\": \"tsx scripts/agent/score-cloudrun-sql-bigquery-guardrails.ts\"",
  "\"check:cloud-cost\": \"tsx scripts/agent/validate-cloudrun-sql-bigquery-guardrails.ts\"",
]) {
  requireIncludes(packageJson, expected, "package scripts");
}

for (const expected of [
  "CloudRunServiceGuardrail",
  "SqlCostSurface",
  "BigQueryPipelineContract",
  "kandydrops-db",
  "kandydrops_db",
  "agent_context_mirror",
  "Cloud SQL-backed",
  "maxConnectionsPerInstance: 100",
  "importBackToRuntimeAllowed: false",
  'canonicalImportTargets: ["analytics_event_facts", "analytics_metric_facts"]',
  '"legacy_admin_metric_snapshots"',
]) {
  requireIncludes(contract, expected, "cloud cost contract");
}

for (const expected of [
  'serviceId: "kandydrops"',
  'location: "us-central1"',
  'database: "kandydrops_db"',
  'instanceId: "kandydrops-db"',
  "sql_dataconnect_agent_context_mirror",
]) {
  requireIncludes(dataconnect, expected, "Data Connect config");
}

for (const expected of [
  "scanCloudRun",
  "scanSql",
  "scanBigQuery",
  "Cloud SQL can bill while provisioned/running. Confirm kandydrops-db status in Cloud Console.",
  "1,500 load jobs per table per day",
  "50 TiB/day",
  "1GB single-file extract",
  "runtime_import_blocked",
  "canonical event facts or metric facts",
  "legacy admin metric snapshots",
  "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
]) {
  requireIncludes(scorer, expected, "cloud cost scorer");
}

for (const forbidden of ["playwright", "cypress", "lighthouse", "firebase deploy", "gcloud"]) {
  requireIncludes(validator, forbidden, "cloud cost validator forbidden-command checks");
}

for (const [label, source] of [
  ["cloud cost docs", docs],
  ["cloud doctrine", doctrine],
  ["README", readme],
  ["AGENTS", agents],
  ["audit ledger", audit],
  ["file checklist", checklist],
] as const) {
  requireIncludes(source, "KandyDrops uses Firebase Data Connect with Cloud SQL only as an agent-context mirror unless explicitly promoted.", label);
}

if (report) {
  requireNumber(report.score, "report.score", 0, 100);
  if (!["clean", "pass", "warning", "beta-risk", "fail"].includes(report.status)) {
    failures.push("report.status must be valid.");
  }
  if (typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt))) {
    failures.push("report.generatedAt must be an ISO timestamp.");
  }
  for (const [key, list] of [
    ["cloudRunFindings", report.cloudRunFindings],
    ["sqlFindings", report.sqlFindings],
    ["bigQueryFindings", report.bigQueryFindings],
  ] as const) {
    if (!Array.isArray(list)) {
      failures.push(`report.${key} must be an array.`);
    } else {
      list.forEach((finding, index) => validateFinding(finding, `${key}[${index}]`));
    }
  }
  if (!report.recommendedLimits.some((limit) => limit.serviceName === "admin-ai-routes" && limit.recommendedMaxInstances === 1)) {
    failures.push("recommendedLimits must include admin AI max instance guidance.");
  }
  if (!report.recommendedLimits.some((limit) => limit.serviceName === "dataconnect-agent-context-mirror")) {
    failures.push("recommendedLimits must include Data Connect mirror guidance.");
  }
  const sqlSurface = report.sqlCostSurfaces.find((surface) => surface.instanceId === "kandydrops-db");
  if (!sqlSurface || sqlSurface.database !== "kandydrops_db" || sqlSurface.allowedPurpose !== "agent_context_mirror") {
    failures.push("sqlCostSurfaces must classify kandydrops-db/kandydrops_db as agent_context_mirror.");
  }
  for (const expected of ["dataconnect/**", "scripts/agent/sync-sql.ts", "agent/state/sql-*.generated.json"]) {
    if (!report.allowedSqlMirrorPaths.includes(expected)) {
      failures.push(`allowedSqlMirrorPaths must include ${expected}.`);
    }
  }
  for (const expected of ["src/app/api/**", "src/app/api/paypal/**", "src/app/api/chat/**", "src/app/api/creator/subscriptions/**"]) {
    if (!report.forbiddenRuntimePaths.includes(expected)) {
      failures.push(`forbiddenRuntimePaths must include ${expected}.`);
    }
  }
  if (!["export_config_found", "export_config_missing", "bigquery_export_unconfirmed"].includes(report.bigQueryExportStatus)) {
    failures.push("bigQueryExportStatus must be explicit.");
  }
  if (!["import_validator_found", "import_validator_missing", "runtime_import_blocked"].includes(report.bigQueryImportStatus)) {
    failures.push("bigQueryImportStatus must be explicit.");
  }
  if (report.bigQueryImportStatus !== "runtime_import_blocked") {
    failures.push("BigQuery runtime import must be blocked unless a future import contract is approved.");
  }
  if (!report.bigQueryPipelines.every((pipeline) => Array.isArray(pipeline.canonicalImportTargets) && pipeline.canonicalImportTargets.includes("analytics_event_facts") && pipeline.canonicalImportTargets.includes("analytics_metric_facts"))) {
    failures.push("Every BigQuery pipeline must declare canonicalImportTargets for analytics_event_facts and analytics_metric_facts.");
  }
  if (!report.bigQueryPipelines.every((pipeline) => Array.isArray(pipeline.forbiddenRuntimeMutationSurfaces) && pipeline.forbiddenRuntimeMutationSurfaces.includes("legacy_admin_metric_snapshots"))) {
    failures.push("Every BigQuery pipeline must block legacy_admin_metric_snapshots as a runtime mutation surface.");
  }
  for (const item of [
    "Check Cloud Run max instances for each deployed service",
    "Check Cloud Run concurrency",
    "Check Cloud SQL instance kandydrops-db active/paused/deleted",
    "Check Data Connect operation usage",
    "Check BigQuery linked Firebase exports",
    "Check budget alerts for Cloud SQL/Data Connect/BigQuery/Cloud Run",
  ]) {
    if (!report.manualCloudConsoleChecklist.includes(item)) {
      failures.push(`manualCloudConsoleChecklist must include ${item}.`);
    }
  }
  for (const command of ["npm run score:cloud-cost", "npm run check:cloud-cost"]) {
    if (!report.minimalCommands.includes(command)) {
      failures.push(`minimalCommands must include ${command}.`);
    }
  }
  for (const forbidden of ["playwright", "cypress", "lighthouse", "npm run check", "gcloud", "firebase deploy"]) {
    if (!report.forbiddenCommands.includes(forbidden)) {
      failures.push(`forbiddenCommands must include ${forbidden}.`);
    }
  }
  if (!report.suggestedCommands.every((command) => command.startsWith("gcloud run services update "))) {
    failures.push("suggestedCommands should be gcloud documentation commands only.");
  }
}

if (failures.length > 0) {
  console.error("Cloud Run / SQL / BigQuery guardrail validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Cloud Run / SQL / BigQuery guardrails validated.");
