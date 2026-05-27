import type { Route4xxClass } from "./route-4xx-taxonomy";

export interface AuthRoleDrift4xxPolicyEntry {
  caseId:
    | "expired_session"
    | "missing_token"
    | "stale_local_user_profile"
    | "role_downgraded_stale_controls"
    | "creator_admin_route_after_role_change"
    | "deleted_suspended_or_banned_user"
    | "auth_provider_conflict_after_stale_session"
    | "profile_snapshot_missing";
  errorClass: Route4xxClass;
  authRefreshPolicy: {
    allowed: boolean;
    maxAttempts: 0 | 1;
  };
  clearStaleClientState: boolean;
  safeRedirect: string;
  finalRetryable: boolean;
  safeUserCopy: string;
  telemetryEvent: string;
  debugLane: "auth_runtime" | "role_permission" | "account_safety";
}

export const AUTH_ROLE_DRIFT_4XX_POLICY: readonly AuthRoleDrift4xxPolicyEntry[] = [
  {
    caseId: "expired_session",
    errorClass: "auth_required",
    authRefreshPolicy: { allowed: true, maxAttempts: 1 },
    clearStaleClientState: true,
    safeRedirect: "/login",
    finalRetryable: false,
    safeUserCopy: "Your session expired. Sign in again to continue.",
    telemetryEvent: "auth_4xx_session_expired",
    debugLane: "auth_runtime",
  },
  {
    caseId: "missing_token",
    errorClass: "auth_required",
    authRefreshPolicy: { allowed: true, maxAttempts: 1 },
    clearStaleClientState: true,
    safeRedirect: "/login",
    finalRetryable: false,
    safeUserCopy: "Sign in before continuing.",
    telemetryEvent: "auth_4xx_token_missing",
    debugLane: "auth_runtime",
  },
  {
    caseId: "stale_local_user_profile",
    errorClass: "stale_client_state",
    authRefreshPolicy: { allowed: false, maxAttempts: 0 },
    clearStaleClientState: true,
    safeRedirect: "/dashboard",
    finalRetryable: false,
    safeUserCopy: "Your profile changed. Refreshing your account state.",
    telemetryEvent: "auth_4xx_profile_stale",
    debugLane: "auth_runtime",
  },
  {
    caseId: "role_downgraded_stale_controls",
    errorClass: "permission_denied",
    authRefreshPolicy: { allowed: false, maxAttempts: 0 },
    clearStaleClientState: true,
    safeRedirect: "/dashboard",
    finalRetryable: false,
    safeUserCopy: "Your access changed. Returning to an allowed screen.",
    telemetryEvent: "auth_4xx_role_drift",
    debugLane: "role_permission",
  },
  {
    caseId: "creator_admin_route_after_role_change",
    errorClass: "permission_denied",
    authRefreshPolicy: { allowed: false, maxAttempts: 0 },
    clearStaleClientState: true,
    safeRedirect: "/dashboard",
    finalRetryable: false,
    safeUserCopy: "This tool is not available for your current role.",
    telemetryEvent: "auth_4xx_creator_admin_role_drift",
    debugLane: "role_permission",
  },
  {
    caseId: "deleted_suspended_or_banned_user",
    errorClass: "permission_denied",
    authRefreshPolicy: { allowed: false, maxAttempts: 0 },
    clearStaleClientState: true,
    safeRedirect: "/support",
    finalRetryable: false,
    safeUserCopy: "This account is unavailable. Contact support if you think this is wrong.",
    telemetryEvent: "auth_4xx_account_unavailable",
    debugLane: "account_safety",
  },
  {
    caseId: "auth_provider_conflict_after_stale_session",
    errorClass: "conflict",
    authRefreshPolicy: { allowed: true, maxAttempts: 1 },
    clearStaleClientState: true,
    safeRedirect: "/login",
    finalRetryable: false,
    safeUserCopy: "Your sign-in state changed. Sign in again before retrying.",
    telemetryEvent: "auth_4xx_provider_conflict",
    debugLane: "auth_runtime",
  },
  {
    caseId: "profile_snapshot_missing",
    errorClass: "not_found",
    authRefreshPolicy: { allowed: false, maxAttempts: 0 },
    clearStaleClientState: true,
    safeRedirect: "/dashboard",
    finalRetryable: false,
    safeUserCopy: "Your profile is not ready yet. Refresh account setup before continuing.",
    telemetryEvent: "auth_4xx_profile_missing",
    debugLane: "auth_runtime",
  },
];

export function validateAuthRoleDrift4xxPolicy(entries = AUTH_ROLE_DRIFT_4XX_POLICY) {
  const failures: string[] = [];
  for (const entry of entries) {
    if (entry.authRefreshPolicy.maxAttempts > 1) failures.push(`${entry.caseId} can refresh auth too many times.`);
    if (entry.finalRetryable) failures.push(`${entry.caseId} final 4xx is retryable.`);
    if ((entry.errorClass === "permission_denied" || entry.errorClass === "stale_client_state") && !entry.clearStaleClientState) {
      failures.push(`${entry.caseId} does not clear stale client state.`);
    }
    if (!entry.safeUserCopy || /internal server error|request failed/iu.test(entry.safeUserCopy)) failures.push(`${entry.caseId} uses generic user copy.`);
    if (!entry.telemetryEvent || !entry.debugLane) failures.push(`${entry.caseId} lacks auth telemetry/debug lane.`);
  }
  return failures;
}

export function buildAuthRoleDrift4xxPolicyReport(generatedAtUtc = new Date().toISOString()) {
  const validationFailures = validateAuthRoleDrift4xxPolicy();
  return {
    reportKey: "auth-role-drift-4xx-policy",
    generatedAtUtc,
    status: validationFailures.length === 0 ? "pass" : "fail",
    authRoleDriftCasesCovered: AUTH_ROLE_DRIFT_4XX_POLICY.length,
    stateClearingCases: AUTH_ROLE_DRIFT_4XX_POLICY.filter((entry) => entry.clearStaleClientState).length,
    oneRefreshMaxCases: AUTH_ROLE_DRIFT_4XX_POLICY.filter((entry) => entry.authRefreshPolicy.maxAttempts === 1).length,
    validationFailures,
  };
}
