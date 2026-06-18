import { describe, expect, it } from "vitest";

import {
  buildLaunchAnalyticsSourceAgreementFailureDetail,
  buildSourceAgreementFailureDetailFromLaunchHistoryCoverage,
} from "@/lib/analytics/source-agreement-detail";
import {
  launchHistoryCoverageInputStatuses,
  launchHistoryCoverageExportPaths,
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

  it("does not count missing fallback lanes as disagreement when first-party and GA4 agree", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "local_export",
      launchHistoryCoverage: {
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 12, ga4: 12, historicalSnapshot: 1, legacySupport: 0 },
          },
        ],
      },
    });

    expect(detail.sourceAgreementStatus).toBe("pass");
    expect(detail.disagreementCount).toBe(0);
    expect(detail.maxDeltaPct).toBe(0);
    expect(detail.disagreements).toEqual([]);
    expect(detail.missingDaysBySource.legacy_support).toEqual(["2026-05-01"]);
    expect(detail.sourceTruthPolicy.fallbackEvidenceOnly).toBe(true);
  });

  it("does not let a short admin truth sample prove all-launch range without explicit range proof", () => {
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
    expect(detail.allLaunchRangeProven).toBe(false);
    expect(detail.disagreementCount).toBe(0);
  });

  it("allows an admin truth sample to prove all-launch range only when declared range matches rows", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 2,
        recoveredDayCount: 2,
        state: "available",
        rangeStartDayKey: "2026-05-01",
        rangeEndDayKey: "2026-05-02",
        rangeProof: {
          allLaunchRangeProven: true,
          expectedRangeSource: "admin_truth_sample",
          coverageWindowKind: "admin_truth_sample",
        },
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

  it("classifies first-party and GA4 count deltas without letting GA4 overwrite truth", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "admin_truth_sample",
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-05-04",
        rangeEndDayKey: "2026-05-04",
        rangeProof: {
          allLaunchRangeProven: true,
          expectedRangeSource: "admin_truth_sample",
          coverageWindowKind: "admin_truth_sample",
        },
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 20, ga4: 80, historicalSnapshot: 0, legacySupport: 0 },
            internalAdminExcludedCount: 3,
          },
        ],
      },
    });

    expect(detail.sourceAgreementStatus).toBe("failed");
    expect(detail.maxDeltaPct).toBe(75);
    expect(detail.allLaunchRangeProven).toBe(false);
    expect(detail.perDayMetricDeltas).toEqual([
      expect.objectContaining({
        dayKey: "2026-05-01",
        metric: "source_count_delta",
        primarySource: "first_party",
        secondSource: "ga4",
        primaryCount: 20,
        secondSourceCount: 80,
        deltaPct: 75,
        classifications: ["internal_traffic_mismatch"],
      }),
    ]);
    expect(detail.disagreements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dayKey: "2026-05-01",
        primarySourceState: "first_party_present",
        secondSourceState: "ga4_present",
        classifications: ["internal_traffic_mismatch"],
        blockingOwner: "source agreement count-delta review",
        productTruthEligible: true,
      }),
    ]));
    expect(detail.sourceTruthPolicy.firstPartyPrimary).toBe(true);
    expect(detail.sourceTruthPolicy.ga4SecondSourceOnly).toBe(true);
  });

  it("does not prove all-launch coverage when declared counts do not match supplied day rows", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 99,
        recoveredDayCount: 99,
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

    expect(detail.sourceAgreementStatus).toBe("pass");
    expect(detail.allLaunchRangeProven).toBe(false);
    expect(detail.expectedDayCount).toBe(2);
  });

  it("recognizes completed admin truth sample coverage without flattening source counts", () => {
    const raw = {
      status: "complete",
      surface: "admin_truth_sample",
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-05-04",
        rangeEndDayKey: "2026-05-04",
        rangeProof: {
          allLaunchRangeProven: true,
          expectedRangeSource: "admin_truth_sample",
          coverageWindowKind: "admin_truth_sample",
        },
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
    expect(coverage?.rangeStartDayKey).toBe("2026-05-04");
    expect(coverage?.rangeEndDayKey).toBe("2026-05-04");
    expect(coverage?.rangeProof?.allLaunchRangeProven).toBe(true);
    expect(coverage?.days[0]?.internalAdminExcludedCount).toBe(2);
  });

  it("advertises the local/export recovery inputs without requiring provider reads", () => {
    expect(launchHistoryCoverageExportPaths()).toEqual(expect.arrayContaining([
      "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      "agent/evidence/launch-analytics/launch-history-coverage.export.json",
    ]));
  });

  it("classifies candidate launch coverage inputs without treating general samples as proof", () => {
    const statuses = launchHistoryCoverageInputStatuses();

    expect(statuses).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
        state: "missing",
        proofMode: "none",
      }),
      expect.objectContaining({
        path: "agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.redacted.json",
        state: "present_without_launch_history_coverage",
        proofMode: "none",
      }),
    ]));
    expect(statuses.some((entry) => entry.state === "usable_launch_history_coverage")).toBe(false);
  });

  it("rejects template or malformed launch coverage rows as non-evidence", () => {
    expect(normalizeLaunchHistoryCoverageExport({
      status: "template_not_evidence",
      launchHistoryCoverage: {
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        days: [{
          dayKey: "2026-05-01",
          expected: true,
          sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 0, legacySupport: 0 },
        }],
      },
    })).toBeNull();

    expect(normalizeLaunchHistoryCoverageExport({
      launchHistoryCoverage: {
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        days: [{
          dayKey: "YYYY-MM-DD",
          expected: true,
          sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 0, legacySupport: 0 },
        }],
      },
    })).toBeNull();
  });

  it("derives recovered launch coverage from rows instead of declared counts", () => {
    const coverage = normalizeLaunchHistoryCoverageExport({
      status: "complete",
      surface: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 99,
        recoveredDayCount: 99,
        state: "available",
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 0, ga4: 0, historicalSnapshot: 0, legacySupport: 0 },
          },
          {
            dayKey: "2026-05-02",
            expected: true,
            sourceCounts: { first_party: 3, ga4: 4, historicalSnapshot: 0, legacySupport: 0 },
          },
        ],
      },
    });

    expect(coverage).toMatchObject({
      expectedDayCount: 2,
      recoveredDayCount: 1,
      state: "partial",
    });
  });
});
