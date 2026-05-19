import { readFileSync } from "node:fs";

type Report = {
  reportKey?: string;
  currentHead?: string;
  summary?: Record<string, unknown>;
  auditItemsAddressed?: number[];
  costSavingsModel?: Array<Record<string, unknown>>;
  nextFixOrder?: unknown[];
};

function read(path: string) {
  return readFileSync(path, "utf8");
}

function fail(message: string): never {
  console.error(`analytics-hot-path-cost-reduction: ${message}`);
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

const ingest = read("src/app/api/analytics/ingest/route.ts");
const eventFacts = read("functions/src/analytics-event-facts.ts");
const bigQueryExport = read("functions/src/analytics-bigquery-export.ts");
const report = JSON.parse(read("agent/state/analytics-hot-path-cost-reduction.generated.json")) as Report;

if (report.reportKey !== "analytics-hot-path-cost-reduction") {
  fail("report key is missing or wrong.");
}

if (!report.currentHead) {
  fail("report currentHead is missing.");
}

requireIncludes(ingest, "queueUserTrackingMaterialization", "ingest deferred materialization marker");
requireIncludes(ingest, "queueBehavioralTimelineFacts", "ingest deferred behavioral timeline marker");
requireIncludes(ingest, "materializeUserTrackingIndexes stays out of the priority-live request path", "ingest materialization doctrine");
requireAbsent(ingest, /await materializeUserTrackingIndexes\(/u, "ingest hot path materialization");
requireAbsent(ingest, /writeBehavioralTimelineFacts\(/u, "ingest hot path behavioral timeline writes");
requireAbsent(ingest, /mapRuntimeFactToBehavioralTimelineFact/u, "ingest hot path timeline mapper");
requireIncludes(ingest, 'reason: "payload_too_large", retryable: false', "oversized payload retry policy");
requireIncludes(ingest, "{ status: 413 }", "oversized payload status");
requireIncludes(ingest, 'reason: "invalid_json", retryable: false', "invalid JSON retry policy");
requireIncludes(ingest, "{ status: 400 }", "invalid JSON status");
requireIncludes(ingest, 'reason, retryable: false', "invalid payload retry policy");
requireIncludes(ingest, "{ status: 422 }", "invalid payload status");
requireIncludes(ingest, "ANALYTICS_INGEST_WARNING_CAP_PER_HOUR", "warning fingerprint cap");
requireIncludes(ingest, "ANALYTICS_INGEST_FAILURE_CAP_PER_HOUR", "catch path failure cap");
requireAbsent(ingest, /Guest analytics timeline skipped by consent/u, "consent-denied per-request diagnostic");
requireAbsent(ingest, /sessionSnapshot/u, "guest session read in transaction");
requireAbsent(ingest, /transaction\.get\(docRef\)/u, "guest session transaction read");

requireIncludes(eventFacts, "await ref.create(finalEvent)", "event fact deterministic create");
requireAbsent(eventFacts, /const snapshot = await ref\.get\(\)/u, "event fact read-before-write dedupe");
requireAbsent(eventFacts, /const dedupeSnap = await dedupeRef\.get\(\)/u, "event fact trigger dedupe read");
requireIncludes(eventFacts, "batch.create(dedupeRef", "event fact trigger dedupe create");
requireIncludes(eventFacts, "analytics_event_rollup_batches", "non-priority rollup batch collection");
requireIncludes(eventFacts, "deferred_non_priority", "non-priority rollup queue marker");
requireIncludes(eventFacts, "isPriorityEventFactForImmediateRollups", "priority rollup guard");

requireIncludes(bigQueryExport, "shouldAttemptBigQueryExportClaim", "BigQuery window guard");
requireIncludes(bigQueryExport, "claimBigQueryExportWindow", "BigQuery daily claim");
requireIncludes(bigQueryExport, "buildBigQueryExportWatermarkWindow", "BigQuery watermark batching");
requireIncludes(bigQueryExport, "BIGQUERY_EXPORT_MAX_ROWS_PER_BATCH", "BigQuery bounded batch size");
requireIncludes(bigQueryExport, "BIGQUERY_EXPORT_STATUS_FAILURE_TTL_MS", "BigQuery failure status TTL");
requireIncludes(bigQueryExport, "lastExportStatusFailureFingerprint", "BigQuery repeated failure fingerprint");
requireIncludes(bigQueryExport, "maximumBytesBilledRequiredForQueries: true", "BigQuery max bytes policy");
requireIncludes(bigQueryExport, "dryRunRequiredForQueries: true", "BigQuery dry-run policy");
requireIncludes(bigQueryExport, "partitionFilterRequired: true", "BigQuery partition policy");
requireAbsent(bigQueryExport, /const claimedExportWindow\s*=\s*await claimBigQueryExportWindow/u, "BigQuery immediate per-event claim");

const expectedItems = [7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22];
if (JSON.stringify(report.auditItemsAddressed) !== JSON.stringify(expectedItems)) {
  fail("auditItemsAddressed does not match requested phase items.");
}

const summary = report.summary ?? {};
for (const key of [
  "ingestMaterializationDeferred",
  "consentDeniedNoiseSampled",
  "invalidPayloadWarningsCapped",
  "catchPathFailuresRolledUp",
  "retryable503Reduced",
  "eventFactDedupeReadReduced",
  "rollupsBatched",
  "behavioralFactsDeferred",
  "bigQueryPerEventExportRemoved",
  "bigQueryDailyClaimEnabled",
  "bigQueryWatermarkBatchingEnabled",
  "bigQueryFailureTtlEnabled",
]) {
  if (summary[key] !== true) fail(`summary.${key} is not true.`);
}

if (!Array.isArray(report.costSavingsModel) || report.costSavingsModel.length === 0) {
  fail("costSavingsModel is empty.");
}

if (/\$\d/u.test(JSON.stringify(report))) {
  fail("report claims dollar savings without billing evidence.");
}

if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) {
  fail("nextFixOrder is empty.");
}

console.log("analytics-hot-path-cost-reduction: pass");
