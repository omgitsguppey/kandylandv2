import fs from "node:fs";
import path from "node:path";

import { buildDebugCockpitBatch20StaleRouteSweepReport, buildSupportRouteStaleIndexCleanupReport, validateDebugCockpitBatch20StaleRouteSweepReport } from "../../src/lib/debug/debug-cockpit-batch20-stale-route-sweep";
import { classifyNoSampleRouteCohort } from "../../src/lib/debug/no-sample-route-cohort-classifier";
import { classifyPaymentRouteStaleEvidence } from "../../src/lib/debug/payment-route-stale-evidence-classifier";
import { classifyRouteSampleFreshness } from "../../src/lib/debug/route-sample-freshness-classifier";
import { classifyScheduledRouteSample } from "../../src/lib/debug/cron-route-stale-failure-classifier";
import { groupStaleRouteSamples } from "../../src/lib/debug/stale-route-grouping";

type Report = Record<string, unknown>;

function readText(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function containsAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

function pushIf(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function runValidation(reportKey: string, report: Report, failures: string[]) {
  const generatedAtUtc = new Date().toISOString();
  const result = {
    reportKey,
    generatedAtUtc,
    ...report,
    validationFailures: failures,
  };
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
    "",
    "## Summary",
    `- Stale/no-sample route runtime output is classified as evidence state, not live health.`,
    `- Validators do not call production routes, cron, payment providers, or live data sources.`,
    "",
    "## Validation Failures",
    ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
  ]);
  if (failures.length > 0) {
    console.error(`${reportKey} failed:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`${reportKey}: pass`);
}

export function validateRouteSampleFreshnessClassifier() {
  const staleFailure = classifyRouteSampleFreshness({
    routeKey: "creator/bookings:POST",
    method: "POST",
    risk: "high",
    optionality: "required",
    cluster: "creator",
    hasSample: true,
    lastResult: "server_error",
    lastSampleAgeMs: 20 * 24 * 60 * 60 * 1000,
    freshnessWindowMs: 24 * 60 * 60 * 1000,
  });
  const noSample = classifyRouteSampleFreshness({
    routeKey: "admin/creator-account-controls:POST",
    method: "POST",
    risk: "high",
    optionality: "required",
    cluster: "admin",
    hasSample: false,
    lastResult: "no_sample",
    lastSampleAgeMs: null,
    freshnessWindowMs: 24 * 60 * 60 * 1000,
  });
  const ui = readText("src/app/admin/debug/components/DebugMonitoringRoutes.tsx");
  const failures: string[] = [];
  pushIf(staleFailure.status === "stale_server_error" && staleFailure.currentResultTrusted === false, failures, "stale server error displays current server error without fresh sample.");
  pushIf(noSample.status === "unseen_required_smoke_needed", failures, "no-sample route displays LIVE or lacks required smoke classification.");
  pushIf(containsAll(ui, ["sampleIsStale", "STALE SAMPLE", "truthState={loadedTruthState}"]), failures, "stale route sample displays current LIVE.");
  runValidation("route-sample-freshness-classifier", {
    staleFailure,
    noSample,
    freshnessWindowMs: 24 * 60 * 60 * 1000,
  }, failures);
}

export function validateAiDescriptionFeedbackFirestoreCleanup() {
  const helper = readText("src/lib/server/ai-drop-descriptions.ts");
  const route = readText("src/app/api/admin/ai/drop-descriptions/feedback/route.ts");
  const failures: string[] = [];
  pushIf(containsAll(helper, ["sanitizeFirestorePayload", "sanitizeFirestorePayload(nextPolicy", "sanitizeFirestorePayload(nextSettings", "sanitizeFirestorePayload(entry as"]), failures, "Firestore set/update payload contains undefined risk.");
  pushIf(!helper.includes(".set(nextPolicy, { merge: true })"), failures, "lastEditedByUid can be written as undefined.");
  pushIf(containsAll(route, ["errorCode: \"unauthorized\"", "retryable: false", "expected_typed_client_error"]), failures, "route returns generic 500 for missing editor identity or lacks typed validation.");
  pushIf(route.includes("withRouteRuntimeHealth(\"admin/ai/drop-descriptions/feedback:POST\""), failures, "route runtime wrapper removed.");
  runValidation("ai-description-feedback-firestore-cleanup", {
    status: "fixed_current",
    fixedField: "lastEditedByUid",
    route: "admin/ai/drop-descriptions/feedback:POST",
  }, failures);
}

export function validateSupportRouteStaleIndexCleanup() {
  const report = buildSupportRouteStaleIndexCleanupReport();
  const supportRoute = readText("src/app/api/support/threads/route.ts");
  const adminRoute = readText("src/app/api/admin/support/threads/route.ts");
  const helper = readText("src/lib/server/support-threads.ts");
  const indexes = readText("firestore.indexes.json");
  const failures: string[] = [];
  pushIf(containsAll(indexes, ["support_threads", "\"fieldPath\": \"userId\"", "\"fieldPath\": \"status\"", "\"fieldPath\": \"lastMessageAt\""]), failures, "index requirement lacks firestore.indexes evidence or setup artifact.");
  pushIf(containsAll(supportRoute, ["missing_firestore_index", "retryable: false"]) && containsAll(adminRoute, ["missing_firestore_index", "retryable: false"]), failures, "missing Firestore index can surface as generic 500.");
  pushIf(helper.includes("broadReadFallbackAllowed: false"), failures, "support route fallback broad-reads threads.");
  runValidation("support-route-stale-index-cleanup", report, failures);
}

export function validateCronRouteStaleFailureClassification() {
  const record = classifyScheduledRouteSample({
    routeKey: "cron/process-queue:GET",
    lastResult: "server_error",
    lastSampleAgeMs: 22 * 24 * 60 * 60 * 1000,
    freshnessWindowMs: 24 * 60 * 60 * 1000,
    schedulerExpected: true,
  });
  const failures: string[] = [];
  pushIf(record.status === "scheduled_stale_failure" && record.currentFailure === false, failures, "22d stale cron server error shows current.");
  pushIf(record.validatorRunsCron === false, failures, "cron route is run during validator.");
  pushIf(record.nextAction.includes("scheduler"), failures, "stale scheduled failure lacks next action.");
  runValidation("cron-route-stale-failure-classification", record, failures);
}

export function validatePaymentRouteStaleEvidenceClassification() {
  const record = classifyPaymentRouteStaleEvidence({
    routeKey: "paypal/capture:POST",
    lastSampleAgeMs: 2 * 24 * 60 * 60 * 1000,
    freshnessWindowMs: 24 * 60 * 60 * 1000,
    operatorEvidencePresent: true,
    deployedSmokePresent: false,
  });
  const paymentRoute = readText("src/app/api/paypal/capture/route.ts");
  const failures: string[] = [];
  pushIf(record.status === "stale_critical_evidence_required", failures, "PayPal capture stale route marked fresh.");
  pushIf(record.operatorEvidenceClearsRouteFreshness === false, failures, "operator evidence clears deployed route freshness.");
  pushIf(!paymentRoute.includes("stale_critical_evidence_required"), failures, "payment runtime changed by stale evidence classifier.");
  runValidation("payment-route-stale-evidence-classification", record, failures);
}

export function validateNoSampleRouteCohortCleanup() {
  const optional = classifyNoSampleRouteCohort("admin/ai/drop-covers/template:DELETE");
  const required = classifyNoSampleRouteCohort("admin/creator-account-controls:POST");
  const failures: string[] = [];
  pushIf(optional.displaysLive === false && optional.status === "unseen_optional_quiet", failures, "optional route treated as failure solely due to no sample or displayed LIVE.");
  pushIf(required.displaysLive === false && required.cohort === "required_admin_write", failures, "high-risk no-sample route lacks cohort.");
  pushIf(required.nextAction.length > 0, failures, "high-risk no-sample route lacks smoke/evidence next action.");
  runValidation("no-sample-route-cohort-cleanup", { optional, required }, failures);
}

export function validateStaleRouteGroupingCleanup() {
  const groups = groupStaleRouteSamples([
    { routeKey: "paypal/capture:POST", risk: "critical", lastResult: "success", ageDays: 2, serverErrors: 1, clientErrors: 0, hasSample: true },
    { routeKey: "creator/bookings:POST", risk: "high", lastResult: "server_error", ageDays: 20, serverErrors: 2, clientErrors: 0, hasSample: true },
    { routeKey: "admin/ai/drop-covers/template:DELETE", risk: "medium", lastResult: "no_sample", ageDays: null, serverErrors: 0, clientErrors: 0, hasSample: false },
  ]);
  const failures: string[] = [];
  pushIf(groups.defaultCollapsed === true, failures, "stale routes are shown as raw cards by default.");
  pushIf(groups.drilldownAvailable === true, failures, "drilldown not available.");
  pushIf(groups.criticalStale.routeKeys.includes("paypal/capture:POST"), failures, "high-risk stale groups hidden.");
  runValidation("stale-route-grouping-cleanup", groups, failures);
}

export function validateDebugCockpitBatch20StaleRouteSweep() {
  const report = buildDebugCockpitBatch20StaleRouteSweepReport();
  const failures = validateDebugCockpitBatch20StaleRouteSweepReport(report);
  const summary = readText("src/lib/admin-debug-summary-cards.ts");
  const ui = readText("src/app/admin/debug/components/DebugMonitoringRoutes.tsx");
  pushIf(containsAll(summary, ["[stale] API snapshot; stale route samples", "[partial] API snapshot; no-sample routes"]), failures, "stale or no-sample summary still displays live.");
  pushIf(containsAll(ui, ["sampleIsStale", "STALE SAMPLE", "No runtime sample has been recorded; metrics are unavailable, not zero."]), failures, "route cards not grouped/classified with no-sample unavailable state.");
  runValidation("debug-cockpit-batch20-stale-route-sweep", report as unknown as Report, failures);
}
