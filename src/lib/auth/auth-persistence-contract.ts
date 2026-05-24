export type AuthPersistenceStatus =
  | "browser_local_persistence_established"
  | "establishing"
  | "failed"
  | "unavailable";

export type AuthStateSource =
  | "firebase_auth_observer"
  | "browser_local_persistence"
  | "server_navigation_session"
  | "profile_snapshot"
  | "explicit_logout"
  | "unknown";

export type AuthNavigationSessionStatus =
  | "not_required"
  | "sync_pending"
  | "synced"
  | "delete_pending"
  | "deleted"
  | "failed";

export type AuthProfileSnapshotStatus =
  | "not_started"
  | "loading"
  | "loaded"
  | "reconnecting"
  | "failed"
  | "missing_timeout"
  | "security_blocked";

export type AuthSessionRestoreReason =
  | "initial_browser_local_restore"
  | "provider_login_completed"
  | "email_login_completed"
  | "email_signup_completed"
  | "navigation_session_synced"
  | "unknown";

export type AuthLogoutReason =
  | "explicit_user_logout"
  | "security_banned"
  | "security_suspended"
  | "navigation_session_failed"
  | "token_invalid"
  | "profile_missing_timeout"
  | "backend_registration_failed"
  | "unknown";

export type AuthRecoveryBehavior =
  | "keep_authenticated_retry_profile_snapshot"
  | "clear_user_state"
  | "delete_navigation_session"
  | "redirect_banned"
  | "retry_navigation_session"
  | "manual_support";

export type AuthPersistenceDebugLane = {
  laneId: "auth_persistence";
  label: "Auth persistence";
  status: "live" | "degraded" | "failed" | "unavailable";
  persistenceStatus: AuthPersistenceStatus;
  restoredSessions: number;
  unexpectedDrops: number;
  navigationSessionFailures: number;
  profileSnapshotReconnects: number;
  securityLogoutCount: number;
  telemetryStatus: "mapped" | "missing";
  rawCredentialsExposed: false;
  rawDetailsCollapsedByDefault: true;
};

export const AUTH_PERSISTENCE_CONTRACT = {
  persistenceStatus: "browser_local_persistence_established",
  authStateSource: "firebase_auth_observer",
  navigationSessionStatus: "sync_pending",
  profileSnapshotStatus: "loading",
  sessionRestoreReasons: [
    "initial_browser_local_restore",
    "provider_login_completed",
    "email_login_completed",
    "email_signup_completed",
    "navigation_session_synced",
    "unknown",
  ],
  logoutReasons: [
    "explicit_user_logout",
    "security_banned",
    "security_suspended",
    "navigation_session_failed",
    "token_invalid",
    "profile_missing_timeout",
    "backend_registration_failed",
    "unknown",
  ],
  recoveryBehaviors: [
    "keep_authenticated_retry_profile_snapshot",
    "clear_user_state",
    "delete_navigation_session",
    "redirect_banned",
    "retry_navigation_session",
    "manual_support",
  ],
  debugLaneId: "auth_persistence",
} as const;

export function buildAuthPersistenceDebugLane(
  input: Partial<AuthPersistenceDebugLane> = {},
): AuthPersistenceDebugLane {
  const unexpectedDrops = input.unexpectedDrops ?? 0;
  const navigationSessionFailures = input.navigationSessionFailures ?? 0;
  const profileSnapshotReconnects = input.profileSnapshotReconnects ?? 0;
  const securityLogoutCount = input.securityLogoutCount ?? 0;
  const degraded = unexpectedDrops + navigationSessionFailures + profileSnapshotReconnects > 0;

  return {
    laneId: "auth_persistence",
    label: "Auth persistence",
    status: input.status ?? (degraded ? "degraded" : "live"),
    persistenceStatus: input.persistenceStatus ?? "browser_local_persistence_established",
    restoredSessions: input.restoredSessions ?? 0,
    unexpectedDrops,
    navigationSessionFailures,
    profileSnapshotReconnects,
    securityLogoutCount,
    telemetryStatus: input.telemetryStatus ?? "mapped",
    rawCredentialsExposed: false,
    rawDetailsCollapsedByDefault: true,
  };
}
