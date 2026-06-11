import fs from "node:fs";
import path from "node:path";

import {
  buildAdminUsersLatencyRepairReport,
  buildDebugCockpitBatch19ProductRoutesReport,
  buildStaleRouteSampleClassificationReport,
  buildSupportThreadsIndexRepairReport,
  buildTasksRotateRuntimeRepairReport,
  buildUserCheckinRouteErrorMappingReport,
  buildViewerWatchSessionErrorCleanupReport,
  validateAdminUsersLatencyRepairReport,
  validateDebugCockpitBatch19ProductRoutesReport,
  validateStaleRouteSampleClassificationReport,
  validateSupportThreadsIndexRepairReport,
  validateTasksRotateRuntimeRepairReport,
  validateUserCheckinRouteErrorMappingReport,
  validateViewerWatchSessionErrorCleanupReport,
} from "../../src/lib/debug/debug-cockpit-batch19-product-routes";
import { withGeneratedReportEnvelope } from "./generated-report-envelope";

type ValidationResult = {
  reportKey: string;
  generatedAtUtc?: string;
  validationFailures: string[];
  [key: string]: unknown;
};

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

function pushIf(condition: boolean, failures: string[], message: string) {
  if (!condition) failures.push(message);
}

function containsAll(source: string, needles: string[]) {
  return needles.every((needle) => source.includes(needle));
}

function runValidation(reportKey: string, report: Record<string, unknown>, failures: string[]) {
  const generatedAtUtc = typeof report.generatedAtUtc === "string" ? report.generatedAtUtc : new Date().toISOString();
  const result = withGeneratedReportEnvelope({
    reportKey,
    generatedAtUtc,
    ...report,
    validationFailures: failures,
  }, {
    reportKey,
    generatedAtUtc,
    evidenceClass: "source_snapshot",
    canClearSourceGate: failures.length === 0,
    nextExactSteps: [
      `Run npm run check:${reportKey} after touching this route evidence classifier lane.`,
      "Refresh or attach route runtime samples separately before clearing runtime freshness gates.",
    ],
    validationFailures: failures,
    doesNotProve: [
      "Does not prove live route health.",
      "Does not prove payment/provider runtime freshness.",
      "Does not prove admin truth samples are current.",
    ],
  }) as ValidationResult;
  writeJson(`agent/state/${reportKey}.generated.json`, result);
  writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
    `# ${reportKey}`,
    "",
    `Generated: ${generatedAtUtc}`,
    "",
    `Status: ${failures.length === 0 ? "pass" : "fail"}`,
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

export function validateTasksRotateRuntimeRepair() {
  const report = buildTasksRotateRuntimeRepairReport();
  const route = readText("src/app/api/tasks/rotate/route.ts");
  const caller = readText("src/components/Dashboard/DailyTasksModule.tsx");
  const failures = validateTasksRotateRuntimeRepairReport(report);
  pushIf(route.includes("routeStatus: \"expected_typed_client_error\""), failures, "tasks/rotate current client_error remains unclassified.");
  pushIf(route.includes("retryable: false"), failures, "expected task failures can retry indefinitely.");
  pushIf(containsAll(route, ["missing_task_assignment", "rate_limited", "unauthenticated"]), failures, "task error classes missing.");
  pushIf(route.includes("rotateUserTasks(uid)") && !route.includes("reward =") && !route.includes("claimRewardAmount"), failures, "task reward/reset policy changes.");
  pushIf(caller.includes("reportClientIssue") && caller.includes("Task rotation failed"), failures, "client retry suppression missing.");
  runValidation(report.reportKey, report, failures);
}

export function validateAdminUsersLatencyRepair() {
  const report = buildAdminUsersLatencyRepairReport();
  const route = readText("src/app/api/admin/users/route.ts");
  const failures = validateAdminUsersLatencyRepairReport(report);
  pushIf(route.includes('ADMIN_USERS_DEFAULT_MODE = "summary"'), failures, "admin/users default route can broad-read raw users.");
  pushIf(route.includes("mode === \"summary\"") && route.includes("readAdminUsersFastSummarySnapshot"), failures, "summary-first mode missing.");
  pushIf(route.includes("mode === \"list\"") && route.includes("ADMIN_USERS_LIST_LIMIT"), failures, "pagination/limit missing.");
  pushIf(route.includes("mode === \"detail\""), failures, "drilldown mode for raw details missing.");
  pushIf(!route.includes("request.nextUrl.searchParams.get(\"mode\") ?? \"full\""), failures, "raw admin user dumps load by default.");
  runValidation(report.reportKey, report, failures);
}

export function validateSupportThreadsIndexRepair() {
  const report = buildSupportThreadsIndexRepairReport();
  const userRoute = readText("src/app/api/support/threads/route.ts");
  const adminRoute = readText("src/app/api/admin/support/threads/route.ts");
  const helper = readText("src/lib/server/support-threads.ts");
  const indexes = readText("firestore.indexes.json");
  const failures = validateSupportThreadsIndexRepairReport(report);
  pushIf(containsAll(indexes, ["support_threads", "\"fieldPath\": \"userId\"", "\"fieldPath\": \"status\"", "\"fieldPath\": \"lastMessageAt\""]), failures, "index requirement lacks firestore.indexes evidence or setup artifact.");
  pushIf(containsAll(userRoute, ["missing_firestore_index", "isSupportThreadsMissingIndexError", "retryable: false"]), failures, "support/threads missing index failure remains generic 500.");
  pushIf(containsAll(adminRoute, ["missing_firestore_index", "isSupportThreadsMissingIndexError", "retryable: false"]), failures, "admin support index failure remains generic 500.");
  pushIf(helper.includes("SUPPORT_THREADS_INDEX_REQUIREMENTS"), failures, "support index setup artifact missing.");
  pushIf(helper.includes("SUPPORT_THREADS_SAFE_FALLBACK_POLICY") && helper.includes("broadReadFallbackAllowed: false"), failures, "fallback broad-reads support threads.");
  runValidation(report.reportKey, report, failures);
}

export function validateViewerWatchSessionErrorCleanup() {
  const report = buildViewerWatchSessionErrorCleanupReport();
  const route = readText("src/app/api/viewer/watch-session/route.ts");
  const engine = readText("src/lib/analytics/drop-watch-time-engine.ts") + readText("src/lib/analytics/session-metrics-engine.ts");
  const failures = validateViewerWatchSessionErrorCleanupReport(report);
  pushIf(containsAll(route, ["readBoundedJsonBody", "buildWatchSessionClientError", "retryable: false", "invalid_duration", "not_unlocked"]), failures, "viewer/watch-session client errors lack typed classification.");
  pushIf(!route.includes("await request.json()"), failures, "invalid watch payload can retry indefinitely.");
  pushIf(containsAll(route, ["watchSessions", "watchObservations", "watchScoreSource: \"watch_session_rollup\""]), failures, "successful route does not feed persisted watch evidence.");
  pushIf(engine.includes("pageDuration") || route.includes("totalWatchSeconds"), failures, "watch time source evidence missing.");
  runValidation(report.reportKey, report, failures);
}

export function validateUserCheckinRouteErrorMapping() {
  const report = buildUserCheckinRouteErrorMappingReport();
  const profile = readText("src/app/api/user/profile/route.ts");
  const register = readText("src/app/api/user/register/route.ts");
  const checkin = readText("src/app/api/checkin/route.ts");
  const failures = validateUserCheckinRouteErrorMappingReport(report);
  pushIf(containsAll(profile, ["readBoundedJsonBody", "buildUserProfileErrorResponse", "validation_failed", "username_taken", "retryable: false"]), failures, "user/profile expected errors lack typed mapping.");
  pushIf(containsAll(register, ["readBoundedJsonBody", "buildUserRegisterErrorResponse", "validation_failed", "username_taken", "retryable: false"]), failures, "user/register expected errors lack typed mapping.");
  pushIf(containsAll(checkin, ["duplicate_claim", "profile_missing", "retryable: false"]), failures, "checkin expected errors lack typed mapping.");
  runValidation(report.reportKey, report, failures);
}

export function validateStaleRouteSampleClassification() {
  const report = buildStaleRouteSampleClassificationReport();
  const batchReport = buildDebugCockpitBatch19ProductRoutesReport();
  const failures = validateStaleRouteSampleClassificationReport(report);
  pushIf(batchReport.staleCriticalRoutes.includes("paypal/capture:POST"), failures, "stale payment route marked fresh without evidence.");
  pushIf(batchReport.staleRoutesGrouped.length > 0, failures, "grouped stale-route action list missing.");
  pushIf(batchReport.remainingGaps.some((gap) => gap.includes("PayPal capture freshness")), failures, "critical payment route evidence requirement missing.");
  runValidation(report.reportKey, report, failures);
}

export function validateDebugCockpitBatch19ProductRoutes() {
  const report = buildDebugCockpitBatch19ProductRoutesReport();
  const failures = validateDebugCockpitBatch19ProductRoutesReport(report);
  pushIf(report.supportThreadsIndexStatus === "firestore_indexes_configured", failures, "support/threads index failure remains unresolved/unclassified.");
  pushIf(report.currentClientErrorsRemaining.length === 0, failures, "current client errors remain unclassified.");
  pushIf(report.staleCriticalRoutes.includes("paypal/capture:POST"), failures, "paypal/capture stale critical route marked fresh without evidence.");
  runValidation("debug-cockpit-batch19-product-routes", report, failures);
}
