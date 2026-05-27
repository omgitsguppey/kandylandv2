import type { Route4xxClass } from "./route-4xx-taxonomy";

export interface ClientCallsite4xxEntry {
  callsitePath: string;
  routeCalled: string;
  surfaceId: string;
  featureId: string;
  userAction: string;
  expected4xxClasses: readonly Route4xxClass[];
  retryPolicy: {
    permanent4xxRetryable: boolean;
    authRefreshAttempts: 0 | 1;
    clearStaleState: boolean;
    backoffRequiredFor429: boolean;
  };
  staleStateRisk: "none" | "resource_selection" | "cached_identity" | "cached_route";
  deepLinkRisk: "none" | "notification" | "pwa_cache" | "saved_link" | "release_note";
  permissionDriftRisk: "none" | "auth_expiry" | "role_downgrade" | "resource_privacy";
  errorDisplayState: {
    state: "safe_error" | "permission_denied" | "resource_unavailable" | "rate_limited";
    safeCopy: string;
  };
  telemetryEvent: string;
  diagnosticPolicy: {
    writeMode: "hourly_rollup";
    spamGuard: "fingerprint_per_hour";
  };
}

export const CLIENT_CALLSITE_4XX_MAP: readonly ClientCallsite4xxEntry[] = [
  {
    callsitePath: "src/lib/authFetch.ts",
    routeCalled: "shared authenticated API wrapper",
    surfaceId: "shared_client_runtime",
    featureId: "auth",
    userAction: "authenticated_request",
    expected4xxClasses: ["auth_required", "permission_denied", "rate_limited"],
    retryPolicy: { permanent4xxRetryable: false, authRefreshAttempts: 1, clearStaleState: true, backoffRequiredFor429: true },
    staleStateRisk: "cached_identity",
    deepLinkRisk: "none",
    permissionDriftRisk: "auth_expiry",
    errorDisplayState: { state: "permission_denied", safeCopy: "Your session or access changed. Sign in again or return to a safe screen." },
    telemetryEvent: "auth_fetch_failed",
    diagnosticPolicy: { writeMode: "hourly_rollup", spamGuard: "fingerprint_per_hour" },
  },
  {
    callsitePath: "src/context/AuthContext.tsx",
    routeCalled: "/api/auth/navigation-session",
    surfaceId: "app_shell",
    featureId: "auth_navigation",
    userAction: "restore_navigation_session",
    expected4xxClasses: ["auth_required", "stale_client_state", "permanent_client_error"],
    retryPolicy: { permanent4xxRetryable: false, authRefreshAttempts: 1, clearStaleState: true, backoffRequiredFor429: true },
    staleStateRisk: "cached_identity",
    deepLinkRisk: "pwa_cache",
    permissionDriftRisk: "auth_expiry",
    errorDisplayState: { state: "safe_error", safeCopy: "Your session changed. Refresh sign-in before continuing." },
    telemetryEvent: "navigation_session_failed",
    diagnosticPolicy: { writeMode: "hourly_rollup", spamGuard: "fingerprint_per_hour" },
  },
  {
    callsitePath: "src/hooks/useNotifications.ts",
    routeCalled: "/api/notifications",
    surfaceId: "notifications",
    featureId: "notifications",
    userAction: "open_notification_center",
    expected4xxClasses: ["auth_required", "permission_denied", "not_found", "stale_client_state"],
    retryPolicy: { permanent4xxRetryable: false, authRefreshAttempts: 1, clearStaleState: true, backoffRequiredFor429: true },
    staleStateRisk: "cached_route",
    deepLinkRisk: "notification",
    permissionDriftRisk: "resource_privacy",
    errorDisplayState: { state: "resource_unavailable", safeCopy: "That notification target is no longer available. Open the latest notifications list." },
    telemetryEvent: "notification_target_unavailable",
    diagnosticPolicy: { writeMode: "hourly_rollup", spamGuard: "fingerprint_per_hour" },
  },
  {
    callsitePath: "src/hooks/useDrops.ts",
    routeCalled: "/api/drops",
    surfaceId: "drops_library",
    featureId: "drops",
    userAction: "load_drop_feed",
    expected4xxClasses: ["validation_error", "not_found", "stale_client_state"],
    retryPolicy: { permanent4xxRetryable: false, authRefreshAttempts: 0, clearStaleState: true, backoffRequiredFor429: true },
    staleStateRisk: "resource_selection",
    deepLinkRisk: "saved_link",
    permissionDriftRisk: "resource_privacy",
    errorDisplayState: { state: "resource_unavailable", safeCopy: "This drop link is stale. Return to the current Drops feed." },
    telemetryEvent: "drop_link_unavailable",
    diagnosticPolicy: { writeMode: "hourly_rollup", spamGuard: "fingerprint_per_hour" },
  },
  {
    callsitePath: "src/app/admin/user/[userId]/page.tsx",
    routeCalled: "/api/admin/user/[userId]",
    surfaceId: "admin_user_management",
    featureId: "admin",
    userAction: "open_admin_user_detail",
    expected4xxClasses: ["auth_required", "permission_denied", "not_found", "validation_error"],
    retryPolicy: { permanent4xxRetryable: false, authRefreshAttempts: 1, clearStaleState: true, backoffRequiredFor429: true },
    staleStateRisk: "resource_selection",
    deepLinkRisk: "saved_link",
    permissionDriftRisk: "role_downgrade",
    errorDisplayState: { state: "permission_denied", safeCopy: "This admin record is unavailable or your access changed. Return to user search." },
    telemetryEvent: "admin_user_detail_failed",
    diagnosticPolicy: { writeMode: "hourly_rollup", spamGuard: "fingerprint_per_hour" },
  },
  {
    callsitePath: "src/hooks/useAdminModerationRealtime.ts",
    routeCalled: "/api/admin/moderation/threads/[threadId]",
    surfaceId: "admin_moderation",
    featureId: "admin",
    userAction: "open_moderation_thread",
    expected4xxClasses: ["auth_required", "permission_denied", "not_found", "validation_error"],
    retryPolicy: { permanent4xxRetryable: false, authRefreshAttempts: 1, clearStaleState: true, backoffRequiredFor429: true },
    staleStateRisk: "resource_selection",
    deepLinkRisk: "saved_link",
    permissionDriftRisk: "role_downgrade",
    errorDisplayState: { state: "resource_unavailable", safeCopy: "That moderation thread is unavailable. Refresh the queue." },
    telemetryEvent: "moderation_thread_unavailable",
    diagnosticPolicy: { writeMode: "hourly_rollup", spamGuard: "fingerprint_per_hour" },
  },
];

export function validateClientCallsite4xxMap(entries = CLIENT_CALLSITE_4XX_MAP) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (!entry.callsitePath || !entry.routeCalled) failures.push("Client callsite lacks path or route.");
    if (entry.expected4xxClasses.length === 0) failures.push(`${entry.callsitePath} lacks expected 4xx classes.`);
    if (entry.retryPolicy.permanent4xxRetryable) failures.push(`${entry.callsitePath} retries permanent 4xx.`);
    if (entry.expected4xxClasses.includes("rate_limited") && !entry.retryPolicy.backoffRequiredFor429) {
      failures.push(`${entry.callsitePath} rate limit lacks backoff.`);
    }
    if ((entry.staleStateRisk !== "none" || entry.deepLinkRisk !== "none") && !entry.retryPolicy.clearStaleState) {
      failures.push(`${entry.callsitePath} stale/deep link risk does not clear stale state.`);
    }
    if (!entry.errorDisplayState.safeCopy || /request failed|internal server error/iu.test(entry.errorDisplayState.safeCopy)) {
      failures.push(`${entry.callsitePath} uses generic/raw user copy.`);
    }
    if (!entry.telemetryEvent || !entry.diagnosticPolicy.spamGuard) failures.push(`${entry.callsitePath} lacks telemetry or diagnostic spam guard.`);
  }
  return failures;
}

export function buildClientCallsite4xxMapReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateClientCallsite4xxMap();
  return {
    reportKey: "client-callsite-4xx-map",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    clientCallsitesAudited: CLIENT_CALLSITE_4XX_MAP.length,
    staleStateCallsites: CLIENT_CALLSITE_4XX_MAP.filter((entry) => entry.staleStateRisk !== "none").length,
    deepLinkCallsites: CLIENT_CALLSITE_4XX_MAP.filter((entry) => entry.deepLinkRisk !== "none").length,
    retryLoopsPrevented: CLIENT_CALLSITE_4XX_MAP.filter((entry) => !entry.retryPolicy.permanent4xxRetryable).length,
    validationFailures,
  };
}
