import { describe, expect, it } from "vitest";

import {
  buildEventLivenessSummary,
  classifyEventLiveness,
  detectSuspiciousIdleEvent,
  explainQuietEvent,
} from "@/lib/analytics/event-liveness-engine";

describe("event liveness audit", () => {
  it("does not allow high daily visible events to hide as future-only quiet", () => {
    const result = classifyEventLiveness({
      eventName: "dashboard_viewed",
      featureId: "user_dashboard",
      surface: "user dashboard",
      visibilityStatus: "logged_in_visible",
      expectedDailyVisitorsBaseline: 100,
      translationMapped: true,
      materializerMapped: true,
      hydrationMapped: true,
    });

    expect(result.expectedTrafficClass).toBe("high_daily");
    expect(result.livenessStatus).toBe("not_observed_but_expected");
    expect(result.livenessStatus).not.toBe("future_only_quiet");
    expect(result.sourceReadiness?.source).toBe("event_translation_bridge");
    expect(result.scoreImpact.runtimeHealth).toBeGreaterThan(0);
    expect(result.debugVisibility.defaultVisible).toBe(true);
    expect(result.nextAction).toContain("bounded recent summaries");
  });

  it("keeps source-ready occasional events out of source-missing without creating runtime proof", () => {
    const result = classifyEventLiveness({
      eventName: "purchase_package_selected",
      featureId: "wallet",
      surface: "wallet package selector",
      visibilityStatus: "logged_in_visible",
      expectedTrafficClass: "occasional",
      expectedDailyVisitorsBaseline: 100,
      translationMapped: true,
      materializerMapped: true,
      hydrationMapped: true,
    });

    expect(result.livenessStatus).toBe("source_ready_waiting_for_activity");
    expect(result.sourceReadiness).toMatchObject({
      source: "event_translation_bridge",
      clearsRuntimeProof: false,
      clearsProviderProof: false,
      clearsAdminTruthProof: false,
    });
    expect(result.scoreImpact.runtimeHealth).toBe(0);
    expect(result.debugVisibility.defaultVisible).toBe(false);
  });

  it("classifies provider-backed purchase verification as protected payment proof, not source-ready", () => {
    const result = classifyEventLiveness({
      eventName: "server_purchase_verified",
      featureId: "wallet",
      surface: "server purchase verification",
      visibilityStatus: "logged_in_visible",
      expectedTrafficClass: "occasional",
      formalProviderGated: true,
      operatorConfirmedRevenueSignal: true,
      expectedDailyVisitorsBaseline: 100,
      translationMapped: true,
      materializerMapped: true,
      hydrationMapped: true,
    });

    expect(result.livenessStatus).toBe("protected_payment_required");
    expect(result.sourceReadiness).toBeNull();
    expect(result.nextAction).toContain("provider");
    expect(result.debugVisibility.defaultVisible).toBe(true);
  });

  it("uses the canonical notification prompt event instead of the legacy banner alias", () => {
    const summary = buildEventLivenessSummary({
      rawQuietFutureCount: 416,
      expectedDailyVisitorsBaseline: 100,
    });
    const eventNames = summary.classifications.map((event) => event.eventName);
    const prompt = summary.classifications.find((event) => event.eventName === "notification_prompt_viewed");

    expect(eventNames).toContain("notification_prompt_viewed");
    expect(eventNames).not.toContain("notification_prompt_banner_viewed");
    expect(prompt?.livenessStatus).toBe("not_observed_but_expected");
    expect(prompt?.sourceReadiness?.source).toBe("event_translation_bridge");
  });

  it("keeps rare or future-only events quiet without score drag", () => {
    const result = classifyEventLiveness({
      eventName: "account_delete_confirmed",
      featureId: "auth_identity",
      surface: "account delete flow",
      visibilityStatus: "logged_in_visible",
      expectedTrafficClass: "rare",
      expectedDailyVisitorsBaseline: 100,
      translationMapped: true,
      materializerMapped: true,
      hydrationMapped: true,
    });

    expect(result.livenessStatus).toBe("not_observed_and_not_expected");
    expect(result.scoreImpact.runtimeHealth).toBe(0);
    expect(result.debugVisibility.defaultVisible).toBe(false);
    expect(explainQuietEvent(result)).toContain("rare");
  });

  it("summarizes quiet catalog separately from suspicious and source-missing signals", () => {
    const stale = classifyEventLiveness({
      eventName: "drop_preview_opened",
      featureId: "drops",
      surface: "drop card",
      visibilityStatus: "public_visible",
      expectedTrafficClass: "high_daily",
      expectedDailyVisitorsBaseline: 100,
      lastSeenAtUtc: "2026-05-20T00:00:00.000Z",
      nowUtc: "2026-05-24T00:00:00.000Z",
      translationMapped: true,
      materializerMapped: true,
      hydrationMapped: true,
    });

    expect(detectSuspiciousIdleEvent(stale)).toBe(true);

    const summary = buildEventLivenessSummary({
      rawQuietFutureCount: 416,
      expectedDailyVisitorsBaseline: 100,
      events: [
        stale,
        {
          eventName: "dashboard_viewed",
          featureId: "user_dashboard",
          surface: "dashboard",
          visibilityStatus: "logged_in_visible",
          translationMapped: true,
          materializerMapped: true,
          hydrationMapped: true,
        },
        {
          eventName: "creator_broadcast_created",
          featureId: "broadcasts",
          surface: "creator broadcasts",
          visibilityStatus: "creator_visible",
          expectedTrafficClass: "rare",
          translationMapped: true,
          materializerMapped: true,
          hydrationMapped: true,
        },
      ],
    });

    expect(summary.rawQuietFutureCount).toBe(416);
    expect(summary.suspiciousIdleCount).toBe(2);
    expect(summary.sourceReadyWaitingForActivityCount).toBe(0);
    expect(summary.sourceMissingCount).toBe(0);
    expect(summary.trueFutureOnlyQuietCount).toBe(414);
    expect(summary.debugLane.label).toBe("Event liveness");
    expect(summary.debugLane.quietFutureCatalogDefaultOpen).toBe(false);
    expect(summary.debugLane.suspiciousIdleEvents).toBe(2);
    expect(summary.scoreImpactByDimension.runtimeHealth.after).toBeLessThan(summary.scoreImpactByDimension.runtimeHealth.before);
  });
});
