import type {
  AuthLogoutReason,
  AuthProfileSnapshotStatus,
  AuthRecoveryBehavior,
  AuthSessionRestoreReason,
  AuthStateSource,
} from "@/lib/auth/auth-persistence-contract";

export type AuthStateTransitionInput = {
  previousUserId: string | null;
  nextUserId: string | null;
  initialAuthResolved: boolean;
  explicitLogoutInFlight?: boolean;
  navigationSessionFailureInFlight?: boolean;
};

export type AuthStateTransitionClassification = {
  authStateSource: AuthStateSource;
  sessionRestoreReason: AuthSessionRestoreReason | null;
  logoutReason: AuthLogoutReason | null;
  unexpectedDrop: boolean;
  shouldClearUserState: boolean;
  shouldDeleteNavigationSession: boolean;
  recoveryBehavior: AuthRecoveryBehavior;
};

export type AuthPersistenceTelemetryInput = {
  eventName:
    | "auth_persistence_established"
    | "auth_session_restored"
    | "auth_state_changed"
    | "auth_unexpected_session_drop"
    | "auth_logout_started"
    | "auth_logout_completed"
    | "auth_navigation_session_deleted"
    | "auth_profile_snapshot_reconnect"
    | "auth_profile_snapshot_failed";
  userId?: string | null;
  previousUserId?: string | null;
  nextUserId?: string | null;
  authProvider?: string | null;
  logoutReason?: AuthLogoutReason | null;
  sessionRestoreReason?: AuthSessionRestoreReason | null;
  profileSnapshotStatus?: AuthProfileSnapshotStatus | null;
  navigationSessionStatus?: string | null;
  sourceComponent?: string;
  sourceTruth?: string;
  failureCode?: string;
};

function hasUser(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function classifyLogoutReason(input: {
  explicitLogoutInFlight?: boolean;
  securityStatus?: "banned" | "suspended" | null;
  navigationSessionFailed?: boolean;
  tokenInvalid?: boolean;
  profileMissingTimeout?: boolean;
  backendRegistrationFailed?: boolean;
}): AuthLogoutReason {
  if (input.explicitLogoutInFlight) return "explicit_user_logout";
  if (input.securityStatus === "banned") return "security_banned";
  if (input.securityStatus === "suspended") return "security_suspended";
  if (input.navigationSessionFailed) return "navigation_session_failed";
  if (input.tokenInvalid) return "token_invalid";
  if (input.profileMissingTimeout) return "profile_missing_timeout";
  if (input.backendRegistrationFailed) return "backend_registration_failed";
  return "unknown";
}

export function classifyAuthStateTransition(
  input: AuthStateTransitionInput,
): AuthStateTransitionClassification {
  const previousUser = hasUser(input.previousUserId);
  const nextUser = hasUser(input.nextUserId);
  const logoutReason = !nextUser && previousUser
    ? classifyLogoutReason({
      explicitLogoutInFlight: input.explicitLogoutInFlight,
      navigationSessionFailed: input.navigationSessionFailureInFlight,
      tokenInvalid: !input.explicitLogoutInFlight && !input.navigationSessionFailureInFlight,
    })
    : null;
  const sessionRestoreReason = !input.initialAuthResolved && nextUser
    ? "initial_browser_local_restore"
    : !previousUser && nextUser
      ? "provider_login_completed"
      : null;
  const unexpectedDrop = logoutReason === "token_invalid" || logoutReason === "unknown";
  const shouldClear = Boolean(logoutReason);
  const shouldDeleteSession = Boolean(logoutReason && logoutReason !== "explicit_user_logout");

  return {
    authStateSource: sessionRestoreReason === "initial_browser_local_restore"
      ? "browser_local_persistence"
      : logoutReason === "explicit_user_logout"
        ? "explicit_logout"
        : "firebase_auth_observer",
    sessionRestoreReason,
    logoutReason,
    unexpectedDrop,
    shouldClearUserState: shouldClear,
    shouldDeleteNavigationSession: shouldDeleteSession,
    recoveryBehavior: shouldDeleteSession ? "delete_navigation_session" : shouldClear ? "clear_user_state" : "retry_navigation_session",
  };
}

export function shouldClearUserState(input: {
  logoutReason?: AuthLogoutReason | null;
  profileSnapshotStatus?: AuthProfileSnapshotStatus | null;
}) {
  if (input.profileSnapshotStatus === "reconnecting") {
    return false;
  }

  return Boolean(input.logoutReason);
}

export function shouldDeleteNavigationSession(input: {
  logoutReason?: AuthLogoutReason | null;
  explicitLogoutAlreadyDeleted?: boolean;
}) {
  if (!input.logoutReason) {
    return false;
  }

  if (input.logoutReason === "explicit_user_logout" && input.explicitLogoutAlreadyDeleted) {
    return false;
  }

  return true;
}

export function shouldRetryProfileSnapshot(input: {
  profileSnapshotStatus: AuthProfileSnapshotStatus;
  hasAuthUser: boolean;
  logoutReason?: AuthLogoutReason | null;
}) {
  return input.hasAuthUser
    && !input.logoutReason
    && (input.profileSnapshotStatus === "reconnecting" || input.profileSnapshotStatus === "failed");
}

export function buildAuthPersistenceTelemetry(input: AuthPersistenceTelemetryInput) {
  return {
    eventName: input.eventName,
    params: {
      previousUserPresent: Boolean(input.previousUserId),
      nextUserPresent: Boolean(input.nextUserId),
      userPresent: Boolean(input.userId),
      userIdRedacted: input.userId ? "present" : "",
      authProvider: input.authProvider || "unknown",
      logoutReason: input.logoutReason || "",
      sessionRestoreReason: input.sessionRestoreReason || "",
      profileSnapshotStatus: input.profileSnapshotStatus || "",
      navigationSessionStatus: input.navigationSessionStatus || "",
      sourceComponent: input.sourceComponent || "AuthContext",
      sourceTruth: input.sourceTruth || "client_auth",
      failureCode: input.failureCode || "",
      piiRedacted: true,
      passwordIncluded: false,
    },
  };
}
