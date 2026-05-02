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

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireAbsent(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

function requireJob(jobs: unknown[], jobKey: string) {
  const job = jobs.find((entry) =>
    entry &&
    typeof entry === "object" &&
    (entry as Record<string, unknown>).jobKey === jobKey
  ) as Record<string, unknown> | undefined;

  if (!job) {
    failures.push(`Audit must include jobKey "${jobKey}".`);
    return null;
  }

  for (const field of REQUIRED_JOB_FIELDS) {
    if (!(field in job)) {
      failures.push(`${jobKey} must include field "${field}".`);
      continue;
    }
    const value = job[field];
    if (Array.isArray(value) && value.length === 0 && field !== "inputs" && field !== "outputs" && field !== "writes") {
      failures.push(`${jobKey}.${field} must not be an empty array.`);
    }
    if (
      typeof value === "string" &&
      value.trim().length === 0
    ) {
      failures.push(`${jobKey}.${field} must not be blank.`);
    }
  }

  const idempotencyKey = String(job.idempotencyKey ?? "");
  if (!idempotencyKey || (!idempotencyKey.startsWith("MISSING:") && idempotencyKey.length < 8)) {
    failures.push(`${jobKey} must declare an idempotency strategy or explicit MISSING reason.`);
  }

  return job;
}

const REQUIRED_JOB_FIELDS = [
  "jobKey",
  "filePath",
  "triggerSource",
  "scheduleFrequency",
  "inputs",
  "outputs",
  "writes",
  "idempotencyKey",
  "retrySafe",
  "duplicateRisk",
  "staleStateRisk",
  "userImpact",
  "debugVisibility",
  "failureVisibility",
  "requiredFix",
  "testRequired",
];

const REQUIRED_JOBS = [
  "functions.processQueueLifecycle",
  "functions.notifyActiveDropsLifecycle",
  "drop.queuedActivation",
  "drop.expirationSweep",
  "drop.autoQueuedReturnLive",
  "drop.endingNotification",
  "notification.dispatch",
  "daily.rewardCheckIn",
  "daily.taskAssignment",
  "daily.taskCompletion",
  "daily.taskFailure",
  "reminder.generation",
  "analytics.snapshotRefresh",
  "analytics.realtimeSummaryRefresh",
  "analytics.legacyParity",
  "analytics.eventFactIngest",
  "analytics.guestBatchRollup",
  "analytics.taskEventRollup",
  "analytics.transactionRollup",
  "analytics.securityEventRollup",
  "analytics.bigQueryExport",
  "behavioral.profileSnapshotRebuild",
  "orchestration.diagnostics",
  "wallet.purchaseCredit",
  "wallet.unlock",
  "wallet.tierUpdates",
  "creator.subscriptionRenewal",
  "runtime.warningGeneration",
  "cleanup.fcmInvalidToken",
  "script.analyticsTruthRebuild",
  "script.behavioralIntelligenceRebuild",
];

const audit = parseJson("agent/state/background-job-idempotency-audit.generated.json");
const doc = readRequired("docs/agent-truth/background-jobs-idempotency.md");
const packageJson = readRequired("package.json");
const functionsIndex = readRequired("functions/src/index.ts");
const functionsQueue = readRequired("functions/src/queue-runtime.ts");
const appQueue = readRequired("src/lib/server/queue-runtime.ts");
const sharedQueue = readRequired("shared/runtime/queue-runtime.ts");
const pushNotifications = readRequired("src/lib/server/push-notifications.ts");
const fcmUtils = readRequired("src/lib/server/fcm-utils.ts");
const serviceWorker = readRequired("public/firebase-messaging-sw.js");
const notificationsRoute = readRequired("src/app/api/notifications/route.ts");
const dailyTasks = readRequired("src/lib/server/daily-tasks.ts");
const checkinRoute = readRequired("src/app/api/checkin/route.ts");
const unlockRoute = readRequired("src/app/api/drops/unlock/route.ts");
const paypalCaptureRoute = readRequired("src/app/api/paypal/capture/route.ts");
const adminSnapshots = readRequired("src/lib/server/admin-analytics-snapshots.ts");
const refreshRoute = readRequired("src/app/api/admin/analytics/refresh/route.ts");
const runtimeWarningStore = readRequired("src/lib/server/runtime-warning-store.ts");
const functionsRuntimeWarningStore = readRequired("functions/src/runtime-warning-store.ts");
const adminDebugRoute = readRequired("src/app/api/admin/debug/route.ts");
const analyticsEvents = readRequired("functions/src/analytics-event-facts.ts");
const analyticsRealtime = readRequired("functions/src/analytics-realtime-summary.ts");
const analyticsBigQuery = readRequired("functions/src/analytics-bigquery-export.ts");
const creatorCron = readRequired("src/app/api/cron/process-creator-subscriptions/route.ts");
const pushTest = readRequired("tests/unit/push-notifications.spec.ts");
const fcmTest = readRequired("tests/unit/fcm-utils.spec.ts");
const swTest = readRequired("tests/unit/firebase-messaging-sw.spec.ts");
const refreshTest = readRequired("tests/unit/admin-analytics-refresh-route.spec.ts");
const unlockTest = readRequired("tests/unit/drops-unlock-route.spec.ts");
const paypalTest = readRequired("tests/unit/paypal-capture-route.spec.ts");
const checkinTest = readRequired("tests/unit/checkin-route.spec.ts");
const dailyTasksTest = readRequired("tests/unit/daily-tasks-idempotency.spec.ts");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");

const jobs = requireArray(audit.jobs, "audit.jobs", REQUIRED_JOBS.length);
for (const jobKey of REQUIRED_JOBS) {
  requireJob(jobs, jobKey);
}

if (typeof audit.summary === "object" && audit.summary && "jobsAudited" in audit.summary) {
  const jobsAudited = (audit.summary as Record<string, unknown>).jobsAudited;
  if (jobsAudited !== jobs.length) {
    failures.push(`audit.summary.jobsAudited must equal jobs.length (${jobs.length}).`);
  }
}

for (const expected of [
  "processQueueLifecycle",
  "notifyActiveDropsLifecycle",
  "retryCount: 0",
]) {
  requireIncludes(functionsIndex, expected, "scheduled Functions entrypoint");
}

for (const expected of [
  "buildNotificationDocumentId",
  "buildNotificationIdempotencyKey",
  "buildBrowserNotificationTag",
  "queueDropNotificationDoc",
  "idempotencyKey",
  "browserTag",
  "dataOnlyPayload: true",
  "pwaDisplayMode: \"manual-service-worker\"",
  "autoDisplayedByFcm: false",
  "duplicateCreatedPrevented",
  "duplicatePushPrevented",
  "duplicateBrowserDisplayPrevented",
  "recordQueueJobHeartbeat",
  "recordRuntimeWarning",
  "recordNotificationDispatchOutcome",
]) {
  requireIncludes(functionsQueue, expected, "Functions queue runtime idempotency");
}
requireIncludes(functionsQueue, "data: baseData", "Functions scheduled FCM data-only payload");
requireAbsent(functionsQueue, "collection(\"notifications\").add", "Functions notification creation");
requireAbsent(functionsQueue, "notification: {title, body}", "Functions scheduled FCM payload");
requireAbsent(functionsQueue, "notification: { title, body }", "Functions scheduled FCM payload");

for (const expected of [
  "activationKey",
  "autoQueuedDropIds",
  "FieldValue.arrayUnion",
]) {
  requireIncludes(appQueue + sharedQueue, expected, "drop queue lifecycle");
}

for (const expected of [
  "buildNotificationDocumentId",
  "reserveDropActivationNotification",
  "duplicateCreatedPrevented",
  "duplicatePushPrevented",
  "broadcastFCMWithReport",
]) {
  requireIncludes(pushNotifications, expected, "app-server drop notification dispatch");
}

for (const expected of [
  "data: baseData",
  "duplicatePushPreventedCount",
  "pwaDisplayMode: \"manual-service-worker\"",
]) {
  requireIncludes(fcmUtils, expected, "app-server FCM diagnostics");
}

for (const expected of [
  "resolveNotificationTag(data)",
  "renotify: false",
  "manual display suppressed",
]) {
  requireIncludes(serviceWorker, expected, "service worker duplicate display prevention");
}

for (const expected of [
  "notificationDispatchLocks",
  "idempotencyKey",
  "requireTrustedOrigin: true",
  "readAtMs",
]) {
  requireIncludes(notificationsRoute, expected, "notifications route idempotency/read persistence");
}

for (const expected of [
  "TASK_RECEIPT_COLLECTION",
  "existingReceipt?.exists",
  "buildCompletedGumdropTransaction",
  "writeTaskLifecycleEvent",
]) {
  requireIncludes(dailyTasks, expected, "daily task reward idempotency");
}

for (const expected of [
  "progress.isClaimedToday",
  "runTransaction",
  "buildCompletedGumdropTransaction",
  "recordRouteWarning",
]) {
  requireIncludes(checkinRoute, expected, "daily check-in reward idempotency");
}

for (const expected of [
  "unlockedContent.has(dropId)",
  "runTransaction",
  "buildCompletedGumdropTransaction",
  "INSUFFICIENT_FUNDS",
]) {
  requireIncludes(unlockRoute, expected, "unlock idempotency");
}

for (const expected of [
  "paymentLocks",
  "existingLock.exists",
  "capturePayPalOrder",
  "requireTrustedOrigin: true",
]) {
  requireIncludes(paypalCaptureRoute, expected, "PayPal purchase credit idempotency");
}

for (const expected of [
  "shouldPreventSnapshotRefreshStorm",
  "runSnapshotRefreshWithDedupe",
  "markSnapshotRefreshFailed",
]) {
  requireIncludes(adminSnapshots, expected, "analytics refresh dedupe");
}

for (const expected of [
  "duplicate_prevented",
  "{ status: snapshot ? 200 : 500 }",
]) {
  requireIncludes(refreshRoute, expected, "manual analytics refresh stale-preserving behavior");
}

for (const expected of [
  "recordQueueJobHeartbeat",
  "recordNotificationDispatchOutcome",
  "recordRuntimeWarning",
]) {
  requireIncludes(runtimeWarningStore + functionsRuntimeWarningStore, expected, "runtime diagnostics stores");
}

for (const expected of [
  "listQueueJobHeartbeats",
  "listRuntimeWarnings",
  "listNotificationDispatchOutcomes",
  "queueRuntimeSummary",
]) {
  requireIncludes(adminDebugRoute, expected, "Admin Debug background job visibility");
}

requireIncludes(analyticsEvents, "analytics_dedupe", "analytics event fact ingest dedupe");
requireIncludes(analyticsRealtime, "Promise.all", "analytics realtime summary parallel reads");
requireIncludes(analyticsRealtime, ".doc(HOT_SUMMARY_DOC_ID).set", "analytics realtime summary replacement snapshot");
requireIncludes(analyticsBigQuery, "recordBigQueryExportStatus", "BigQuery export failure visibility");

for (const expected of [
  "warningCycleKey",
  "renewAt > now",
  "Promise.allSettled",
]) {
  requireIncludes(creatorCron, expected, "creator subscription cron idempotency");
}

for (const expected of [
  "does not send a return-live FCM push",
  "duplicateBrowserDisplayPrevented",
]) {
  requireIncludes(pushTest, expected, "drop notification duplicate tests");
}

for (const expected of [
  "dataOnlyPayload: true",
  "duplicatePushPreventedCount",
]) {
  requireIncludes(fcmTest, expected, "FCM duplicate diagnostics tests");
}

requireIncludes(swTest, "deterministic browser tags", "service worker duplicate display tests");
requireIncludes(refreshTest, "duplicate_prevented", "analytics refresh duplicate tests");
requireIncludes(unlockTest, "already unlocked without writing another deduction", "unlock duplicate test");
requireIncludes(paypalTest, "duplicate: true", "PayPal duplicate credit test");
requireIncludes(checkinTest, "suppresses duplicate daily reward claims", "daily reward duplicate test");
requireIncludes(dailyTasksTest, "suppresses duplicate task completion rewards", "task completion receipt duplicate test");

for (const expected of [
  "at-least-once",
  "deterministic notification ids",
  "Daily check-in reward grants are idempotent",
  "Incremental Firestore rollup triggers",
  "Future Agents",
]) {
  requireIncludes(doc, expected, "background job idempotency doctrine");
}

for (const expected of [
  "check:background-job-idempotency",
  "scripts/agent/validate-background-job-idempotency.ts",
]) {
  requireIncludes(packageJson, expected, "package.json");
}

for (const expected of [
  "Background Jobs Idempotency",
  "background-job-idempotency-audit.generated.json",
]) {
  requireIncludes(auditLedger, expected, "FULL_SCALE_CODEBASE_AUDIT.md");
}
requireIncludes(repoLedger, "Background job idempotency", "REPO_MEMORY_LEDGER.md");
requireIncludes(checklist, "Background Job Idempotency", "EVERY_FILE_FUNCTION_CHECKLIST.md");

if (failures.length > 0) {
  console.error("Background job idempotency validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Background job idempotency validation passed.");
