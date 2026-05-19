import { readFileSync } from "node:fs";

type Report = {
  reportKey?: string;
  summary?: Record<string, unknown>;
  costSavingsModel?: Array<Record<string, unknown>>;
  nextFixOrder?: unknown[];
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function fail(message: string): never {
  console.error(`analytics-cost-hot-path-reduction: ${message}`);
  process.exit(1);
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} is missing ${needle}`);
  }
}

function requireAbsent(source: string, pattern: RegExp, label: string) {
  if (pattern.test(source)) {
    fail(`${label} contains forbidden pattern ${pattern}`);
  }
}

const bigQueryExport = read("functions/src/analytics-bigquery-export.ts");
const ingest = read("src/app/api/analytics/ingest/route.ts");
const realtimeSummary = read("functions/src/analytics-realtime-summary.ts");
const historicalRoute = read("src/app/api/admin/analytics/historical/route.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const runtimeWarningStore = read("src/lib/server/runtime-warning-store.ts");
const report = JSON.parse(read("agent/state/analytics-cost-hot-path-reduction.generated.json")) as Report;

if (report.reportKey !== "analytics-cost-hot-path-reduction") {
  fail("report key is missing or wrong.");
}

requireIncludes(bigQueryExport, "shouldAttemptBigQueryExportClaim", "BigQuery export daily/window guard");
requireIncludes(bigQueryExport, "buildBigQueryExportWatermarkWindow", "BigQuery export watermark batching");
requireIncludes(bigQueryExport, "exportBigQueryRawEventsBatch", "BigQuery export bounded batch");
requireIncludes(bigQueryExport, "BIGQUERY_EXPORT_MAX_ROWS_PER_BATCH", "BigQuery export batch cap");
requireIncludes(bigQueryExport, "FieldPath.documentId()", "BigQuery export stable batch cursor");
requireIncludes(bigQueryExport, "startAfter(input.windowStartMs, input.watermarkEventId)", "BigQuery export stable watermark cursor");
requireIncludes(bigQueryExport, "maximumBytesBilledRequiredForQueries: true", "BigQuery query cost guard");
requireIncludes(bigQueryExport, "partitionFilterRequired: true", "BigQuery partition guard");
requireAbsent(bigQueryExport, /const claimedExportWindow\s*=\s*await claimBigQueryExportWindow/u, "BigQuery event trigger");

requireIncludes(ingest, "queueUserTrackingMaterialization", "analytics ingest deferred materialization marker");
requireIncludes(ingest, "invalid_analytics_payload", "analytics ingest permanent validation reason");
requireIncludes(ingest, "retryable: false", "analytics ingest permanent failure retry policy");
requireIncludes(ingest, "status: 422", "analytics ingest validation status");
requireAbsent(ingest, /await materializeUserTrackingIndexes\(/u, "analytics ingest hot path");

requireIncludes(realtimeSummary, "REALTIME_SUMMARY_MIN_CADENCE_MS", "realtime summary cadence guard");
requireIncludes(realtimeSummary, "shouldRunRealtimeSummaryRefresh", "realtime summary source cadence helper");
requireAbsent(realtimeSummary, /schedule:\s*"every 1 minutes"/u, "realtime summary schedule");

requireIncludes(historicalRoute, "ADMIN_ANALYTICS_HISTORICAL_RESPONSE_CACHE_TTL_MS = ANALYTICS_NON_PRIORITY_TTL_MS", "admin historical daily cache");
requireIncludes(historicalRoute, "sourceFreshness", "admin historical source freshness label");
requireAbsent(historicalRoute, /fetchCache\s*=\s*"force-no-store"/u, "admin historical default cache");

requireIncludes(debugRoute, "ADMIN_DEBUG_INITIAL_LOAD_COST_GUARD", "admin debug initial load cost guard");
requireIncludes(debugRoute, "ADMIN_DEBUG_INITIAL_LOAD_CACHE_TTL_MS", "admin debug initial load hot cache");
requireIncludes(debugRoute, "debug_cost_reduced_initial_summary", "admin debug reduced initial marker");

requireIncludes(runtimeWarningStore, "QUEUE_JOB_HEARTBEAT_DEFAULT_LIMIT", "queue heartbeat default limit");
requireIncludes(runtimeWarningStore, '.orderBy("updatedAt", "desc")', "queue heartbeat ordered limited read");
requireAbsent(runtimeWarningStore, /collection\(QUEUE_JOB_HEARTBEAT_COLLECTION\)\.get\(\)/u, "queue heartbeat default listing");

const summary = report.summary ?? {};
if (summary.bigQueryPerEventExportRemoved !== true) fail("report does not mark BigQuery per-event export removed.");
if (summary.ingestMaterializationDeferred !== true) fail("report does not mark ingest materialization deferred.");
if (summary.permanentFailuresNonRetryable !== true) fail("report does not mark permanent failures non-retryable.");
if (summary.realtimeSummaryCadenceMinutes !== 5) fail("report realtime summary cadence is not 5 minutes.");
if (summary.heartbeatFullScanBlocked !== true) fail("report does not mark heartbeat full scan blocked.");
if (!Array.isArray(report.costSavingsModel) || report.costSavingsModel.length === 0) fail("report costSavingsModel is empty.");
if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) fail("report nextFixOrder is empty.");
if (/\$\d/u.test(JSON.stringify(report))) fail("report claims dollar savings without billing evidence.");

console.log("analytics-cost-hot-path-reduction: pass");
