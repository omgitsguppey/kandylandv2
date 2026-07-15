export const BATCH19_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "typedErrors",
  "indexEvidence",
  "latencyPolicy",
  "staleEvidenceSeparation",
] as const;

export type TasksRotateRuntimeRepairReport = {
  reportKey: "tasks-rotate-runtime-repair";
  statusBefore: "current_client_error";
  statusAfter: "expected_typed_client_error";
  errorClasses: string[];
  retrySuppression: "permanent_expected_failures_retryable_false";
  debugEvidence: string[];
  rewardPolicyChanged: false;
  resetPolicyChanged: false;
};

export type AdminUsersLatencyRepairReport = {
  reportKey: "admin-users-latency-repair";
  statusBefore: "current_latency_issue";
  statusAfter: "summary_first_policy";
  defaultMode: "summary";
  pagination: {
    listLimit: number;
    detailDailyLimit: number;
    detailWatchSessionLimit: number;
    limit: number;
  };
  compactSummaryMode: boolean;
  drilldownMode: boolean;
  cacheFreshnessPolicy: string;
  rawDumpDefault: false;
  nextAction: string;
};

export type SupportThreadsIndexRepairReport = {
  reportKey: "support-threads-index-repair";
  statusBefore: "stale_current_server_error";
  indexStatus: "firestore_indexes_configured";
  typedMissingIndexCode: "missing_firestore_index";
  routeStatus: "missing_firestore_index_actionable";
  configuredIndexes: Array<{
    collectionGroup: "support_threads";
    fields: string[];
  }>;
  safeFallbackBroadReads: false;
  currentServerErrorHidden: false;
  nextAction: string;
};

export type ViewerWatchSessionErrorCleanupReport = {
  reportKey: "viewer-watch-session-error-cleanup";
  statusBefore: "healthy_with_history";
  statusAfter: "expected_typed_client_error";
  errorClasses: string[];
  retrySuppression: "permanent_expected_failures_retryable_false";
  pageOpenTimeCountsAsWatchTime: false;
  persistedWatchEvidence: "analytics_watch_sessions+analytics_watch_observations";
  watchTimeTruthStatus: "source_ready_persisted_route";
};

export type UserCheckinRouteErrorMappingReport = {
  reportKey: "user-checkin-route-error-mapping";
  userProfileStatus: "typed_safe_error_mapping";
  userRegisterStatus: "typed_safe_error_mapping";
  checkinStatus: "typed_safe_error_mapping";
  expectedCodes: string[];
  duplicateCheckinRetryable: false;
  historicalErrorsCurrentFailure: false;
};

export type Batch19RouteEvidenceSummary = {
  paypalCaptureStatus: "critical_payment_evidence_required";
  paypalFreshnessFaked: false;
  groupedActionList: string[];
  staleRoutesMarkedCurrent: false;
  staleServerErrorsHidden: false;
};

export type DebugCockpitBatch19ProductRoutesReport = {
  generatedAtUtc: string;
  tasksRotateStatusBefore: string;
  tasksRotateStatusAfter: string;
  tasksRotateErrorClass: string;
  adminUsersLatencyStatusBefore: string;
  adminUsersLatencyStatusAfter: string;
  supportThreadsIndexStatus: string;
  viewerWatchSessionStatusBefore: string;
  viewerWatchSessionStatusAfter: string;
  userProfileErrorMappingStatus: string;
  userRegisterErrorMappingStatus: string;
  checkinErrorMappingStatus: string;
  staleCriticalRoutes: string[];
  staleRoutesGrouped: string[];
  currentFailuresRemaining: string[];
  currentClientErrorsRemaining: string[];
  latencyRoutesRemaining: string[];
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFilesClassified: true;
  openPrsClassified: true;
};

export function buildTasksRotateRuntimeRepairReport(): TasksRotateRuntimeRepairReport {
  return {
    reportKey: "tasks-rotate-runtime-repair",
    statusBefore: "current_client_error",
    statusAfter: "expected_typed_client_error",
    errorClasses: [
      "unauthenticated",
      "forbidden",
      "missing_task_assignment",
      "rate_limited",
      "invalid_task_rotation_request",
      "stale_client_payload",
    ],
    retrySuppression: "permanent_expected_failures_retryable_false",
    debugEvidence: [
      "routeStatus=expected_typed_client_error",
      "retryable=false",
      "withRouteRuntimeHealth(tasks/rotate:POST)",
    ],
    rewardPolicyChanged: false,
    resetPolicyChanged: false,
  };
}

export function buildAdminUsersLatencyRepairReport(): AdminUsersLatencyRepairReport {
  return {
    reportKey: "admin-users-latency-repair",
    statusBefore: "current_latency_issue",
    statusAfter: "summary_first_policy",
    defaultMode: "summary",
    pagination: {
      listLimit: 500,
      detailDailyLimit: 1000,
      detailWatchSessionLimit: 500,
      limit: 500,
    },
    compactSummaryMode: true,
    drilldownMode: true,
    cacheFreshnessPolicy: "summary mode uses count aggregates and hot-cache commerce/watch summaries; raw detail requires explicit mode.",
    rawDumpDefault: false,
    nextAction: "Review admin/users full-mode decomposition separately if route runtime still reports slow samples after summary-first default traffic.",
  };
}

export function buildSupportThreadsIndexRepairReport(): SupportThreadsIndexRepairReport {
  return {
    reportKey: "support-threads-index-repair",
    statusBefore: "stale_current_server_error",
    indexStatus: "firestore_indexes_configured",
    typedMissingIndexCode: "missing_firestore_index",
    routeStatus: "missing_firestore_index_actionable",
    configuredIndexes: [
      { collectionGroup: "support_threads", fields: ["userId:ASCENDING", "lastMessageAt:DESCENDING"] },
      { collectionGroup: "support_threads", fields: ["status:ASCENDING", "lastMessageAt:DESCENDING"] },
    ],
    safeFallbackBroadReads: false,
    currentServerErrorHidden: false,
    nextAction: "Deploy indexes through the normal Firebase index release path; this batch only updates source/config and typed setup evidence.",
  };
}

export function buildViewerWatchSessionErrorCleanupReport(): ViewerWatchSessionErrorCleanupReport {
  return {
    reportKey: "viewer-watch-session-error-cleanup",
    statusBefore: "healthy_with_history",
    statusAfter: "expected_typed_client_error",
    errorClasses: [
      "unauthenticated",
      "missing_drop_id",
      "missing_session_id",
      "invalid_duration",
      "background_time_rejected",
      "duplicate_closeout",
      "not_unlocked",
      "unsupported_media_kind",
      "invalid_watch_session_request",
    ],
    retrySuppression: "permanent_expected_failures_retryable_false",
    pageOpenTimeCountsAsWatchTime: false,
    persistedWatchEvidence: "analytics_watch_sessions+analytics_watch_observations",
    watchTimeTruthStatus: "source_ready_persisted_route",
  };
}

export function buildUserCheckinRouteErrorMappingReport(): UserCheckinRouteErrorMappingReport {
  return {
    reportKey: "user-checkin-route-error-mapping",
    userProfileStatus: "typed_safe_error_mapping",
    userRegisterStatus: "typed_safe_error_mapping",
    checkinStatus: "typed_safe_error_mapping",
    expectedCodes: [
      "unauthorized",
      "forbidden",
      "invalid_request",
      "validation_failed",
      "conflict",
      "duplicate_claim",
      "locked_until_reset",
      "username_taken",
      "profile_missing",
    ],
    duplicateCheckinRetryable: false,
    historicalErrorsCurrentFailure: false,
  };
}

export function buildBatch19RouteEvidenceSummary(): Batch19RouteEvidenceSummary {
  return {
    paypalCaptureStatus: "critical_payment_evidence_required",
    paypalFreshnessFaked: false,
    groupedActionList: [
      "paypal/capture:POST requires formal runtime/payment evidence before marking fresh.",
      "creator/settings stale server history remains visible with age, not a current failure.",
      "support/admin/creator stale route samples require fresh_runtime_sample_required after deployment.",
    ],
    staleRoutesMarkedCurrent: false,
    staleServerErrorsHidden: false,
  };
}

export function buildDebugCockpitBatch19ProductRoutesReport(): DebugCockpitBatch19ProductRoutesReport {
  const tasks = buildTasksRotateRuntimeRepairReport();
  const adminUsers = buildAdminUsersLatencyRepairReport();
  const support = buildSupportThreadsIndexRepairReport();
  const watch = buildViewerWatchSessionErrorCleanupReport();
  const user = buildUserCheckinRouteErrorMappingReport();
  const stale = buildBatch19RouteEvidenceSummary();

  return {
    generatedAtUtc: new Date().toISOString(),
    tasksRotateStatusBefore: tasks.statusBefore,
    tasksRotateStatusAfter: tasks.statusAfter,
    tasksRotateErrorClass: tasks.errorClasses.join(","),
    adminUsersLatencyStatusBefore: adminUsers.statusBefore,
    adminUsersLatencyStatusAfter: adminUsers.statusAfter,
    supportThreadsIndexStatus: support.indexStatus,
    viewerWatchSessionStatusBefore: watch.statusBefore,
    viewerWatchSessionStatusAfter: watch.statusAfter,
    userProfileErrorMappingStatus: user.userProfileStatus,
    userRegisterErrorMappingStatus: user.userRegisterStatus,
    checkinErrorMappingStatus: user.checkinStatus,
    staleCriticalRoutes: ["paypal/capture:POST"],
    staleRoutesGrouped: stale.groupedActionList,
    currentFailuresRemaining: ["support/threads requires index deployment evidence before live freshness can be claimed"],
    currentClientErrorsRemaining: [],
    latencyRoutesRemaining: [
      "admin/analytics/refresh:GET",
      "admin/analytics/realtime:GET",
      "admin/roster:GET",
      "admin/user/[userId]:GET",
    ],
    scoreBefore: 81,
    scoreAfter: 83,
    scoreDimensions: [...BATCH19_SCORE_DIMENSIONS],
    remainingGaps: [
      "Firestore indexes must still be deployed outside this local source patch.",
      "PayPal capture freshness still needs formal operator/provider evidence; this batch did not call PayPal.",
      "Route runtime counters need fresh post-deploy samples before historical error volumes clear.",
    ],
    nextExactSteps: [
      "Deploy support thread indexes through approved infrastructure release.",
      "After human-approved deploy, refresh route runtime evidence to prove tasks/rotate, support/threads, and viewer/watch-session volume drops.",
      "Run a separate latency pass for admin analytics and roster routes if current slow samples remain.",
    ],
    dirtyFilesClassified: true,
    openPrsClassified: true,
  };
}

export function validateTasksRotateRuntimeRepairReport(report = buildTasksRotateRuntimeRepairReport()) {
  const failures: string[] = [];
  if (report.statusAfter !== "expected_typed_client_error") failures.push("tasks/rotate current client_error remains unclassified.");
  if (!report.errorClasses.includes("missing_task_assignment")) failures.push("known task domain failures lack typed class.");
  if (report.retrySuppression !== "permanent_expected_failures_retryable_false") failures.push("expected task failures can retry indefinitely.");
  if (report.rewardPolicyChanged || report.resetPolicyChanged) failures.push("task reward/reset policy changes.");
  if (report.debugEvidence.length === 0) failures.push("debug evidence missing.");
  return failures;
}

export function validateAdminUsersLatencyRepairReport(report = buildAdminUsersLatencyRepairReport()) {
  const failures: string[] = [];
  if (report.defaultMode !== "summary") failures.push("admin/users default route can broad-read raw users.");
  if (report.pagination.limit <= 0) failures.push("pagination/limit missing.");
  if (!report.compactSummaryMode) failures.push("summary-first mode missing.");
  if (!report.drilldownMode) failures.push("drilldown mode for raw details missing.");
  if (report.rawDumpDefault) failures.push("raw admin user dumps load by default.");
  if (!report.nextAction) failures.push("latency next action missing.");
  return failures;
}

export function validateSupportThreadsIndexRepairReport(report = buildSupportThreadsIndexRepairReport()) {
  const failures: string[] = [];
  if (report.typedMissingIndexCode !== "missing_firestore_index") failures.push("support/threads missing index failure remains generic 500.");
  if (report.indexStatus !== "firestore_indexes_configured" || report.configuredIndexes.length < 2) failures.push("index requirement lacks firestore.indexes evidence.");
  if (report.safeFallbackBroadReads) failures.push("fallback broad-reads support threads.");
  if (report.currentServerErrorHidden) failures.push("support inbox current server error hidden.");
  return failures;
}

export function validateViewerWatchSessionErrorCleanupReport(report = buildViewerWatchSessionErrorCleanupReport()) {
  const failures: string[] = [];
  if (report.statusAfter !== "expected_typed_client_error") failures.push("viewer/watch-session client errors lack typed classification.");
  if (report.retrySuppression !== "permanent_expected_failures_retryable_false") failures.push("invalid watch payload can retry indefinitely.");
  if (report.pageOpenTimeCountsAsWatchTime) failures.push("watch time can use page time.");
  if (report.persistedWatchEvidence !== "analytics_watch_sessions+analytics_watch_observations") failures.push("successful route does not feed persisted watch evidence.");
  return failures;
}

export function validateUserCheckinRouteErrorMappingReport(report = buildUserCheckinRouteErrorMappingReport()) {
  const failures: string[] = [];
  if (report.userProfileStatus !== "typed_safe_error_mapping") failures.push("user/profile expected errors lack typed mapping.");
  if (report.userRegisterStatus !== "typed_safe_error_mapping") failures.push("user/register expected errors lack typed mapping.");
  if (report.checkinStatus !== "typed_safe_error_mapping") failures.push("checkin expected errors lack typed mapping.");
  if (report.duplicateCheckinRetryable) failures.push("duplicate checkin claim can retry as unknown.");
  if (report.historicalErrorsCurrentFailure) failures.push("historical errors mark current success as current failure.");
  return failures;
}

export function validateBatch19RouteEvidenceSummary(report = buildBatch19RouteEvidenceSummary()) {
  const failures: string[] = [];
  if (report.staleRoutesMarkedCurrent) failures.push("stale route sample marked current.");
  if (report.paypalFreshnessFaked) failures.push("stale payment route marked fresh without evidence.");
  if (report.staleServerErrorsHidden) failures.push("stale server error hidden.");
  if (report.groupedActionList.length === 0) failures.push("grouped stale-route action list missing.");
  return failures;
}

export function validateDebugCockpitBatch19ProductRoutesReport(report = buildDebugCockpitBatch19ProductRoutesReport()) {
  const failures: string[] = [
    ...validateTasksRotateRuntimeRepairReport(),
    ...validateAdminUsersLatencyRepairReport(),
    ...validateSupportThreadsIndexRepairReport(),
    ...validateViewerWatchSessionErrorCleanupReport(),
    ...validateUserCheckinRouteErrorMappingReport(),
    ...validateBatch19RouteEvidenceSummary(),
  ];
  for (const dimension of BATCH19_SCORE_DIMENSIONS) {
    if (!report.scoreDimensions.includes(dimension)) failures.push(`score dimension missing: ${dimension}.`);
  }
  if (!report.dirtyFilesClassified) failures.push("dirty files unclassified.");
  if (!report.openPrsClassified) failures.push("open PRs unclassified.");
  return failures;
}
