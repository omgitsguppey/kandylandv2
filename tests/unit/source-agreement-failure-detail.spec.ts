import { describe, expect, it } from "vitest";

import {
  buildLaunchAnalyticsSourceAgreementFailureDetail,
  buildSourceAgreementFailureDetailFromLaunchHistoryCoverage,
} from "@/lib/analytics/source-agreement-detail";
import {
  normalizeLaunchHistoryCoverageExport,
  proofModeForLaunchCoverageExport,
} from "../../scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared";

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

  it("normalizes launchHistoryCoverage export rows into source agreement without proving product truth", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "local_export",
      launchHistoryCoverage: {
        expectedDayCount: 3,
        recoveredDayCount: 3,
        state: "available",
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 42, ga4: 65, historicalSnapshot: 1, legacySupport: 0 },
            internalAdminExcludedCount: 4,
          },
          {
            dayKey: "2026-05-02",
            expected: true,
            sourceCounts: { first_party: 0, ga4: 1, historicalSnapshot: 1, legacySupport: 0 },
          },
          {
            dayKey: "2026-05-03",
            expected: true,
            sourceCounts: { first_party: 0, ga4: 1, historicalSnapshot: 0, legacySupport: 1 },
          },
        ],
      },
    });

    expect(detail.coverageWindowKind).toBe("all_range_historical_export");
    expect(detail.allLaunchRangeProven).toBe(false);
    expect(detail.perDaySourceCounts?.["2026-05-01"]).toEqual({
      first_party: 42,
      ga4: 65,
      historicalSnapshot: 1,
      legacySupport: 0,
    });
    expect(detail.internalAdminExcludedCountByDay?.["2026-05-01"]).toBe(4);
    expect(detail.missingDaysBySource.first_party).toEqual(["2026-05-02", "2026-05-03"]);
    expect(detail.disagreements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dayKey: "2026-05-02",
        recoveryLane: "first_party_materialization",
        productTruthEligible: false,
      }),
    ]));
    expect(detail.sourceTruthPolicy.ga4SecondSourceOnly).toBe(true);
  });

  it("allows an admin truth sample to prove the all-launch range only when source agreement passes", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 2,
        recoveredDayCount: 2,
        state: "available",
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 1, legacySupport: 1 },
          },
          {
            dayKey: "2026-05-02",
            expected: true,
            sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 1, legacySupport: 1 },
          },
        ],
      },
    });

    expect(detail.coverageWindowKind).toBe("admin_truth_sample");
    expect(detail.sourceAgreementStatus).toBe("pass");
    expect(detail.allLaunchRangeProven).toBe(true);
    expect(detail.disagreementCount).toBe(0);
  });

  it("recognizes completed admin truth sample coverage without flattening source counts", () => {
    const raw = {
      status: "complete",
      surface: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        days: [
          {
            dayKey: "2026-05-04",
            expected: true,
            sourceCounts: {
              first_party: 12,
              ga4: 18,
              historicalSnapshot: 3,
              legacySupport: 0,
            },
            internalAdminExcludedCount: 2,
          },
        ],
      },
    };

    const coverage = normalizeLaunchHistoryCoverageExport(raw);

    expect(proofModeForLaunchCoverageExport("agent/evidence/admin-truth-sample/launch.redacted.json", raw)).toBe("admin_truth_sample");
    expect(proofModeForLaunchCoverageExport("agent/evidence/admin-truth-sample/evidence.template.json", {
      ...raw,
      status: "template_not_evidence",
    })).toBe("local_export");
    expect(proofModeForLaunchCoverageExport("agent/evidence/admin-truth-sample/general-admin-truth.json", {
      status: "complete",
      surface: "admin_truth_sample",
    })).toBe("local_export");
    expect(coverage?.days[0]?.sourceCounts).toEqual({
      first_party: 12,
      ga4: 18,
      historicalSnapshot: 3,
      legacySupport: 0,
    });
    expect(coverage?.days[0]?.internalAdminExcludedCount).toBe(2);
  });
});
