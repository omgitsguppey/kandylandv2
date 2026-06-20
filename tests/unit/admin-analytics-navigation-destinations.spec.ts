import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsNavigationDestinationsModel } from "@/lib/admin-analytics-navigation-destinations";

describe("buildAdminAnalyticsNavigationDestinationsModel", () => {
  it("hydrates fallback destination visits when explicit taps are missing", () => {
    const model = buildAdminAnalyticsNavigationDestinationsModel({
      selectedRange: "7d",
      loading: false,
      response: {
        navigationDestinationsState: {
          generatedAtUtc: "2026-05-06T12:00:00.000Z",
          range: "7d",
          sourceMode: "destination_views_only",
          totalNavigationEvents: 4,
          explicitTapCount: 0,
          fallbackViewCount: 4,
          destinations: [
            {
              destinationPath: "/dashboard",
              destinationLabel: "Dashboard",
              count: 4,
              uniqueActors: 2,
              navigationSourceTruth: "page_view_fallback",
              sourceTruth: "first_party_event_fact",
              lastSeenAtUtc: "2026-05-06T11:55:00.000Z",
              freshnessState: "source_current",
              confidenceScore: 95,
              confidenceBand: "verified",
              evidenceKind: "observed",
              dedupeKey: "launch_recovery|page_view|route:/dashboard",
              dedupeDimensions: ["route"],
              lateArrivalWindowDays: 12,
              productTruthEligible: true,
              missingVsZeroState: "source_present",
              mathReason: "Navigation fallback uses bounded first-party page-view evidence.",
              topSourceEvents: ["dashboard_viewed"],
              explanation: "fallback",
            },
          ],
          warnings: ["No explicit nav taps found. Showing destination visits from page-view fallback."],
        },
      },
    });

    expect(model.sourceMode).toBe("destination_views_only");
    expect(model.truthState).toBe("degraded");
    expect(model.destinations[0]?.navigationSourceTruth).toBe("page_view_fallback");
    expect(model.destinations[0]?.sourceTruth).toBe("first_party_event_fact");
    expect(model.visibleCopy).toContain(
      "No explicit navigation tap events found. Showing destination visits from page-view fallback.",
    );
  });

  it("prevents a verified zero when navigation source truth is unavailable", () => {
    const model = buildAdminAnalyticsNavigationDestinationsModel({
      selectedRange: "30d",
      loading: false,
      response: {
        generatedAtMs: Date.parse("2026-05-06T12:00:00.000Z"),
      },
    });

    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.sourceMode).toBe("unavailable");
    expect(model.totalNavigationEvents).toBe(0);
    expect(model.visibleCopy[0]).toContain("Navigation tap tracking is not instrumented");
  });
});
