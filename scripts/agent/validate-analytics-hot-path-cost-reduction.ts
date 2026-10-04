import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { classifyAnalyticsIngestFailure, type AnalyticsIngestFailureReason } from "../../src/lib/analytics/ingest-contract";
import { MAINTENANCE_SCHEDULES } from "../../shared/runtime/maintenance-mode-contract";
import { readCurrentHead, withGeneratedReportEnvelope } from "./generated-report-envelope";
import { withValidatorMutationScope } from "./validate-agent-takeover-safety-check";

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
requireIncludes(ingest, "await writeGuestBehavioralTimelineProjection({", "guest bounded projection call");
requireIncludes(ingest, "await writeBehavioralTimelineProjection({", "canonical projection owner");
requireIncludes(ingest, 'materializer: "user_index_materializer_requests_v3"', "deferred materializer outbox");
requireAbsent(ingest, /await materializeUserTrackingIndexes\(/u, "ingest hot path materialization");
requireAbsent(ingest, /writeBehavioralTimelineFacts\(/u, "ingest hot path behavioral timeline writes");
requireIncludes(ingest, "buildAnalyticsIngestFailureResponse(reason)", "route failure owner");
requireIncludes(ingest, "retryable: classification.retryable", "route retry classification");
requireIncludes(ingest, "{ status: classification.httpStatus }", "route status classification");
for (const [reason, status] of [["payload_too_large", 413], ["invalid_json", 400], ["invalid_analytics_payload", 422]] as const) {
  const result = classifyAnalyticsIngestFailure(reason);
  if (result.httpStatus !== status || result.retryable || !result.permanent) fail(`${reason} must remain a permanent non-retryable ${status}.`);
}
const temporaryFailure = classifyAnalyticsIngestFailure("temporary_server_failure" satisfies AnalyticsIngestFailureReason);
if (temporaryFailure.httpStatus !== 503 || !temporaryFailure.retryable || temporaryFailure.permanent) fail("Temporary failure recovery must remain retryable.");
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

requireIncludes(bigQueryExport, "scheduledBigQueryRawEventsExport = onSchedule", "BigQuery scheduled owner");
requireIncludes(bigQueryExport, "await runBigQueryRawEventsExportWindow(", "BigQuery scheduled call");
requireIncludes(bigQueryExport, "schedule: MAINTENANCE_SCHEDULES.scheduledBigQueryRawEventsExport.schedule", "BigQuery schedule binding");
if (MAINTENANCE_SCHEDULES.scheduledBigQueryRawEventsExport.schedule !== "0 4 * * *") fail("BigQuery export must retain the daily scheduled contract.");
requireAbsent(bigQueryExport, /onDocumentCreated|shouldAttemptBigQueryExportClaim/u, "BigQuery per-event trigger");
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
const checkedFlags = [
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
];
const nextFixOrder = ["Attach current provider billing and deployed workload evidence before claiming cost savings."];
const report = withValidatorMutationScope(withGeneratedReportEnvelope({
  reportKey: "analytics-hot-path-cost-reduction", currentHead: readCurrentHead(),
  summary: Object.fromEntries(checkedFlags.map((flag) => [flag, true])),
  auditItemsAddressed: expectedItems,
  auditItemMeaning: "Historical audit indexing; the checked source flags are current, not a claim of overall audit completion.",
  costSavingsModel: [], nextFixOrder,
}, {
  evidenceClass: "source_snapshot", canClearSourceGate: true, validationFailures: [],
  nextExactSteps: nextFixOrder,
  doesNotProve: ["Measured cost savings, production activity, deployed export heartbeat or provider billing."],
}));
mkdirSync("agent/state", { recursive: true });
writeFileSync("agent/state/analytics-hot-path-cost-reduction.generated.json", JSON.stringify(report, null, 2) + "\n");

console.log("analytics-hot-path-cost-reduction: pass");
