import { describe, expect, it } from "vitest";

import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  calculateCreatorRoleCountDecision,
  calculateGlobalCountDecision,
  calculateGuestCountDecision,
  calculateLinkedPersonCountDecision,
  calculateSignedInCountDecision,
  explainCountDecision,
  suppressDuplicateLinkedAction,
} from "@/lib/math/global-user-counting-math";

function envelope(input: Partial<CanonicalEventEnvelope> & Pick<CanonicalEventEnvelope, "eventName" | "eventId">): CanonicalEventEnvelope {
  return {
    eventId: input.eventId,
    eventName: input.eventName,
    eventVersion: 1,
    timestamp: input.timestamp ?? "2026-05-26T10:00:00.000Z",
    featureId: input.featureId ?? "test_feature",
    surface: input.surface ?? "test_surface",
    actorKind: input.actorKind ?? "signed_in_user",
    identityState: input.identityState ?? "logged_in_unlinked",
    identityConfidence: input.identityConfidence ?? "exact",
    consentMode: input.consentMode ?? "minimal_analytics",
    sessionId: input.sessionId ?? "session_1",
    guestId: input.guestId ?? null,
    userRef: input.userRef ?? { kind: "user", id: "user_1" },
    linkId: input.linkId ?? null,
    source: input.source ?? "client",
    materializerLane: input.materializerLane ?? "person_metrics",
    debugVisibility: input.debugVisibility ?? "admin_debug",
    scoreImpact: input.scoreImpact ?? "evidence_completeness",
    privacyClass: input.privacyClass ?? "minimal_product",
    metadata: input.metadata ?? {},
    pipelineStatus: input.pipelineStatus ?? "normal",
    quarantineReason: input.quarantineReason,
    unavailableGuestReason: input.unavailableGuestReason ?? null,
    includeInUserBehavior: input.includeInUserBehavior ?? true,
  };
}

describe("global user linked-person counting math", () => {
  it("dedupes linked guest and signed-in copies into one global and one linked-person count", () => {
    const guest = envelope({
      eventId: "guest_evt",
      eventName: "drop_preview_opened",
      actorKind: "guest",
      identityState: "guest_minimal_analytics",
      identityConfidence: "weak",
      guestId: "guest_1",
      userRef: null,
      linkId: "link_1",
      metadata: { dropId: "drop_1" },
      timestamp: "2026-05-26T10:00:00.000Z",
    });
    const signedIn = envelope({
      eventId: "signed_evt",
      eventName: "drop_preview_opened",
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      guestId: "guest_1",
      userRef: { kind: "user", id: "user_1" },
      linkId: "link_1",
      metadata: { dropId: "drop_1" },
      timestamp: "2026-05-26T10:00:03.000Z",
    });

    const report = hydratePersonMetrics({ envelopes: [guest, signedIn] });

    expect(report.scopes.global.metrics.drop_opens.count).toBe(1);
    expect(report.scopes.linkedPerson.metrics.drop_opens.count).toBe(1);
    expect(report.scopes.guest.metrics.drop_opens.count).toBe(0);
    expect(report.scopes.signedIn.metrics.drop_opens.count).toBe(0);
    expect(report.scopes.linkedPerson.metrics.drop_opens.suppressedDuplicateCount).toBeGreaterThanOrEqual(1);
    expect(report.validation.duplicateGuestUserCountsSuppressed).toBeGreaterThanOrEqual(1);
  });

  it("excludes admin projections and system events from user behavior", () => {
    const admin = calculateGlobalCountDecision({
      eventName: "admin_debug_viewed",
      eventId: "admin_evt",
      actorKind: "admin_projection",
      identityState: "admin_authenticated",
      identityConfidence: "exact",
      userId: "admin_1",
      timestamp: "2026-05-26T10:00:00.000Z",
    });
    const system = calculateSignedInCountDecision({
      eventName: "notification_delivered",
      eventId: "system_evt",
      actorKind: "system",
      identityState: "legacy_unknown",
      identityConfidence: "unknown",
      sessionId: "system_session",
      timestamp: "2026-05-26T10:00:00.000Z",
    });

    expect(admin.count).toBe(false);
    expect(admin.reason).toBe("admin_projection_excluded");
    expect(system.count).toBe(false);
    expect(system.reason).toBe("system_excluded");
  });

  it("counts a single linked signed-in action in signed-in and linked-person scopes without duplicate suppression", () => {
    const report = hydratePersonMetrics({
      envelopes: [
        envelope({
          eventId: "signed_linked_evt",
          eventName: "drop_preview_opened",
          actorKind: "signed_in_user",
          identityState: "logged_in_linked_guest",
          identityConfidence: "linked",
          guestId: "guest_1",
          userRef: { kind: "user", id: "user_1" },
          linkId: "link_1",
          metadata: { dropId: "drop_1" },
          timestamp: "2026-05-26T10:00:03.000Z",
        }),
      ],
    });

    expect(report.scopes.global.metrics.drop_opens.count).toBe(1);
    expect(report.scopes.signedIn.metrics.drop_opens.count).toBe(1);
    expect(report.scopes.linkedPerson.metrics.drop_opens.count).toBe(1);
    expect(report.validation.duplicateGuestUserCountsSuppressed).toBe(0);
  });

  it("keeps creator-role metrics as signed-in user metrics without creating another person", () => {
    const input = {
      eventName: "creator_profile_opened",
      eventId: "creator_evt",
      actorKind: "creator_user" as const,
      identityState: "creator_logged_in" as const,
      identityConfidence: "exact" as const,
      userId: "creator_user_1",
      roles: ["creator"],
      timestamp: "2026-05-26T10:00:00.000Z",
    };

    expect(calculateSignedInCountDecision(input)).toMatchObject({ count: true });
    expect(calculateCreatorRoleCountDecision(input)).toMatchObject({
      count: true,
      createsSeparatePerson: false,
      reason: "creator_role_signed_in_scope",
    });
  });

  it("requires provider/order fingerprints for payment approvals and reset windows for task rewards", () => {
    const payment = calculateGlobalCountDecision({
      eventName: "gumdrops_purchased",
      actorKind: "signed_in_user",
      identityState: "logged_in_unlinked",
      identityConfidence: "exact",
      userId: "user_1",
      timestamp: "2026-05-26T10:00:00.000Z",
    });
    const reward = calculateGlobalCountDecision({
      eventName: "task_reward_granted",
      eventId: "reward_evt",
      actorKind: "signed_in_user",
      identityState: "logged_in_unlinked",
      identityConfidence: "exact",
      userId: "user_1",
      taskId: "daily_checkin",
      timestamp: "2026-05-26T10:00:00.000Z",
    });

    expect(payment.count).toBe(false);
    expect(payment.reason).toBe("payment_provider_fingerprint_required");
    expect(reward.count).toBe(false);
    expect(reward.reason).toBe("task_reset_window_required");
  });

  it("explains duplicate suppression and linked-person decisions", () => {
    const decision = suppressDuplicateLinkedAction({
      eventName: "drop_preview_opened",
      eventId: "evt_1",
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      userId: "user_1",
      guestId: "guest_1",
      linkId: "link_1",
      objectId: "drop_1",
      timestamp: "2026-05-26T10:00:00.000Z",
    });
    const linked = calculateLinkedPersonCountDecision(decision.input);

    expect(decision.suppressed).toBe(true);
    expect(linked.count).toBe(true);
    expect(explainCountDecision(decision.input)).toContain("linked person");
    expect(calculateGuestCountDecision(decision.input).count).toBe(false);
  });
});
