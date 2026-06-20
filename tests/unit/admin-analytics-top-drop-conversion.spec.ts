import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsTopDropConversionModel } from "@/lib/admin-analytics-top-drop-conversion";

describe("buildAdminAnalyticsTopDropConversionModel", () => {
  it("labels top drop conversion rows with first-party preview recovery metadata", () => {
    const model = buildAdminAnalyticsTopDropConversionModel({
      selectedRange: "30d",
      page: 1,
      pageSize: 10,
      response: {
        generatedAtMs: Date.parse("2026-05-06T12:00:00.000Z"),
        topDrops: [
          {
            dropId: "drop_alpha",
            dropTitle: "Alpha drop",
            creatorName: "Creator",
            views: 25,
            unlocks: 5,
          },
        ],
      },
    });

    expect(model.visibleRows[0]).toMatchObject({
      dropId: "drop_alpha",
      views: 25,
      unwraps: 5,
      unwrapRateDisplay: "20%",
      sourceTruth: "first_party_event_fact",
      freshnessState: "source_current",
      evidenceKind: "observed",
      confidenceScore: 95,
      confidenceBand: "verified",
      lateArrivalWindowDays: 12,
      productTruthEligible: true,
      missingVsZeroState: "source_present",
    });
    expect(model.visibleRows[0]?.dedupeKey).toContain("launch_recovery|drop_preview");
    expect(model.visibleRows[0]?.mathReason).toContain("drop_preview");
  });

  it("keeps unwrap-only rows source-present but not valid denominator truth", () => {
    const model = buildAdminAnalyticsTopDropConversionModel({
      selectedRange: "30d",
      page: 1,
      pageSize: 10,
      response: {
        generatedAtMs: Date.parse("2026-05-06T12:00:00.000Z"),
        topDrops: [
          {
            dropId: "drop_beta",
            dropTitle: "Beta drop",
            views: 0,
            unlocks: 2,
          },
        ],
      },
    });

    expect(model.visibleRows[0]).toMatchObject({
      dropId: "drop_beta",
      views: 0,
      unwraps: 2,
      unwrapRatePct: null,
      unwrapRateDisplay: "Unavailable",
      sourceTruth: "first_party_event_fact",
      evidenceKind: "observed",
      productTruthEligible: false,
      missingVsZeroState: "source_present",
    });
    expect(model.visibleRows[0]?.dedupeKey).toContain("launch_recovery|unlock");
    expect(model.visibleRows[0]?.explanation).toContain("no validated view denominator");
  });
});
