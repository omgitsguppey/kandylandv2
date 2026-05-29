export const IDENTITY_HANDOFF_4XX_POLICY_VERSION = "2026.05.identity-4xx.1";

export type IdentityHandoff4xxClass =
  | "missing_guest_id"
  | "invalid_guest_id"
  | "missing_session_id"
  | "stale_session_id"
  | "expired_session"
  | "missing_user_id"
  | "stale_user_id"
  | "identity_link_conflict"
  | "duplicate_handoff"
  | "role_drift"
  | "consent_handoff_blocked"
  | "malformed_identity_payload"
  | "legacy_identity_unmappable"
  | "suspicious_identity_request";

export interface IdentityHandoff4xxPolicyEntry {
  errorClass: IdentityHandoff4xxClass;
  statusCode: 400 | 401 | 403 | 409 | 422;
  retryable: boolean;
  refreshAllowedOnce?: boolean;
  safeUserCopy: string;
  safeDebugCopy: string;
  telemetryEvent: string;
  diagnosticFingerprint: string;
  recoveryAction: string;
  countImpact: "none" | "guest_preserved" | "user_metric_blocked" | "security_rollup";
}

function entry(input: IdentityHandoff4xxPolicyEntry): IdentityHandoff4xxPolicyEntry {
  return input;
}

export const IDENTITY_HANDOFF_4XX_POLICY: Record<IdentityHandoff4xxClass, IdentityHandoff4xxPolicyEntry> = {
  missing_guest_id: entry({ errorClass: "missing_guest_id", statusCode: 422, retryable: false, safeUserCopy: "We could not link this guest session. Continue signed in.", safeDebugCopy: "Missing guest id for identity handoff.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:missing_guest_id", recoveryAction: "Preserve signed-in action and keep previous guest history separate.", countImpact: "guest_preserved" }),
  invalid_guest_id: entry({ errorClass: "invalid_guest_id", statusCode: 422, retryable: false, safeUserCopy: "This guest session could not be linked.", safeDebugCopy: "Invalid guest id format.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:invalid_guest_id", recoveryAction: "Drop malformed id from the link attempt and roll up diagnostics.", countImpact: "guest_preserved" }),
  missing_session_id: entry({ errorClass: "missing_session_id", statusCode: 422, retryable: false, safeUserCopy: "This session could not be linked yet.", safeDebugCopy: "Missing session id for identity handoff.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:missing_session_id", recoveryAction: "Create a fresh client session before the next action.", countImpact: "user_metric_blocked" }),
  stale_session_id: entry({ errorClass: "stale_session_id", statusCode: 409, retryable: false, safeUserCopy: "Your session changed. Refresh once to continue.", safeDebugCopy: "Stale session id conflict.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:stale_session_id", recoveryAction: "Fetch fresh session state; do not retry stale payload.", countImpact: "user_metric_blocked" }),
  expired_session: entry({ errorClass: "expired_session", statusCode: 401, retryable: true, refreshAllowedOnce: true, safeUserCopy: "Your session expired. Sign in again if refresh does not work.", safeDebugCopy: "Expired auth session.", telemetryEvent: "identity_session_expired", diagnosticFingerprint: "identity:expired_session", recoveryAction: "Allow one auth refresh, then return auth_required.", countImpact: "none" }),
  missing_user_id: entry({ errorClass: "missing_user_id", statusCode: 422, retryable: false, safeUserCopy: "We could not attach this action to your account yet.", safeDebugCopy: "Missing signed-in user id.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:missing_user_id", recoveryAction: "Preserve guest action and wait for authenticated user id.", countImpact: "guest_preserved" }),
  stale_user_id: entry({ errorClass: "stale_user_id", statusCode: 409, retryable: false, safeUserCopy: "Your account state changed. Refresh to continue.", safeDebugCopy: "Stale user id or user snapshot.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:stale_user_id", recoveryAction: "Refetch auth/profile state and clear stale controls.", countImpact: "user_metric_blocked" }),
  identity_link_conflict: entry({ errorClass: "identity_link_conflict", statusCode: 409, retryable: false, safeUserCopy: "This guest session is already linked differently.", safeDebugCopy: "Identity link conflict.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:identity_link_conflict", recoveryAction: "Fetch fresh link state before another handoff attempt.", countImpact: "guest_preserved" }),
  duplicate_handoff: entry({ errorClass: "duplicate_handoff", statusCode: 409, retryable: false, safeUserCopy: "This session link was already handled.", safeDebugCopy: "Duplicate handoff is idempotent.", telemetryEvent: "identity_handoff_duplicate", diagnosticFingerprint: "identity:duplicate_handoff", recoveryAction: "Treat as idempotent success and suppress repeated diagnostics.", countImpact: "none" }),
  role_drift: entry({ errorClass: "role_drift", statusCode: 403, retryable: false, safeUserCopy: "Your access changed. Return to a safe screen.", safeDebugCopy: "Role drift between client controls and server permission.", telemetryEvent: "identity_role_drift", diagnosticFingerprint: "identity:role_drift", recoveryAction: "Clear stale controls and refetch permissions.", countImpact: "none" }),
  consent_handoff_blocked: entry({ errorClass: "consent_handoff_blocked", statusCode: 403, retryable: false, safeUserCopy: "Your privacy settings limit this link.", safeDebugCopy: "Consent blocks persistent identity handoff.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:consent_handoff_blocked", recoveryAction: "Keep operational events only and preserve guest history separately.", countImpact: "guest_preserved" }),
  malformed_identity_payload: entry({ errorClass: "malformed_identity_payload", statusCode: 400, retryable: false, safeUserCopy: "This request could not be understood.", safeDebugCopy: "Malformed identity payload.", telemetryEvent: "identity_handoff_failed", diagnosticFingerprint: "identity:malformed_identity_payload", recoveryAction: "Roll up malformed payload diagnostics by route and actor class.", countImpact: "security_rollup" }),
  legacy_identity_unmappable: entry({ errorClass: "legacy_identity_unmappable", statusCode: 409, retryable: false, safeUserCopy: "Older activity cannot be linked exactly.", safeDebugCopy: "Legacy identity cannot be mapped to exact user truth.", telemetryEvent: "identity_legacy_unmappable", diagnosticFingerprint: "identity:legacy_identity_unmappable", recoveryAction: "Archive as legacy unknown; do not show as exact user metric.", countImpact: "guest_preserved" }),
  suspicious_identity_request: entry({ errorClass: "suspicious_identity_request", statusCode: 403, retryable: false, safeUserCopy: "This request was blocked.", safeDebugCopy: "Suspicious identity request.", telemetryEvent: "identity_suspicious_request", diagnosticFingerprint: "identity:suspicious_identity_request", recoveryAction: "Sample and group security diagnostics without journey events.", countImpact: "security_rollup" }),
};

export function shouldRetryIdentity4xx(errorClass: IdentityHandoff4xxClass, input: { refreshAttempted?: boolean } = {}) {
  const policy = IDENTITY_HANDOFF_4XX_POLICY[errorClass];
  return Boolean(policy.refreshAllowedOnce && !input.refreshAttempted);
}

export function buildIdentity4xxResponse(errorClass: IdentityHandoff4xxClass, input: { route: string; actorKind?: string | null }) {
  const policy = IDENTITY_HANDOFF_4XX_POLICY[errorClass];
  return {
    success: false,
    errorClass,
    statusCode: policy.statusCode,
    retryable: shouldRetryIdentity4xx(errorClass, { refreshAttempted: true }),
    userCopy: policy.safeUserCopy,
    debugCopy: policy.safeDebugCopy,
    telemetryEvent: policy.telemetryEvent,
    diagnosticFingerprint: `${input.route}:${errorClass}:${input.actorKind ?? "identity"}`,
    recoveryAction: policy.recoveryAction,
    countImpact: policy.countImpact,
  };
}

export function validateIdentityHandoff4xxPolicy() {
  const failures: string[] = [];
  for (const [key, policy] of Object.entries(IDENTITY_HANDOFF_4XX_POLICY)) {
    if (!policy.safeUserCopy || !policy.safeDebugCopy) failures.push(`${key} lacks safe copy.`);
    if (!policy.recoveryAction) failures.push(`${key} lacks recovery action.`);
    if (!policy.diagnosticFingerprint) failures.push(`${key} lacks diagnostic fingerprint.`);
    if (key !== "expired_session" && policy.retryable) failures.push(`${key} creates retry loop.`);
  }
  if (!IDENTITY_HANDOFF_4XX_POLICY.duplicate_handoff.recoveryAction.includes("idempotent")) failures.push("duplicate handoff is not idempotent.");
  if (!IDENTITY_HANDOFF_4XX_POLICY.role_drift.recoveryAction.includes("refetch")) failures.push("role drift lacks recovery.");
  return failures;
}
