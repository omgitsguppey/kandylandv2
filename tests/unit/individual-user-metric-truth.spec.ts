import { describe, expect, it } from "vitest";

import { buildEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  buildIndividualUserMetricTruthReport,
  INDIVIDUAL_USER_METRIC_TRUTH,
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
});
