import { describe, expect, it } from "vitest";

import { buildHistoricalTrafficOverview } from "@/lib/server/admin-analytics-historical-traffic";
import type { AnalyticsReportRow } from "@/lib/server/admin-analytics-shared";

function doc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
  } as FirebaseFirestore.QueryDocumentSnapshot;
}

function row(date: string, values: number[]): AnalyticsReportRow {
  return {
    dimensionValues: [{ value: date }],
    metricValues: values.map((value) => ({ value: String(value) })),
  };
}

describe("buildHistoricalTrafficOverview", () => {
  it("uses first-party guest rollups and sessions before GA-minus-identified estimation", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [
        row("20260401", [3, 8, 4, 2, 0, 0]),
      ],
      eventRows: [],
      geoRows: [],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [
        doc("2026-04-01__home", {
          dayKey: "2026-04-01",
          pagePath: "/",
          pageViews: 5,
          clickCount: 1,
          dwellMsTotal: 1000,
          dwellSampleCount: 1,
          lastEventAt: Date.UTC(2026, 3, 1, 12, 0, 0),
        }),
      ],
      analyticsEventFacts: [
        doc("fact_1", {
          eventName: "home_page_viewed",
          timestamp: Date.UTC(2026, 3, 1, 12, 30, 0),
          pagePath: "/",
          dayKey: "2026-04-01",
          hourKey: "2026-04-01T12",
        }),
      ],
      guestBatchDocs: [],
      guestSessionDocs: [
        doc("anon_1_202604011200", {
          sessionKey: "anon_1",
          dayKey: "2026-04-01",
          hourKey: "2026-04-01T12",
          lastReceivedAtMs: Date.UTC(2026, 3, 1, 12, 1, 0),
        }),
      ],
      sessionFacts: [],
      startMs: Date.UTC(2026, 3, 1, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 1, 23, 59, 59),
      startDayKey: "2026-04-01",
      endDayKey: "2026-04-01",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.guestTraffic.truthLabel).toBe("exact");
    expect(overview.guestTraffic.sourceLabel).toBe("analytics_page_daily + analytics_sessions");
    expect(overview.guestTraffic.exactGuestViews).toBe(5);
    expect(overview.guestTraffic.exactGuestSessions).toBe(1);
    expect(overview.guestTraffic.qualityAvailable).toBe(true);
  });

  it("recovers legacy page rollup dates and view counts from document ids and old fields", () => {
    const overview = buildHistoricalTrafficOverview({
      responseRows: [],
      eventRows: [],
      geoRows: [],
      deviceRows: [],
      pageRows: [],
      dailyRollups: [],
      pageRollups: [
        doc("2026-04-01__home", {
          pagePath: "/",
          viewCount: 4,
        }),
        doc("2026-04-02__home", {
          pagePath: "/",
          views: 6,
        }),
      ],
      analyticsEventFacts: [],
      guestBatchDocs: [],
      guestSessionDocs: [],
      sessionFacts: [],
      startMs: Date.UTC(2026, 3, 1, 0, 0, 0),
      endMs: Date.UTC(2026, 3, 2, 23, 59, 59),
      startDayKey: "2026-04-01",
      endDayKey: "2026-04-02",
      timelineBucket: "day",
      authenticatedPageViewEventNames: new Set(["home_page_viewed"]),
    });

    expect(overview.chartData.map((point) => point.views)).toEqual([4, 6]);
    expect(overview.guestTraffic.exactGuestViews).toBe(10);
    expect(overview.guestTraffic.truthLabel).toBe("exact");
  });
});
