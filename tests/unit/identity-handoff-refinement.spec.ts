import { describe, expect, it } from "vitest";

import {
  buildIdentityHandoffEventContext,
  resolveIdentityHandoffState,
  transitionIdentityHandoffState,
} from "@/lib/analytics/identity-state-machine";
import {
  buildIdentityLinkPayload,
  buildIdentityTransferCountingKeys,
} from "@/lib/analytics/identity-transfer";
import { buildBehaviorMathReport } from "@/lib/behavioral/behavior-math-engine";

describe("identity handoff refinement", () => {
  it("models guest consent, signup, login, creator, admin, and legacy identity states", () => {
    expect(resolveIdentityHandoffState({ consentMode: "unknown" })).toBe("guest_unknown_consent");
    expect(resolveIdentityHandoffState({ consentMode: "necessary_only" })).toBe("guest_necessary_only");
    expect(resolveIdentityHandoffState({ consentMode: "minimal_analytics" })).toBe("guest_minimal");
    expect(resolveIdentityHandoffState({ consentMode: "full_behavioral" })).toBe("guest_behavioral");
    expect(resolveIdentityHandoffState({ transition: "signup_start", consentMode: "full_behavioral" })).toBe("signup_pending");
    expect(resolveIdentityHandoffState({ userId: "user_1", consentMode: "full_behavioral" })).toBe("user_logged_in");
    expect(resolveIdentityHandoffState({ userId: "user_1", identityLinkId: "identity_link_1", consentMode: "full_behavioral" })).toBe("user_logged_in_linked_guest");
    expect(resolveIdentityHandoffState({ userId: "creator_1", actorType: "creator", consentMode: "full_behavioral" })).toBe("creator_user");
    expect(resolveIdentityHandoffState({ actorType: "admin", projectionMode: "admin_view_as_creator", consentMode: "full_behavioral" })).toBe("admin_projection");
    expect(resolveIdentityHandoffState({ legacyUnknown: true })).toBe("legacy_unknown");
  });

  it("transitions signup and login without losing the active session", () => {
    const pending = transitionIdentityHandoffState("guest_behavioral", "signup_start", {
      guestId: "guest_1",
      sessionId: "session_1",
      consentMode: "full_behavioral",
    });

    expect(pending.state).toBe("signup_pending");
    expect(pending.sessionId).toBe("session_1");

    const linked = transitionIdentityHandoffState(pending.state, "signup_success", {
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      identityLinkId: "identity_link_1",
      consentMode: "full_behavioral",
    });

    expect(linked.state).toBe("user_logged_in_linked_guest");
    expect(linked.sessionId).toBe("session_1");
    expect(linked.identityLinkId).toBe("identity_link_1");
  });

  it("builds deterministic consent-aware identity links and blocks person linkage under minimal consent", () => {
    const full = buildIdentityLinkPayload({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      linkedAt: "2026-05-21T15:00:00.000Z",
      reason: "signup",
      consentMode: "full_behavioral",
    });
    const repeat = buildIdentityLinkPayload({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      linkedAt: "2026-05-21T15:01:00.000Z",
      reason: "signup",
      consentMode: "full_behavioral",
    });
    const minimal = buildIdentityLinkPayload({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      reason: "login",
      consentMode: "minimal_analytics",
    });

    expect(full.identityLinkId).toBe(repeat.identityLinkId);
    expect(full.mergeAllowed).toBe(true);
    expect(full.personLevelBehaviorAllowed).toBe(true);
    expect(full.linkageConfidence).toBeGreaterThan(0.9);
    expect(minimal.mergeAllowed).toBe(false);
    expect(minimal.personLevelBehaviorAllowed).toBe(false);
    expect(minimal.consentState).toBe("denied");
    expect(minimal.linkageConfidenceSource).toBe("blocked_by_consent_mode");
  });

  it("keeps linked guest lineage from double-counting a known user", () => {
    const counting = buildIdentityTransferCountingKeys({
      userId: "user_1",
      anonymousVisitorId: "guest_1",
      sessionId: "session_1",
      identityLinkId: "identity_link_1",
    });

    expect(counting.countAsKnownUser).toBe(true);
    expect(counting.countAsAdditionalKnownUser).toBe(false);
    expect(counting.linkedGuestCountKey).toBe("guest_1");
  });

  it("does not personalize behavior math under minimal consent or promote legacy unknown users", () => {
    const report = buildBehaviorMathReport({
      events: [
        {
          eventId: "minimal-click",
          eventName: "semantic_target_clicked",
          eventType: "click",
          timestampMs: Date.parse("2026-05-21T15:00:00.000Z"),
          sessionId: "session_minimal",
          userId: "user_1",
          identityState: "user_only",
          trackingState: "enabled",
          consentMode: "minimal_analytics",
        },
        {
          eventId: "linked-click",
          eventName: "semantic_target_clicked",
          eventType: "click",
          timestampMs: Date.parse("2026-05-21T15:01:00.000Z"),
          sessionId: "session_full",
          anonymousVisitorId: "guest_1",
          userId: "user_1",
          identityState: "guest_linked_to_user",
          trackingState: "enabled",
          consentMode: "full_behavioral",
        },
        {
          eventId: "legacy-promote",
          eventName: "creator_profile_viewed",
          eventType: "profile_view",
          timestampMs: Date.parse("2026-03-10T15:00:00.000Z"),
          userId: "legacy_user",
          identityState: "unknown_legacy",
          trackingState: "unknown",
          consentMode: "unknown",
        },
      ],
    });

    expect(report.summary.consentBlockedBehaviorEvents).toBe(1);
    expect(report.summary.legacyUnknownExcluded).toBe(1);
    expect(report.perUser.user_1?.metrics.clicks.value).toBe(1);
    expect(report.perUser.legacy_user).toBeUndefined();
  });

  it("builds tracker context with consent mode, identity state, session, and link id", () => {
    expect(buildIdentityHandoffEventContext({
      guestId: "guest_1",
      sessionId: "session_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      guestId: "guest_1",
      sessionId: "session_1",
      consentMode: "full_behavioral",
      identityState: "guest_behavioral",
      personLevelBehaviorAllowed: false,
    });

    expect(buildIdentityHandoffEventContext({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      identityLinkId: "identity_link_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "session_1",
      identityLinkId: "identity_link_1",
      consentMode: "full_behavioral",
      identityState: "user_logged_in_linked_guest",
      personLevelBehaviorAllowed: true,
    });
  });
});
