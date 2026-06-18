import { describe, expect, it } from "vitest";

import { buildLaunchAnalyticsSourceAgreementFailureDetail } from "@/lib/analytics/source-agreement-detail";

describe("source agreement failure detail", () => {
  it("reports compared sources, disagreement size, tolerance, blocked consumers, and exact next actions", () => {
    const detail = buildLaunchAnalyticsSourceAgreementFailureDetail({
      comparedMetrics: ["day_bucket_presence", "coverage_delta_pct"],
      tolerance: { reviewDeltaPct: 10, failDeltaPct: 25 },
      blockedConsumers: ["admin_analytics_charts", "debug_data_validation"],
    });

    expect(detail.comparedSources).toEqual(["first_party", "ga4", "historical_snapshot", "legacy_support"]);
    expect(detail.sourceAgreementStatus).toBe("failed");
    expect(detail.rangeStartDayKey).toBe("2026-05-01");
    expect(detail.rangeEndDayKey).toBe("2026-05-03");
    expect(detail.expectedDayCount).toBe(3);
    expect(detail.expectedRangeSource).toBe("union_of_local_source_days");
    expect(detail.coverageWindowKind).toBe("fixture_only_local_window");
    expect(detail.allLaunchRangeProven).toBe(false);
    expect(detail.missingDaysBySource.first_party).toEqual(["2026-05-02", "2026-05-03"]);
    expect(detail.disagreements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dayKey: "2026-05-02",
        sourcesPresent: ["ga4"],
        primarySourceState: "first_party_missing",
        secondSourceState: "ga4_present",
        classifications: expect.arrayContaining(["external_source_gap", "missing_materializer"]),
        recoveryLane: "first_party_materialization",
        blockingOwner: "analytics_event_facts materialization",
        proofRequired: expect.arrayContaining(["first_party_day_bucket_or_analytics_event_facts_sample"]),
        productTruthEligible: false,
      }),
    ]));
    expect(detail.disagreementCount).toBeGreaterThan(0);
    expect(detail.maxDeltaPct).toBeGreaterThan(25);
    expect(detail.toleranceThresholds.failDeltaPct).toBe(25);
    expect(detail.blockedConsumers).toContain("admin_analytics_charts");
    expect(detail.nextAction).not.toMatch(/^retry$/iu);
    expect(detail.nextAction).toMatch(/first-party/i);
    expect(detail.nextExactSteps.join(" ")).toMatch(/all-range historical analytics route|approved local export path/i);
    expect(detail.sourceTruthPolicy).toMatchObject({
      firstPartyPrimary: true,
      ga4SecondSourceOnly: true,
      fallbackEvidenceOnly: true,
      missingIsNotZero: true,
    });
  });
});
