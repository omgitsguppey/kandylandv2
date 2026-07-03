import { describe, expect, it } from "vitest";

import {
  PERSON_METRIC_DEFINITIONS,
  PERSON_METRIC_IDS,
  validatePersonMetricsContract,
} from "@/lib/analytics/person-metrics-contract";
import {
  buildPersonMetricCandidate,
  shouldCountPersonMetricEvent,
  stripPersonMetricForbiddenMetadata,
} from "@/lib/analytics/person-metrics-engine";

describe("person metrics contract", () => {
  it("defines every required metric with identity, consent, debug, materializer, and legacy policy", () => {
    const failures = validatePersonMetricsContract(PERSON_METRIC_DEFINITIONS);

    expect(failures).toEqual([]);
    expect(PERSON_METRIC_IDS).toEqual(expect.arrayContaining([
      "sessions",
      "visits",
      "active_days",
      "page_views",
      "creator_profile_views",
      "drop_opens",
      "unwraps",
      "wallet_opens",
      "wallet_closes",
      "package_selections",
      "checkout_starts",
      "payment_approvals",
      "payment_cancels",
      "payment_failures",
      "fan_pass_views",
      "fan_pass_purchases",
      "broadcasts_viewed",
      "broadcasts_clicked",
      "follows",
      "notification_interactions",
      "runtime_watch_sessions",
      "settings_actions",
      "support_account_actions",
    ]));

    for (const metric of PERSON_METRIC_DEFINITIONS) {
      expect(metric.aggregation.global.enabled).toBe(true);
      expect(metric.aggregation.guest.enabled).toEqual(expect.any(Boolean));
      expect(metric.aggregation.signedIn.enabled).toEqual(expect.any(Boolean));
      expect(metric.aggregation.linkedPerson.enabled).toEqual(expect.any(Boolean));
      expect(metric.consentEligibility.allowedModes.length).toBeGreaterThan(0);
      expect(metric.identityConfidence.minimum).toMatch(/exact|linked|inferred|weak|unknown/);
      expect(metric.materializer).toMatch(/^person_metrics\./);
      expect(metric.debugOwner).toBeTruthy();
      expect(metric.scoreEvidenceImpact).toBeTruthy();
      expect(metric.legacyRecoveryMapping.action).toMatch(/normalize_candidate|link_candidate|archive_only|needs_manual_review/);
    }
  });

  it("separates checkout starts from successful payment approvals and strips provider payloads", () => {
    const checkoutMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "checkout_starts");
    const approvalMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "payment_approvals");

    expect(checkoutMetric?.eventNames).toContain("begin_checkout");
    expect(approvalMetric?.eventNames).toContain("server_purchase_verified");
    expect(approvalMetric?.eventNames).not.toContain("begin_checkout");

    const checkoutCandidate = buildPersonMetricCandidate({
      metricId: "checkout_starts",
      eventName: "begin_checkout",
      eventId: "evt_checkout",
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      consentMode: "minimal_analytics",
      sessionId: "sess_1",
      userRef: { kind: "user", id: "user_1" },
      linkId: "link_1",
      metadata: { paypalOrderId: "order_raw", packageId: "starter" },
    });
    const approvalCandidate = buildPersonMetricCandidate({
      metricId: "payment_approvals",
      eventName: "server_purchase_verified",
      eventId: "evt_payment",
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "exact",
      consentMode: "minimal_analytics",
      sessionId: "sess_1",
      userRef: { kind: "user", id: "user_1" },
      linkId: "link_1",
      metadata: { providerPayload: "raw", paypalOrderId: "order_raw", transactionId: "tx_safe" },
    });

    expect(checkoutCandidate.metricId).toBe("checkout_starts");
    expect(approvalCandidate.metricId).toBe("payment_approvals");
    expect(checkoutCandidate.dedupeKey).not.toBe(approvalCandidate.dedupeKey);
    expect(approvalCandidate.metadata).toEqual({ transactionId: "tx_safe" });
    expect(stripPersonMetricForbiddenMetadata({ token: "secret", safe: "kept" })).toEqual({ safe: "kept" });
  });

  it("prevents double counting, blocks legacy exact promotion, and respects consent depth", () => {
    const linkedGuestCandidate = buildPersonMetricCandidate({
      metricId: "page_views",
      eventName: "semantic_page_viewed",
      eventId: "evt_linked",
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      consentMode: "minimal_analytics",
      sessionId: "sess_2",
      guestId: "guest_1",
      userRef: { kind: "user", id: "user_1" },
      linkId: "link_1",
    });
    const watchCandidate = buildPersonMetricCandidate({
      metricId: "runtime_watch_sessions",
      eventName: "watch_session_started",
      eventId: "evt_watch",
      actorKind: "guest",
      identityState: "guest_minimal_analytics",
      identityConfidence: "weak",
      consentMode: "minimal_analytics",
      sessionId: "sess_3",
      guestId: "guest_2",
    });
    const legacyCandidate = buildPersonMetricCandidate({
      metricId: "page_views",
      eventName: "legacy_page_view",
      eventId: "evt_legacy",
      actorKind: "legacy_unknown",
      identityState: "legacy_unknown",
      identityConfidence: "unknown",
      consentMode: "necessary_only",
      sessionId: "legacy_sess",
      legacyUnknown: true,
    });

    expect(shouldCountPersonMetricEvent(linkedGuestCandidate)).toMatchObject({
      countGlobally: true,
      countForGuest: false,
      countForSignedInUser: true,
      countForLinkedPerson: true,
      suppressedDuplicateKey: "guest:guest_1",
    });
    expect(shouldCountPersonMetricEvent(watchCandidate)).toMatchObject({
      countGlobally: true,
      countForGuest: false,
      countForSignedInUser: false,
      countForLinkedPerson: false,
      blockedReason: "consent_blocks_behavioral_metric",
    });
    expect(shouldCountPersonMetricEvent(legacyCandidate)).toMatchObject({
      countGlobally: true,
      countForGuest: false,
      countForSignedInUser: false,
      countForLinkedPerson: false,
      identityConfidence: "unknown",
      blockedReason: "legacy_unknown_not_exact_person",
    });
  });

  it("honors explicit user-behavior exclusion before global or person counting", () => {
    const diagnosticCandidate = buildPersonMetricCandidate({
      metricId: "wallet_opens",
      eventName: "wallet_opened",
      eventId: "evt_diagnostic_wallet",
      actorKind: "signed_in_user",
      identityState: "logged_in_unlinked",
      identityConfidence: "exact",
      consentMode: "minimal_analytics",
      sessionId: "sess_diagnostic",
      userRef: { kind: "user", id: "user_1" },
      includeInUserBehavior: false,
    });

    expect(shouldCountPersonMetricEvent(diagnosticCandidate)).toMatchObject({
      countGlobally: false,
      countForGuest: false,
      countForSignedInUser: false,
      countForLinkedPerson: false,
      blockedReason: "user_behavior_excluded",
    });
  });
});
