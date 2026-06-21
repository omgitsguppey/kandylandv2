import { describe, expect, it } from "vitest";

import { buildEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  buildIndividualUserMetricTruthReport,
  INDIVIDUAL_USER_METRIC_TRUTH,
  resolveIndividualUserMetricHydrationStatus,
} from "@/lib/identity-truth/individual-user-metric-truth";

describe("individual user metric truth", () => {
  it("does not treat global-only hydration as user-level proof", () => {
    const globalOnly = hydratePersonMetrics({
      envelopes: [
        buildEventEnvelope({
          eventName: "semantic_page_viewed",
          eventId: "evt_global_only",
          sessionId: "sess_only",
          actorKind: "guest",
          identityState: "guest_unknown_consent",
          identityConfidence: "weak",
          consentMode: "minimal_analytics",
          source: "client",
        }),
      ],
      generatedAtUtc: "2026-05-27T00:00:00.000Z",
    });
    const report = buildIndividualUserMetricTruthReport(globalOnly);

    expect(globalOnly.metricStatus.visits.state).toBe("hydrated");
    expect(report.metricStatus.visits.userHydrationStatus).toBe("bridge_missing");
    expect(report.globalVsUserMismatchCount).toBeGreaterThan(0);
    expect(report.metricStatus.visits.displayRule).toContain("not zero");
    expect(INDIVIDUAL_USER_METRIC_TRUTH.find((metric) => metric.metricId === "payment_approvals")?.sourceEvents)
      .toContain("server_purchase_verified");
  });

  it("inherits explicit materializer and permission blocked states from person metric hydration", () => {
    const hydration = hydratePersonMetrics({
      materializerMissingMetricIds: ["runtime_watch_sessions"],
      permissionBlockedMetricIds: ["notification_interactions"],
    });
    const report = buildIndividualUserMetricTruthReport(hydration);

    expect(report.metricStatus.runtime_watch_sessions.userHydrationStatus).toBe("materializer_missing");
    expect(report.metricStatus.notification_interactions.userHydrationStatus).toBe("permission_blocked");
    expect(report.metricStatus.runtime_watch_sessions.displayRule).toContain("not zero");
    expect(report.metricStatus.notification_interactions.displayRule).toContain("not zero");
  });

  it("publishes the canonical user metric hydration state chain", () => {
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 1,
      userCount: 0,
      provenZero: false,
      missingProducer: null,
      missingBridge: null,
    })).toBe("bridge_missing");
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 0,
      userCount: 0,
      provenZero: false,
      missingProducer: "wallet_opened",
      missingBridge: "person_metrics.wallet_opens",
    })).toBe("materializer_missing");
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 0,
      userCount: 0,
      provenZero: false,
      missingProducer: "wallet_opened",
      missingBridge: null,
    })).toBe("source_missing");
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 1,
      userCount: 1,
      provenZero: false,
      missingProducer: null,
      missingBridge: null,
      explicitState: "permission_blocked",
    })).toBe("permission_blocked");
  });
});
