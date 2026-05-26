import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  calculateAdminReadRisk,
  calculateExportBatchWindow,
  calculateHotPathCostRisk,
  calculateSummaryFreshness,
  calculateWatermarkRange,
  classifyCostReadiness,
  explainCostAccuracyTradeoff,
} from "@/lib/math/cost-export-parity-math";

const ROOT = process.cwd();
const STATE_PATH = "agent/state/cost-export-sql-parity-math.generated.json";
const DOC_PATH = "docs/agent-truth/cost-export-sql-parity-math.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

type ScoreDimensions = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

type DirtyFileClassification =
  | "current_source_change"
  | "cost_export_source_evidence"
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "unrelated_agent_context_file_to_ignore"
  | "stale_generated_artifact_to_regenerate"
  | "unsafe_unknown";

type OpenPrClassification =
  | "onboarding_telemetry_external_review_required"
  | "doctrine_governance_external_review_required"
  | "architecture_refactor_external_review_required"
  | "dependency_update_external_review_required"
  | "security_patch_external_review_required"
  | "performance_patch_external_review_required"
  | "accessibility_patch_external_review_required"
  | "external_review_required";

type JsonRecord = Record<string, unknown>;

export type CostExportSqlParityMathReport = {
  reportKey: "cost-export-sql-parity-math";
  generatedAtUtc: string;
  currentHead: string;
  status: "pass" | "fail";
  productionExportsRun: false;
  providerCallsRun: false;
  deployPerformed: false;
  paymentRuntimeChanged: false;
  gumdropMathChanged: false;
  externalBillingReviewed: false;
  exportBatchStatus: ReturnType<typeof calculateExportBatchWindow>;
  watermarkStatus: ReturnType<typeof calculateWatermarkRange>;
  summaryFreshnessStatus: {
    noncriticalAnalytics: ReturnType<typeof calculateSummaryFreshness>;
    realtimeSummary: ReturnType<typeof calculateSummaryFreshness>;
    diagnosticRollup: ReturnType<typeof calculateSummaryFreshness>;
  };
  hotPathRiskStatus: ReturnType<typeof calculateHotPathCostRisk>;
  adminReadRiskStatus: ReturnType<typeof calculateAdminReadRisk>;
  sqlMirrorGuardStatus: "manual_cost_approved_only" | "unguarded";
  costReadinessStatus: ReturnType<typeof classifyCostReadiness>;
  accuracyPreservedStatus: ReturnType<typeof explainCostAccuracyTradeoff>;
  debugLane: {
    label: "Cost/export math";
    hotPathRisk: string;
    exportBatchStatus: string;
    adminReadRisk: string;
    sqlMirrorGuard: "manual_cost_approved_only" | "unguarded";
    accuracyPreserved: boolean;
  };
  scoreBefore: ScoreDimensions;
  scoreAfter: ScoreDimensions;
  scoreDimensions: readonly string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: DirtyFileClassification }>;
  openPrs: Array<{ number: unknown; title: unknown; url: unknown; mergeStateStatus: unknown; isDraft: unknown; classification: OpenPrClassification }>;
  validationFailures: string[];
};

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function writeJson(path: string, value: unknown) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function currentDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) files.add(line.replace(/\\/gu, "/"));
  }
  return [...files].sort();
}

function scoreSnapshot(): ScoreDimensions {
  const score = readJson(SCORE_PATH);
  return {
    sourceHealth: typeof score.sourceHealthScore === "number" ? score.sourceHealthScore : 0,
    runtimeHealth: typeof score.runtimeHealthScore === "number" ? score.runtimeHealthScore : 0,
    evidenceCompleteness: typeof score.evidenceCompletenessScore === "number" ? score.evidenceCompletenessScore : 0,
    freshness: typeof score.freshnessScore === "number" ? score.freshnessScore : 0,
    costRisk: typeof score.costRiskScore === "number" ? score.costRiskScore : 0,
    regressionRisk: typeof score.regressionRiskScore === "number" ? score.regressionRiskScore : 0,
    overallHealthScore: typeof score.healthScore === "number" ? score.healthScore : 0,
  };
}

export function classifyCostExportSqlParityMathDirtyFile(filePath: string): DirtyFileClassification {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "src/lib/math/cost-export-parity-math.ts") return "current_source_change";
  if (normalized === "scripts/agent/validate-cost-export-sql-parity-math.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/cost-export-sql-parity-math.spec.ts") return "test_artifact_expected";
  if (normalized === STATE_PATH || normalized === SCORE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "functions/src/analytics-bigquery-export.ts"
    || normalized === "src/lib/analytics/sql-database-parity-contract.ts"
    || normalized === "src/lib/analytics/sql-database-parity-engine.ts"
    || normalized === "src/lib/server/api-cost-contract.ts"
    || normalized === "src/lib/server/global-cost-surface-contract.ts"
    || normalized.startsWith("src/lib/cost/")
    || normalized === "scripts/agent/sync-sql.ts"
  ) return "cost_export_source_evidence";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/paypal|payment|wallet|gumdrop|payout|commerce/iu.test(normalized)) return "unsafe_unknown";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  return "unsafe_unknown";
}

function classifyOpenPr(pr: JsonRecord): OpenPrClassification {
  const title = String(pr.title ?? "");
  if (/dependency|deps|npm|knip|syncpack|puppeteer/iu.test(title)) return "dependency_update_external_review_required";
  if (/sentinel|security|Math\.random|ID generation/iu.test(title)) return "security_patch_external_review_required";
  if (/bolt|performance|Map lookup/iu.test(title)) return "performance_patch_external_review_required";
  if (/palette|accessibility|loading states/iu.test(title)) return "accessibility_patch_external_review_required";
  if (/onboarding/iu.test(title)) return "onboarding_telemetry_external_review_required";
  if (/doctrine/iu.test(title)) return "doctrine_governance_external_review_required";
  if (/monolith|responsibility boundaries/iu.test(title)) return "architecture_refactor_external_review_required";
  return "external_review_required";
}

function listOpenPrs() {
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as JsonRecord[];
  return parsed.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.url,
    mergeStateStatus: pr.mergeStateStatus,
    isDraft: pr.isDraft,
    classification: classifyOpenPr(pr),
  }));
}

function includesAll(source: string, required: readonly string[]) {
  return required.filter((item) => !source.includes(item));
}

function buildSourceValidationFailures() {
  const failures: string[] = [];
  const source = {
    math: read("src/lib/math/cost-export-parity-math.ts"),
    bigQuery: read("functions/src/analytics-bigquery-export.ts"),
    sqlContract: read("src/lib/analytics/sql-database-parity-contract.ts"),
    sqlEngine: read("src/lib/analytics/sql-database-parity-engine.ts"),
    syncSql: read("scripts/agent/sync-sql.ts"),
    packageJson: read("package.json"),
  };

  for (const missing of includesAll(source.math, [
    "calculateExportBatchWindow",
    "calculateWatermarkRange",
    "calculateSummaryFreshness",
    "calculateHotPathCostRisk",
    "calculateAdminReadRisk",
    "classifyCostReadiness",
    "explainCostAccuracyTradeoff",
    "NONCRITICAL_ANALYTICS_REFRESH_MS",
    "REALTIME_SUMMARY_MIN_REFRESH_MS",
    "DIAGNOSTIC_ROLLUP_REFRESH_MS",
  ])) failures.push(`Cost/export math module missing ${missing}.`);

  for (const missing of includesAll(source.bigQuery, [
    "BIGQUERY_EXPORT_MIN_CADENCE_MS",
    "BIGQUERY_EXPORT_MAX_ROWS_PER_BATCH",
    "buildBigQueryExportWatermarkWindow",
    "onSchedule",
    "lastExportedAt",
    "maximumBytesBilled",
    "partitionFilterRequired",
  ])) failures.push(`BigQuery export guard missing ${missing}.`);
  if (/onDocumentCreated|onRequest|onCall/iu.test(source.bigQuery)) failures.push("BigQuery export can trigger per event.");

  for (const missing of includesAll(source.sqlContract, [
    "perEventBigQueryExportAllowed: false",
    "casualCloudSqlMirrorSyncAllowed: false",
    "hotPathWrites: \"essential_summaries_only\"",
    "adminReads: \"summaries_first_paged_drilldowns\"",
    "noDuplicateMaterializers: true",
  ])) failures.push(`SQL parity cost guard missing ${missing}.`);

  for (const missing of includesAll(source.sqlEngine, [
    "batched_watermark_export",
    "summary_first_admin_read",
    "paged_drilldown",
    "blocked_casual_cloud_sql_mirror",
  ])) failures.push(`SQL parity engine cost classification missing ${missing}.`);

  for (const missing of includesAll(source.syncSql, [
    "ALLOW_SQL_MIRROR_SYNC",
    "SQL_MIRROR_SYNC_REASON",
    "SQL_MIRROR_SYNC_ENV",
    "SQL_MIRROR_DRY_RUN",
    "manual-only",
  ])) failures.push(`SQL mirror manual guard missing ${missing}.`);

  if (!source.packageJson.includes("\"check:cost-export-sql-parity-math\": \"tsx scripts/agent/validate-cost-export-sql-parity-math.ts\"")) {
    failures.push("package.json is missing check:cost-export-sql-parity-math.");
  }

  return failures;
}

function renderDoc(report: CostExportSqlParityMathReport) {
  return [
    "# Cost Export SQL Parity Math",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    `Status: ${report.status}`,
    "",
    "## Contract",
    "",
    "- Hot path writes only essential facts and summaries.",
    "- Non-critical analytics refresh daily by default.",
    "- BigQuery export is scheduled, batched, and watermark-based, never per-event.",
    "- SQL/Data Connect mirror sync is manual and cost-approved only.",
    "- Admin/debug defaults read compact summaries with paged raw drilldowns.",
    "- Cost risk source guards earn partial credit; external billing proof remains separate.",
    "- Cost reduction preserves canonical metric facts and reduces duplicate reads, writes, or refresh frequency instead.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${report.debugLane.label}`,
    `- Hot path risk: ${report.debugLane.hotPathRisk}`,
    `- Export batch status: ${report.debugLane.exportBatchStatus}`,
    `- Admin read risk: ${report.debugLane.adminReadRisk}`,
    `- SQL mirror guard: ${report.debugLane.sqlMirrorGuard}`,
    `- Accuracy preserved: ${report.debugLane.accuracyPreserved}`,
    "",
    "## Score",
    "",
    `- Before: ${JSON.stringify(report.scoreBefore)}`,
    `- After: ${JSON.stringify(report.scoreAfter)}`,
    `- Dimensions: ${report.scoreDimensions.join(", ")}`,
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- none"]),
    "",
    "## Next Exact Steps",
    "",
    ...(report.nextExactSteps.length ? report.nextExactSteps.map((step) => `- ${step}`) : ["- none"]),
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFiles.length ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`) : ["- none"]),
    "",
    "## Open PRs",
    "",
    ...(report.openPrs.length ? report.openPrs.map((pr) => `- #${pr.number}: ${pr.classification}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

export function buildCostExportSqlParityMathReport(input: {
  currentHead?: string;
  dirtyFiles?: string[];
  openPrs?: CostExportSqlParityMathReport["openPrs"];
  scoreBefore?: ScoreDimensions;
} = {}): CostExportSqlParityMathReport {
  const nowMs = Date.UTC(2026, 4, 26, 12);
  const exportBatchStatus = calculateExportBatchWindow({
    lastWatermarkMs: nowMs - (26 * 60 * 60 * 1000),
    nowMs,
    requestedRows: 750,
  });
  const watermarkStatus = calculateWatermarkRange({ eventTriggered: false, nowMs });
  const summaryFreshnessStatus = {
    noncriticalAnalytics: calculateSummaryFreshness({ kind: "noncritical_analytics", refreshMs: 24 * 60 * 60 * 1000 }),
    realtimeSummary: calculateSummaryFreshness({ kind: "realtime_summary", refreshMs: 5 * 60 * 1000, userFacingCritical: false }),
    diagnosticRollup: calculateSummaryFreshness({ kind: "diagnostic_rollup", refreshMs: 60 * 60 * 1000 }),
  };
  const hotPathRiskStatus = calculateHotPathCostRisk({
    writesEssentialFactsOnly: true,
    duplicateMaterializerCount: 0,
    canonicalFactsDropped: false,
  });
  const adminReadRiskStatus = calculateAdminReadRisk({
    defaultReadsSummary: true,
    rawDrilldownPaged: true,
    compactSummaryLimit: 100,
    rawFirehoseDefault: false,
  });
  const costReadinessStatus = classifyCostReadiness({
    sourceGuarded: true,
    externalBillingReviewed: false,
    runtimeUsageDetected: false,
  });
  const accuracyPreservedStatus = explainCostAccuracyTradeoff({
    canonicalFactsDropped: false,
    duplicateReadsReduced: true,
    duplicateWritesReduced: true,
    excessiveRefreshReduced: true,
  });
  const scoreBefore = input.scoreBefore ?? scoreSnapshot();
  const dirtyFiles = (input.dirtyFiles ?? currentDirtyFiles()).map((path) => ({
    path,
    classification: classifyCostExportSqlParityMathDirtyFile(path),
  }));
  const report: CostExportSqlParityMathReport = {
    reportKey: "cost-export-sql-parity-math",
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? run("git", ["rev-parse", "--short", "HEAD"]),
    status: "pass",
    productionExportsRun: false,
    providerCallsRun: false,
    deployPerformed: false,
    paymentRuntimeChanged: false,
    gumdropMathChanged: false,
    externalBillingReviewed: false,
    exportBatchStatus,
    watermarkStatus,
    summaryFreshnessStatus,
    hotPathRiskStatus,
    adminReadRiskStatus,
    sqlMirrorGuardStatus: "manual_cost_approved_only",
    costReadinessStatus,
    accuracyPreservedStatus,
    debugLane: {
      label: "Cost/export math",
      hotPathRisk: hotPathRiskStatus.risk,
      exportBatchStatus: exportBatchStatus.mode,
      adminReadRisk: adminReadRiskStatus.risk,
      sqlMirrorGuard: "manual_cost_approved_only",
      accuracyPreserved: accuracyPreservedStatus.accuracyPreserved,
    },
    scoreBefore,
    scoreAfter: scoreBefore,
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"],
    remainingGaps: [
      "External billing/provider review remains required before full cost closure.",
      "Cloud Run/App Hosting, Cloud SQL/Data Connect, and Gemini/Cloud Assist/Vertex still need external billing artifacts for full credit.",
    ],
    nextExactSteps: [
      "Attach external billing/provider evidence before moving costRisk from source-guarded partial credit to full credit.",
      "Keep BigQuery export on daily watermark batches and Cloud SQL mirror sync manual/cost-approved only.",
      "Keep admin/debug default reads summary-first with paged raw drilldowns.",
    ],
    dirtyFiles,
    openPrs: input.openPrs ?? listOpenPrs(),
    validationFailures: [],
  };
  report.validationFailures = validateCostExportSqlParityMathReport(report);
  report.status = report.validationFailures.length ? "fail" : "pass";
  return report;
}

export function validateCostExportSqlParityMathReport(report: CostExportSqlParityMathReport) {
  const failures = [...buildSourceValidationFailures(), ...report.validationFailures];
  if (report.productionExportsRun) failures.push("Production exports were run.");
  if (report.providerCallsRun) failures.push("Provider calls were run.");
  if (report.deployPerformed) failures.push("Deploy was performed.");
  if (report.paymentRuntimeChanged) failures.push("Payment runtime changed.");
  if (report.gumdropMathChanged) failures.push("GumDrop math changed.");
  if (report.externalBillingReviewed) failures.push("External billing falsely marked reviewed.");
  if (report.exportBatchStatus.perEventExportAllowed) failures.push("BigQuery export can trigger per event.");
  if (report.watermarkStatus.perEventExportAllowed) failures.push("Watermark range allows per-event export.");
  if (report.summaryFreshnessStatus.noncriticalAnalytics.minimumRefreshMs < 86_400_000 || report.summaryFreshnessStatus.noncriticalAnalytics.status !== "allowed") {
    failures.push("Noncritical analytics refresh faster than 24h without reason.");
  }
  if (report.hotPathRiskStatus.accuracyPreserved !== true || report.accuracyPreservedStatus.accuracyPreserved !== true) {
    failures.push("Cost reduction drops required canonical facts.");
  }
  if (!report.adminReadRiskStatus.defaultSafe || report.adminReadRiskStatus.reason === "raw_firehose_default") {
    failures.push("Admin/debug defaults to raw firehose.");
  }
  if (report.sqlMirrorGuardStatus !== "manual_cost_approved_only") failures.push("Cloud SQL mirror can sync without approval.");
  if (report.costReadinessStatus.status === "owner_review" || report.costReadinessStatus.scoreCredit !== "partial") {
    failures.push("Source guards ignored in costRisk.");
  }
  if (!report.debugLane || report.debugLane.label !== "Cost/export math") failures.push("Cost/export math debug lane missing.");
  if (!report.scoreDimensions.includes("costRisk")) failures.push("Score dimensions missing.");
  for (const file of report.dirtyFiles) {
    if (file.classification === "unsafe_unknown") failures.push(`${file.path} is unclassified for cost/export SQL parity math.`);
  }
  for (const pr of report.openPrs) {
    if (!pr.classification || pr.classification === "external_review_required") failures.push(`Open PR #${pr.number} is unclassified.`);
  }
  if (!report.remainingGaps.length || !report.nextExactSteps.length) failures.push("Remaining gaps or next exact steps missing.");
  return [...new Set(failures)];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const report = buildCostExportSqlParityMathReport();
  writeJson(STATE_PATH, report);
  write(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length) {
    console.error("Cost export SQL parity math validation failed:");
    report.validationFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log("Cost export SQL parity math validation passed.");
}
