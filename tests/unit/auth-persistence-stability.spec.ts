import { describe, expect, it } from "vitest";

import {
  AUTH_PERSISTENCE_CONTRACT,
  buildAuthPersistenceDebugLane,
} from "@/lib/auth/auth-persistence-contract";
import {
  buildAuthPersistenceTelemetry,
  classifyAuthStateTransition,
  classifyLogoutReason,
  shouldClearUserState,
  shouldDeleteNavigationSession,
  shouldRetryProfileSnapshot,
} from "@/lib/auth/auth-session-stability";

describe("auth persistence stability", () => {
  it("models browser local persistence and explicit logout reasons", () => {
    expect(AUTH_PERSISTENCE_CONTRACT.persistenceStatus).toBe("browser_local_persistence_established");
    expect(AUTH_PERSISTENCE_CONTRACT.logoutReasons).toContain("explicit_user_logout");
    expect(AUTH_PERSISTENCE_CONTRACT.logoutReasons).toContain("security_banned");
    expect(AUTH_PERSISTENCE_CONTRACT.logoutReasons).toContain("security_suspended");
    expect(buildAuthPersistenceDebugLane().laneId).toBe("auth_persistence");
  });

  it("restores an initial browser session without deleting navigation session", () => {
    const transition = classifyAuthStateTransition({
      previousUserId: null,
      nextUserId: "user_1",
      initialAuthResolved: false,
    });

    expect(transition.sessionRestoreReason).toBe("initial_browser_local_restore");
    expect(transition.logoutReason).toBeNull();
    expect(transition.shouldDeleteNavigationSession).toBe(false);
    expect(transition.shouldClearUserState).toBe(false);
  });

  it("distinguishes explicit logout from unexpected token drops", () => {
    const explicit = classifyAuthStateTransition({
      previousUserId: "user_1",
      nextUserId: null,
      initialAuthResolved: true,
      explicitLogoutInFlight: true,
    });
    const unexpected = classifyAuthStateTransition({
      previousUserId: "user_1",
      nextUserId: null,
      initialAuthResolved: true,
    });

    expect(explicit.logoutReason).toBe("explicit_user_logout");
    expect(explicit.unexpectedDrop).toBe(false);
    expect(unexpected.logoutReason).toBe("token_invalid");
    expect(unexpected.unexpectedDrop).toBe(true);
    expect(shouldDeleteNavigationSession({ logoutReason: "explicit_user_logout", explicitLogoutAlreadyDeleted: true })).toBe(false);
    expect(shouldDeleteNavigationSession({ logoutReason: "token_invalid" })).toBe(true);
  });

  it("keeps profile snapshot reconnects from clearing authenticated state", () => {
    expect(shouldRetryProfileSnapshot({
      profileSnapshotStatus: "reconnecting",
      hasAuthUser: true,
    })).toBe(true);
    expect(shouldClearUserState({
      logoutReason: null,
      profileSnapshotStatus: "reconnecting",
    })).toBe(false);
  });

  it("keeps security logouts classified", () => {
    expect(classifyLogoutReason({ securityStatus: "banned" })).toBe("security_banned");
    expect(classifyLogoutReason({ securityStatus: "suspended" })).toBe("security_suspended");
  });

  it("builds redacted persistence telemetry", () => {
    const event = buildAuthPersistenceTelemetry({
      eventName: "auth_unexpected_session_drop",
      userId: "user_123",
      previousUserId: "user_123",
      nextUserId: null,
      logoutReason: "token_invalid",
      failureCode: "auth/token-invalid",
    });

    expect(event.eventName).toBe("auth_unexpected_session_drop");
    expect(event.params.userIdRedacted).toBe("present");
    expect(JSON.stringify(event.params)).not.toContain("user_123");
    expect(event.params.passwordIncluded).toBe(false);
  });
});
