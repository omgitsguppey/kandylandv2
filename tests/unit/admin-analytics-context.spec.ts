import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildHistoricalAnalyticsContext } from "@/lib/server/admin-analytics-context";
import type { TelemetryLogRecord } from "@/lib/server/admin-analytics-shared";

function telemetryEvent(eventName: string, params: Record<string, unknown> = {}): TelemetryLogRecord {
  return {
    eventName,
    userId: "user_1",
    username: "tester",
    timestamp: 1_771_000_000_000,
    params: {
      event_id: "unlock_1",
      page_path: "/dashboard/viewer/drop_1",
      drop_id: "drop_1",
      drop_title: "Launch Drop",
      ...params,
    },
  };
}

describe("buildHistoricalAnalyticsContext", () => {
  it("counts canonical unlock conversions without double-counting legacy aliases", () => {
    const context = buildHistoricalAnalyticsContext({
      telemetryLogs: [
        telemetryEvent("drop_unlocked"),
        telemetryEvent("unlock_drop_success"),
      ],
      guestBatchDocs: [],
      viewerDropInsights: [],
      viewerUsers: [],
      securityEventDocs: [],
    });

    expect(context.experienceContexts).toEqual([
      expect.objectContaining({
        key: "drop_1",
        label: "Launch Drop",
        eventCount: 2,
        uniqueUsers: 1,
        conversionCount: 1,
      }),
    ]);
  });
});
