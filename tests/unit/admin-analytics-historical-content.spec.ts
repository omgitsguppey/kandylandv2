import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildHistoricalContentAnalytics } from "@/lib/server/admin-analytics-historical-content";
import type { TelemetryLogRecord, ViewerOverview } from "@/lib/server/admin-analytics-shared";

function doc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => ({ id, ...data }),
  } as unknown as FirebaseFirestore.QueryDocumentSnapshot;
}

function telemetryEvent(eventName: string, params: Record<string, unknown> = {}): TelemetryLogRecord {
  return {
    eventName,
    userId: "user_1",
    username: "tester",
    timestamp: 1_771_000_000_000,
    params: {
      event_id: `${eventName}_1`,
      drop_id: "drop_1",
      drop_category: "Chocolate",
      drop_tags: "sweet|launch",
      ...params,
    },
  };
}

const viewerOverview: ViewerOverview = {
  viewCount: 0,
  sessionCount: 0,
  uniqueViewerCount: 0,
  repeatSessionCount: 0,
  returnSessionCount: 0,
  totalWatchSeconds: 0,
  avgSessionSeconds: 0,
  avgWatchSeconds: 0,
  avgLoadMs: 0,
  assetCompletionRate: 0,
  meaningfulSessionCount: 0,
  openedWithoutDepthCount: 0,
  bounceSessionCount: 0,
  abandonedSessionCount: 0,
  stalledSessionCount: 0,
  convertedSessionCount: 0,
  completedSessionCount: 0,
  assetSwitches: 0,
  downloads: 0,
  relatedClicks: 0,
};

describe("buildHistoricalContentAnalytics", () => {
  it("uses canonical preview and unlock aliases for recovered content mix", () => {
    const analytics = buildHistoricalContentAnalytics({
      telemetryLogsByEvent: {
        drop_preview: [telemetryEvent("drop_preview")],
        unlock_drop_success: [
          telemetryEvent("unlock_drop_success", { event_id: "unlock_1" }),
          telemetryEvent("unlock_drop_success", { event_id: "unlock_1" }),
        ],
      },
      eventsData: {},
      watchAssetDocs: [],
      dropDocs: [
        doc("drop_1", {
          title: "Launch Drop",
          creatorId: "creator_1",
          validFrom: 1_700_000_000_000,
          unlockCost: 100,
          mediaCounts: { images: 1, videos: 0 },
          tags: ["sweet"],
        }),
      ],
      dropDailyDocs: [
        doc("drop_1", {
          dropId: "drop_1",
          unlockCount: 1,
          gumdropsSpent: 100,
        }),
      ],
      viewerDropInsights: [],
      viewerOverview,
      normalizedTransactionsInRange: [],
      packageConfigs: [],
      rangeLabel: "all",
      generatedAtUtc: "2026-06-20T00:00:00.000Z",
      freshnessState: "live",
      funnel: {
        previewOpens: 1,
        unlocks: 1,
        viewerOpens: 0,
      },
    });

    expect(analytics.contentConversionState.totalPreviews).toBe(1);
    expect(analytics.unlockCategoryMix).toEqual([
      expect.objectContaining({
        label: "Chocolate",
        previews: 1,
        unlocks: 1,
      }),
    ]);
    expect(analytics.contentTagDemand).toEqual([
      { tag: "sweet", count: 1 },
      { tag: "launch", count: 1 },
    ]);
  });
});
