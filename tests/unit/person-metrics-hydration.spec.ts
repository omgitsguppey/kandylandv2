import { describe, expect, it } from "vitest";

import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import {
  explainMissingMetricHydration,
  hydrateConfidenceByMetric,
  hydrateGlobalMetrics,
  hydrateGuestMetrics,
  hydrateLinkedUserMetrics,
  hydratePersonMetrics,
} from "@/lib/analytics/person-metrics-hydration";
import { buildLegacyEventRecoveryCandidate } from "@/lib/legacy/march-first-event-recovery";

function envelope(input: Partial<CanonicalEventEnvelope> & Pick<CanonicalEventEnvelope, "eventName">): CanonicalEventEnvelope {
  return {
    eventId: input.eventId ?? `evt_${input.eventName}`,
    eventName: input.eventName,
    eventVersion: 1,
    timestamp: input.timestamp ?? "2026-05-23T05:00:00.000Z",
    featureId: input.featureId ?? "test_feature",
    surface: input.surface ?? "test_surface",
    actorKind: input.actorKind ?? "signed_in_user",
    identityState: input.identityState ?? "logged_in_unlinked",
    identityConfidence: input.identityConfidence ?? "exact",
    consentMode: input.consentMode ?? "minimal_analytics",
    sessionId: input.sessionId ?? "sess_1",
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

describe("person metrics hydration", () => {
  it("hydrates exact signed-in events into global and user metrics", () => {
    const report = hydratePersonMetrics({
      envelopes: [
        envelope({ eventName: "wallet_opened", eventId: "wallet_1" }),
        envelope({ eventName: "semantic_page_viewed", eventId: "page_1" }),
      ],
    });

    expect(report.metricStatus.wallet_opens).toMatchObject({
      state: "hydrated",
      count: 1,
      confidence: "exact",
      provenZero: false,
    });
    expect(report.scopes.global.metrics.wallet_opens.count).toBe(1);
    expect(report.scopes.signedIn.metrics.wallet_opens.count).toBe(1);
    expect(report.scopes.guest.metrics.wallet_opens.count).toBe(0);
    expect(report.lowConfidenceMetrics.find((metric) => metric.metricId === "wallet_opens")).toBeUndefined();
  });

  it("attributes linked guest activity to the user once without double-counting guest metrics", () => {
    const linkedEnvelope = envelope({
      eventName: "drop_preview_opened",
      eventId: "drop_1",
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      guestId: "guest_1",
      userRef: { kind: "user", id: "user_1" },
      linkId: "link_1",
    });

    const report = hydratePersonMetrics({ envelopes: [linkedEnvelope] });
    const linked = hydrateLinkedUserMetrics({ envelopes: [linkedEnvelope] });

    expect(report.metricStatus.drop_opens).toMatchObject({
      state: "hydrated",
      count: 1,
      confidence: "linked",
    });
    expect(linked.metrics.drop_opens).toMatchObject({
      count: 1,
      confidence: "linked",
      suppressedDuplicateCount: 0,
    });
    expect(hydrateGuestMetrics({ envelopes: [linkedEnvelope] }).metrics.drop_opens.count).toBe(0);
  });

  it("keeps legacy unknown candidates out of exact person truth and explains missing hydration", () => {
    const legacy = buildLegacyEventRecoveryCandidate({
      legacyEventId: "legacy_unknown_1",
      rawEventName: "unknown_legacy",
      occurredAt: "2026-04-02T00:00:00.000Z",
      source: "legacy_dump",
      sessionId: "legacy_sess",
    });
    const report = hydratePersonMetrics({ envelopes: [], legacyCandidates: [legacy] });

    expect(report.legacySummary.exactPromotionsBlocked).toBeGreaterThan(0);
    expect(report.metricStatus.page_views.confidence).not.toBe("exact");
    expect(report.metricStatus.page_views.provenZero).toBe(false);
    expect(report.metricStatus.page_views.missingSourceExplanation).toContain("producer");
    expect(explainMissingMetricHydration({
      metricId: "page_views",
      envelopes: [],
      legacyCandidates: [legacy],
    }).confidence).toBe("unknown");
  });

  it("does not count checkout starts as payment approvals", () => {
    const report = hydratePersonMetrics({
      envelopes: [envelope({ eventName: "begin_checkout", eventId: "checkout_1" })],
    });

    expect(report.metricStatus.checkout_starts).toMatchObject({
      state: "hydrated",
      count: 1,
    });
    expect(report.metricStatus.payment_approvals.count).toBe(0);
    expect(report.metricStatus.payment_approvals.provenZero).toBe(false);
    expect(report.validation.checkoutStartCountsAsPaymentSuccess).toBe(false);
  });

  it("hydrates watch sessions only from runtime watch events, not page time", () => {
    const pageTimeEnvelope = envelope({
      eventName: "semantic_page_viewed",
      eventId: "page_time_1",
      metadata: { pageDurationMs: 45000 },
    });
    const watchEnvelope = envelope({
      eventName: "watch_session_started",
      eventId: "watch_1",
      consentMode: "full_behavioral",
      privacyClass: "behavioral",
      scoreImpact: "runtime_health",
    });

    const pageOnly = hydratePersonMetrics({ envelopes: [pageTimeEnvelope] });
    const watchOnly = hydratePersonMetrics({ envelopes: [watchEnvelope] });

    expect(pageOnly.metricStatus.runtime_watch_sessions.count).toBe(0);
    expect(pageOnly.metricStatus.runtime_watch_sessions.provenZero).toBe(false);
    expect(pageOnly.validation.pageTimeCountsAsWatchTime).toBe(false);
    expect(watchOnly.metricStatus.runtime_watch_sessions).toMatchObject({
      state: "hydrated",
      count: 1,
      confidence: "exact",
    });
  });

  it("reports confidence and missing sources per metric without fake zeroes", () => {
    const global = hydrateGlobalMetrics({ envelopes: [envelope({ eventName: "notification_opened", eventId: "note_1" })] });
    const confidence = hydrateConfidenceByMetric({ envelopes: [] });

    expect(global.metrics.notification_interactions.count).toBe(1);
    expect(confidence.wallet_opens).toMatchObject({
      confidence: "unknown",
      provenZero: false,
    });
    expect(confidence.wallet_opens.missingSourceExplanation).toContain("wallet_opened");
  });
});
