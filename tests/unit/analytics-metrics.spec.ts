import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildAnalyticsMetricReport } from "@/lib/server/analytics-metrics";

function metric(report: ReturnType<typeof buildAnalyticsMetricReport>, key: string) {
  const found = report.metrics.find((entry) => entry.key === key);
  expect(found).toBeDefined();
  return found!;
}

describe("analytics metrics", () => {
  it("uses canonical unlock aliases for drop conversion rates without raw drop_unwrapped drift", () => {
    const report = buildAnalyticsMetricReport({
      eventCounts: {
        drop_card_impression: 20,
        drop_preview_opened: 10,
        drop_unlocked: 4,
        unlock_drop_success: 2,
        drop_unwrapped: 1,
        entitlement_granted: 3,
        viewer_opened: 2,
      },
    });

    expect(metric(report, "preview_click_through_rate")).toMatchObject({
      value: 0.5,
      sampleSize: 20,
      supportingValues: {
        dropPreviewOpens: 10,
        dropCardImpressions: 20,
      },
    });
    expect(metric(report, "preview_to_unlock_rate")).toMatchObject({
      value: 0.4,
      sampleSize: 10,
      supportingValues: {
        unlocks: 4,
        previews: 10,
      },
    });
    expect(metric(report, "unlock_to_viewer_rate")).toMatchObject({
      value: 0.5,
      sampleSize: 4,
      supportingValues: {
        viewerOpens: 2,
        unlocks: 4,
      },
    });
  });

  it("dedupes canonical unlock event facts before recovering conversion rates", () => {
    const report = buildAnalyticsMetricReport({
      eventFacts: [
        {
          eventId: "preview_1",
          eventName: "drop_preview_opened",
          timestamp: 1_000,
          sessionId: "session_1",
          dropId: "drop_1",
          params: { drop_id: "drop_1" },
        },
        {
          eventId: "preview_2",
          eventName: "drop_preview_page_viewed",
          timestamp: 2_000,
          sessionId: "session_2",
          dropId: "drop_2",
          params: { drop_id: "drop_2" },
        },
        {
          eventId: "unlock_1",
          eventName: "unlock_drop_success",
          timestamp: 3_000,
          userId: "user_1",
          sessionId: "session_1",
          dropId: "drop_1",
          params: { drop_id: "drop_1", transaction_id: "txn_1" },
        },
        {
          eventId: "unlock_1",
          eventName: "drop_unlocked",
          timestamp: 3_100,
          userId: "user_1",
          sessionId: "session_1",
          dropId: "drop_1",
          params: { drop_id: "drop_1", transaction_id: "txn_1" },
        },
        {
          eventId: "viewer_1",
          eventName: "viewer_opened",
          timestamp: 4_000,
          userId: "user_1",
          sessionId: "session_1",
          dropId: "drop_1",
          params: { drop_id: "drop_1" },
        },
      ],
    });

    expect(metric(report, "preview_to_unlock_rate")).toMatchObject({
      value: 0.5,
      sampleSize: 2,
      supportingValues: {
        unlocks: 1,
        previews: 2,
      },
    });
    expect(metric(report, "unlock_to_viewer_rate")).toMatchObject({
      value: 1,
      sampleSize: 1,
      supportingValues: {
        viewerOpens: 1,
        unlocks: 1,
      },
    });
  });

  it("dedupes drop share and viewer open facts for share rate", () => {
    const report = buildAnalyticsMetricReport({
      eventFacts: [
        {
          eventId: "viewer_1",
          eventName: "viewer_opened",
          timestamp: 1_000,
          sessionId: "session_1",
          dropId: "drop_1",
          params: { drop_id: "drop_1" },
        },
        {
          eventId: "share_1",
          eventName: "drop_share_copied",
          timestamp: 2_000,
          sessionId: "session_1",
          dropId: "drop_1",
          params: { drop_id: "drop_1" },
        },
        {
          eventId: "share_1",
          eventName: "drop_share_copied",
          timestamp: 2_100,
          sessionId: "session_1",
          dropId: "drop_1",
          params: { drop_id: "drop_1" },
        },
      ],
    });

    expect(metric(report, "drop_share_rate")).toMatchObject({
      value: 1,
      sampleSize: 1,
      supportingValues: {
        dropShares: 1,
        viewerOpens: 1,
      },
    });
  });
});
