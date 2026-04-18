import { describe, expect, it } from "vitest";

import { summarizeAnalyticsTruth } from "@/lib/admin-analytics-truth";

describe("summarizeAnalyticsTruth", () => {
  it("marks stale required and legacy sources while keeping fresh sources healthy", () => {
    const nowMs = Date.UTC(2026, 3, 18, 12, 0, 0);
    const oneHourAgo = nowMs - 60 * 60 * 1000;
    const fourDaysAgo = nowMs - 4 * 24 * 60 * 60 * 1000;
    const twentyDaysAgo = nowMs - 20 * 24 * 60 * 60 * 1000;

    const result = summarizeAnalyticsTruth({
      nowMs,
      sources: [
        {
          key: "event_stats",
          label: "Event stats",
          count: 20,
          lastSeenAt: oneHourAgo,
        },
        {
          key: "legacy_daily",
          label: "Legacy daily rollups",
          count: 4,
          lastSeenAt: fourDaysAgo,
          legacyHistoricalSupport: true,
        },
        {
          key: "commerce_summary",
          label: "Commerce summary",
          count: 1,
          lastSeenAt: twentyDaysAgo,
        },
      ],
    });

    expect(result.score).toBeLessThan(100);
    expect(result.healthy).toBe(1);
    expect(result.warn).toBe(1);
    expect(result.fail).toBe(1);
    expect(result.staleRequiredCount).toBe(2);
    expect(result.legacyCoverageWarnings).toBe(1);
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "event_stats", status: "healthy" }),
        expect.objectContaining({ key: "legacy_daily", status: "warn" }),
        expect.objectContaining({ key: "commerce_summary", status: "fail" }),
      ]),
    );
  });
});
