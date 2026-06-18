import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { buildAdminAnalyticsEventMixModel } from "@/lib/admin-analytics-event-mix";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

const OPERATIONS_TAB_SOURCE = readFileSync(
  join(process.cwd(), "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx"),
  "utf-8",
);

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
      catalogCategory: "Onboarding",
      catalogCategoryState: "inferred",
      actualSurface: null,
      actualSurfaceState: "missing",
      mappingSource: "component_context",
      shareFormula: "event count / total counted events in selected range",
    });
    expect(model.eventRows[1]).toMatchObject({
      catalogCategory: "Drops",
      mappedByFallbackCatalog: true,
      mappingState: "inferred_only",
    });
    expect(model.actualSurfaceContextState).toBe("unavailable");
    expect(model.catalogInferenceState).toBe("available");
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
    expect(model.visibleCopy).toContain("Categories are inferred from the event catalog");
    expect(model.missingSurfaceMappings).toEqual(["unknown_custom_event"]);
    expect(model.eventsNeedingCatalogMapping).toBe(1);
    expect(model.eventsMissingSurfaceContext).toBe(1);
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
    expect(model.badgeLabel).toBe("Collecting");
  });

  it("keeps refresh-due event mix snapshots as cached truth instead of live truth", () => {
    const model = buildAdminAnalyticsEventMixModel({
      selectedRange: "24h",
      response: {
        ...response(),
        cacheState: "refresh_due",
        staleButVerified: true,
        cacheRevalidating: true,
      },
      eventBreakdown: [
        { eventName: "drop_clicked", count: 20 },
        { eventName: "viewer_opened", count: 10 },
      ],
      componentContexts: [
        {
          key: "drops",
          label: "Drops",
          count: 30,
          uniqueUsers: 12,
          experienceCount: 2,
          lastSeenAt: 1,
          exampleEvent: "drop_clicked",
        },
      ],
      eventLabels: {},
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.staleSnapshotUsed).toBe(false);
    expect(model.truthState).toBe("cached");
    expect(model.badgeLabel).toBe("Refresh due");
    expect(model.eventRows[0]?.truthState).toBe("cached");
    expect(model.eventMixSourceMode).toBe("backend_snapshot");
  });

  it("keeps unavailable surface context explicit in the admin Event Mix UI", () => {
    expect(OPERATIONS_TAB_SOURCE).toContain("eventMixSurfaceContextLabel");
    expect(OPERATIONS_TAB_SOURCE).toContain("Surface context unavailable");
  });
});
