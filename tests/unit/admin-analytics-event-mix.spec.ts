import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsEventMixModel } from "@/lib/admin-analytics-event-mix";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

function response(): HistoricalAnalyticsResponse {
  return {
    success: true,
    cacheState: "fresh",
  } as HistoricalAnalyticsResponse;
}

describe("buildAdminAnalyticsEventMixModel", () => {
  it("builds ranked event activity rows with share and readable labels", () => {
    const model = buildAdminAnalyticsEventMixModel({
      selectedRange: "30d",
      response: response(),
      eventBreakdown: [
        { eventName: "guided_onboarding_step_started", count: 2780 },
        { eventName: "drop_clicked", count: 220 },
      ],
      componentContexts: [
        {
          key: "onboarding",
          label: "Guided onboarding",
          count: 2780,
          uniqueUsers: 481,
          experienceCount: 1,
          lastSeenAt: 1,
          exampleEvent: "guided_onboarding_step_started",
        },
      ],
      eventLabels: {
        guided_onboarding_step_started: "Guided onboarding step started",
      },
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.totalEventsInRange).toBe(3000);
    expect(model.denominatorAvailable).toBe(true);
    expect(model.topEvent?.displayLabel).toBe("Guided onboarding step started");
    expect(model.topEventShare).toBeCloseTo(2780 / 3000);
    expect(model.eventRows[0]).toMatchObject({
      rank: 1,
      rawCount: 2780,
      mappedSurface: "Guided onboarding",
      mappingSource: "component_context",
      shareFormula: "event count / total counted events in selected range",
    });
    expect(model.eventRows[1]).toMatchObject({
      mappedSurface: "Drops",
      mappedByFallbackCatalog: true,
    });
  });

  it("does not report zero surfaces when context is unavailable", () => {
    const model = buildAdminAnalyticsEventMixModel({
      selectedRange: "7d",
      response: response(),
      eventBreakdown: [
        { eventName: "unknown_custom_event", count: 10 },
      ],
      componentContexts: [],
      eventLabels: {},
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.componentContextStatus).toBe("unavailable");
    expect(model.mappedSurfaceCount).toBeNull();
    expect(model.visibleCopy).toContain("Surface context is unavailable");
    expect(model.missingSurfaceMappings).toEqual(["unknown_custom_event"]);
  });

  it("prevents fake zeros while event data is waiting", () => {
    const model = buildAdminAnalyticsEventMixModel({
      selectedRange: "24h",
      eventBreakdown: [],
      componentContexts: [],
      eventLabels: {},
      loading: true,
    });

    expect(model.totalEventsInRange).toBeNull();
    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.badgeLabel).toBe("WAIT");
  });
});
