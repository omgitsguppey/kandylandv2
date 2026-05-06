import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsLiveInteractionStreamModel } from "@/lib/admin-analytics-live-interaction-stream";
import type { HistoricalAnalyticsResponse, RawEventItem } from "@/types/admin-analytics";

function response(): HistoricalAnalyticsResponse {
  return {
    success: true,
    cacheState: "fresh",
  } as HistoricalAnalyticsResponse;
}

function event(overrides: Partial<RawEventItem>): RawEventItem {
  return {
    type: "TASK_ASSIGNED",
    detail: "Watch 2 unlocked files",
    path: "/experiences",
    uid: "user-1",
    username: "boshog512",
    timestamp: 1_000,
    ...overrides,
  };
}

const describeEvent = (item: RawEventItem) => item.detail || item.type;

describe("buildAdminAnalyticsLiveInteractionStreamModel", () => {
  it("excludes admin actions and keeps event math filtered to user stream", () => {
    const model = buildAdminAnalyticsLiveInteractionStreamModel({
      selectedRange: "24h",
      response: response(),
      rawEvents: [
        event({ type: "ADMIN_PANEL_VIEWED", path: "/admin/analytics", uid: "admin-1", username: "Admin" }),
        event({ type: "UNLOCK_CONTENT", detail: "Unlocked: Bloomytrip's Pink Bubble Bath", path: "/dashboard" }),
      ],
      describeEvent,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.rawEventCount).toBe(2);
    expect(model.visibleEventCount).toBe(1);
    expect(model.adminExcludedCount).toBe(1);
    expect(model.eventRows).toHaveLength(1);
    expect(model.eventRows[0]).toMatchObject({
      eventKey: "UNLOCK_CONTENT",
      compactTypeLabel: "Unlock",
      actorType: "user",
      shouldAppearInUserStream: true,
    });
    expect(model.excludedRows[0]).toMatchObject({
      actorType: "admin",
      shouldAppearInUserStream: false,
      exclusionReason: "admin_action",
      adminExclusionRuleApplied: true,
    });
  });

  it("classifies unknown actors without exposing full raw IDs as display labels", () => {
    const rawId = "B7WciP8I1Qbtk9CevdfpZTjferR2";
    const model = buildAdminAnalyticsLiveInteractionStreamModel({
      selectedRange: "7d",
      response: response(),
      rawEvents: [
        event({ uid: rawId, username: undefined, type: "DROP_CLICKED", detail: "Drop clicked" }),
      ],
      describeEvent,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.unknownActorCount).toBe(1);
    expect(model.eventRows[0].rawActorId).toBe(rawId);
    expect(model.eventRows[0].actorDisplayLabel).toBe("Session B7WciP");
    expect(model.eventRows[0].actorDisplayLabel).not.toBe(rawId);
  });

  it("groups duplicate task events and counts failures", () => {
    const model = buildAdminAnalyticsLiveInteractionStreamModel({
      selectedRange: "24h",
      response: response(),
      rawEvents: [
        event({ type: "TASK_FAILED", detail: "Top up your Gum Drops failed due to inactivity reset", timestamp: 120_000 }),
        event({ type: "TASK_FAILED", detail: "Top up your Gum Drops failed due to inactivity reset", timestamp: 130_000 }),
        event({ type: "TASK_ASSIGNED", detail: "Start a Gum Drop checkout", timestamp: 240_000 }),
      ],
      describeEvent,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.visibleEventCount).toBe(2);
    expect(model.duplicateGroupedCount).toBe(1);
    expect(model.failureCount).toBe(1);
    const failedRow = model.eventRows.find((row) => row.eventKey === "TASK_FAILED");
    expect(failedRow).toMatchObject({
      compactTypeLabel: "Task failed",
      duplicateCount: 2,
      failureReason: "Failed due to previous reset or inactivity policy",
    });
  });

  it("marks a 22 minute old newest event as stale snapshot instead of live", () => {
    const generatedAtMs = 22 * 60_000 + 10_000;
    const model = buildAdminAnalyticsLiveInteractionStreamModel({
      selectedRange: "24h",
      response: {
        ...response(),
        generatedAtMs,
      },
      rawEvents: [
        event({ type: "CREATOR_MESSAGE_SENT", detail: "Creator text message", timestamp: 10_000 }),
        event({ type: "CREATOR_MESSAGE_SENT", detail: "Creator text message", timestamp: 20_000 }),
        event({ type: "CREATOR_MESSAGE_SENT", detail: "Creator text message", timestamp: 30_000 }),
      ],
      describeEvent,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.streamSourceMode).toBe("stale_snapshot");
    expect(model.freshnessState).toBe("stale");
    expect(model.badgeLabel).toBe("STALE");
    expect(model.visibleCopy).toContain("stale recent-event snapshot");
    expect(model.eventRows[0]).toMatchObject({
      eventType: "message",
      duplicateCount: 3,
      sourceTruth: "message",
    });
  });

  it("prevents fake zeros while waiting for a validated snapshot", () => {
    const model = buildAdminAnalyticsLiveInteractionStreamModel({
      selectedRange: "24h",
      rawEvents: [],
      describeEvent,
      loading: true,
    });

    expect(model.visibleEventCount).toBeNull();
    expect(model.rawEventCount).toBeNull();
    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.badgeLabel).toBe("WAIT");
  });
});
