import { describe, expect, it } from "vitest";

import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
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
        {
          eventName: "semantic_page_viewed",
          eventId: "evt_global_only",
          eventVersion: 1,
          timestamp: "2026-05-27T00:00:00.000Z",
          featureId: "test_feature",
          surface: "test_surface",
          sessionId: "sess_only",
          actorKind: "legacy_unknown",
          identityState: "legacy_unknown",
          identityConfidence: "unknown",
          consentMode: "necessary_only",
          source: "legacy",
          guestId: null,
          userRef: null,
          linkId: null,
          materializerLane: "person_metrics",
          debugVisibility: "admin_debug",
          scoreImpact: "evidence_completeness",
          privacyClass: "minimal_product",
          metadata: {},
          pipelineStatus: "normal",
          unavailableGuestReason: null,
          includeInUserBehavior: true,
        } satisfies CanonicalEventEnvelope,
      ],
      generatedAtUtc: "2026-05-27T00:00:00.000Z",
    });
    const report = buildIndividualUserMetricTruthReport(globalOnly);

    expect(globalOnly.metricStatus.page_views.state).toBe("hydrated");
    expect(report.metricStatus.page_views.userHydrationStatus).toBe("bridge_missing");
    expect(report.globalVsUserMismatchCount).toBeGreaterThan(0);
    expect(report.activeGlobalVsUserMismatchCount).toBe(0);
    expect(report.missingIdentityLinkCount).toBe(0);
    expect(report.status).toBe("classified");
    expect(report.metricStatus.page_views.displayRule).toContain("not zero");
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
