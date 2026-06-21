import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY,
  buildLaunchAnalyticsSourceAgreementFailureDetail,
  buildSourceAgreementCoverageSummaryState,
  buildSourceAgreementFailureDetailFromLaunchHistoryCoverage,
  hasBlockingSourceCoverageMismatch,
  launchCoverageInputEvidenceNextAction,
  summarizeLaunchCoverageInputEvidence,
} from "@/lib/analytics/source-agreement-detail";
import {
  ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  RECOVERY_METRIC_DEDUPE_DIMENSIONS,
} from "@/lib/analytics/recovery-timeline-spine";
import {
  launchHistoryCoverageInputStatuses,
  launchHistoryCoverageExportPaths,
  launchHistoryCoverageHasFormalRangeProof,
  isUsableLaunchHistoryCoverageEvidence,
  normalizeLaunchHistoryCoverageExport,
  proofModeForLaunchCoverageExport,
  readLaunchCoverageInputHead,
} from "../../scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared";

describe("source agreement failure detail", () => {
  it("uses the recovery spine source coverage rows helper for launch-history rows", () => {
    const source = readFileSync("src/lib/analytics/source-agreement-detail.ts", "utf8");

    expect(source).toContain("buildLaunchHistorySourceCoverageRowsState");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryStatesFromSources");
  });

  it("owns blocking source coverage mismatch classification for launch history callers", () => {
    expect(hasBlockingSourceCoverageMismatch({
      hasFirstParty: false,
      hasGa4: false,
      hasHistoricalSnapshot: false,
      hasLegacy: false,
    })).toBe(false);
    expect(hasBlockingSourceCoverageMismatch({
      hasFirstParty: true,
      hasGa4: true,
      hasHistoricalSnapshot: false,
      hasLegacy: false,
    })).toBe(false);
    expect(hasBlockingSourceCoverageMismatch({
      hasFirstParty: false,
      hasGa4: true,
      hasHistoricalSnapshot: false,
      hasLegacy: false,
    })).toBe(true);
    expect(hasBlockingSourceCoverageMismatch({
      hasFirstParty: true,
      hasGa4: false,
      hasHistoricalSnapshot: false,
      hasLegacy: false,
    })).toBe(true);
    expect(hasBlockingSourceCoverageMismatch({
      hasFirstParty: false,
      hasGa4: false,
      hasHistoricalSnapshot: true,
      hasLegacy: true,
    })).toBe(true);
  });

  it("owns source agreement status thresholds for launch history callers", () => {
    const failed = buildSourceAgreementCoverageSummaryState({
      expectedDays: ["2026-02-12", "2026-02-13", "2026-02-14"],
      coverageBySource: {
        first_party: ["2026-02-12"],
        ga4: ["2026-02-12", "2026-02-13", "2026-02-14"],
        historical_snapshot: ["2026-02-12"],
        legacy_support: ["2026-02-14"],
      },
    });
    expect(failed).toMatchObject({
      disagreementCount: 2,
      maxDeltaPct: 67,
      sourceAgreementStatus: "failed",
    });

    const notEnough = buildSourceAgreementCoverageSummaryState({
      expectedDays: ["2026-02-12"],
      coverageBySource: {
        first_party: ["2026-02-12"],
        ga4: [],
      },
    });
    expect(notEnough).toMatchObject({
      activeSourceCount: 1,
      sourceAgreementStatus: "not_enough_sources",
    });
  });

  it("bounds source agreement day counts to the expected launch window", () => {
    const summary = buildSourceAgreementCoverageSummaryState({
      expectedDays: ["2026-05-02"],
      perSourceCoverage: [
        { source: "first_party", days: ["2026-05-01", "2026-05-02"], dayCount: 99 },
        { source: "ga4", days: ["2026-05-02"], dayCount: 1 },
      ],
    });

    expect(summary).toMatchObject({
      activeSourceCount: 2,
      activeSourceDayCounts: [1, 1],
      maxDeltaPct: 0,
      sourceAgreementStatus: "pass",
    });
  });

  it("reports compared sources, disagreement size, tolerance, blocked consumers, and exact next actions", () => {
    const detail = buildLaunchAnalyticsSourceAgreementFailureDetail({
      comparedMetrics: ["day_bucket_presence", "coverage_delta_pct"],
      tolerance: { reviewDeltaPct: 10, failDeltaPct: 25 },
      blockedConsumers: ["admin_analytics_charts", "debug_data_validation"],
    });

    expect(detail.comparedSources).toEqual(["first_party", "ga4", "historical_snapshot", "legacy_support"]);
    expect(detail.sourceAgreementStatus).toBe("failed");
    expect(detail.rangeStartDayKey).toBe("2026-02-12");
    expect(detail.rangeEndDayKey).toBe("2026-02-14");
    expect(detail.expectedDayCount).toBe(3);
    expect(detail.expectedRangeSource).toBe("union_of_local_source_days");
    expect(detail.coverageWindowKind).toBe("fixture_only_local_window");
    expect(detail.allLaunchRangeProven).toBe(false);
    expect(detail.missingDaysBySource.first_party).toEqual(["2026-02-13", "2026-02-14"]);
    expect(detail.disagreements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dayKey: "2026-02-13",
        sourcesPresent: ["ga4"],
        sourceTruthState: "second_source_only",
        sourceTruth: "ga4_evidence_only",
        freshnessState: "external_evidence_required",
        evidenceKind: "modeled",
        confidenceBand: "directional",
        dedupeDimensions: [...RECOVERY_METRIC_DEDUPE_DIMENSIONS],
        lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
        primarySourceState: "first_party_missing",
        secondSourceState: "ga4_present",
        classifications: expect.arrayContaining(["external_source_gap"]),
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
    expect(detail.sourceTruthPolicy).toEqual(LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY);
  });

  it("maps blocked launch analytics consumers to truthful display states", () => {
    const detail = buildLaunchAnalyticsSourceAgreementFailureDetail();
    const adminAnalyticsConsumers = detail.blockedConsumerDetails.filter((entry) => entry.consumer.startsWith("admin_analytics_"));

    expect(adminAnalyticsConsumers).toHaveLength(7);
    expect(detail.blockedConsumerDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({
        consumer: "admin_analytics_overview",
        currentState: "source_agreement_failed",
        allowedDisplayState: "source_missing",
        blockingOwner: "source agreement comparison",
      }),
      expect.objectContaining({
        consumer: "admin_analytics_device_mix",
        currentState: "second_source_only",
        allowedDisplayState: "second_source_only",
      }),
      expect.objectContaining({
        consumer: "admin_analytics_region_demand",
        currentState: "second_source_only",
        allowedDisplayState: "second_source_only",
      }),
      expect.objectContaining({
        consumer: "admin_analytics_top_paths",
        currentState: "second_source_only",
        allowedDisplayState: "second_source_only",
      }),
      expect.objectContaining({
        consumer: "admin_analytics_source_health",
        allowedDisplayState: "chart_promotion_blocked",
        nextAction: expect.stringContaining("charts waiting for proof"),
      }),
      expect.objectContaining({
        consumer: "debug_data_validation",
        allowedDisplayState: "chart_promotion_blocked",
      }),
      expect.objectContaining({
        consumer: "public_beta_score_evidence",
        allowedDisplayState: "chart_promotion_blocked",
      }),
    ]));
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

    expect(detail.coverageWindowKind).toBe("local_source_window");
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
        sourceTruthState: "second_source_only",
        sourceTruth: "ga4_evidence_only",
        evidenceKind: "modeled",
        dedupeDimensions: [...RECOVERY_METRIC_DEDUPE_DIMENSIONS],
        lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
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

  it("allows an admin truth sample to prove all-launch range only when it starts at launch and declared range matches rows", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 2,
        recoveredDayCount: 2,
        state: "available",
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-02-13",
        rangeProof: {
          allLaunchRangeProven: true,
          expectedRangeSource: "admin_truth_sample",
          coverageWindowKind: "admin_truth_sample",
        },
        days: [
          {
            dayKey: "2026-02-12",
            expected: true,
            sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 1, legacySupport: 1 },
          },
          {
            dayKey: "2026-02-13",
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

  it("allows an approved all-range local export to prove launch range when it starts at launch and declared range matches rows", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "local_export",
      launchHistoryCoverage: {
        expectedDayCount: 2,
        recoveredDayCount: 2,
        state: "available",
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-02-13",
        rangeProof: {
          allLaunchRangeProven: true,
          expectedRangeSource: "approved_all_launch_export",
          coverageWindowKind: "all_range_historical_export",
        },
        days: [
          {
            dayKey: "2026-02-12",
            expected: true,
            sourceCounts: { first_party: 8, ga4: 8, historicalSnapshot: 1, legacySupport: 0 },
          },
          {
            dayKey: "2026-02-13",
            expected: true,
            sourceCounts: { first_party: 5, ga4: 5, historicalSnapshot: 0, legacySupport: 1 },
          },
        ],
      },
    });

    expect(detail.coverageWindowKind).toBe("all_range_historical_export");
    expect(detail.sourceAgreementStatus).toBe("pass");
    expect(detail.allLaunchRangeProven).toBe(true);
    expect(detail.disagreementCount).toBe(0);
  });

  it("does not let local export rows prove launch range without approved all-range proof markers", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "local_export",
      launchHistoryCoverage: {
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        rangeStartDayKey: "2026-05-01",
        rangeEndDayKey: "2026-05-01",
        rangeProof: {
          allLaunchRangeProven: true,
          expectedRangeSource: "local_sample",
          coverageWindowKind: "local_source_window",
        },
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 8, ga4: 8, historicalSnapshot: 0, legacySupport: 0 },
          },
        ],
      },
    });

    expect(detail.sourceAgreementStatus).toBe("pass");
    expect(detail.allLaunchRangeProven).toBe(false);
    expect(detail.coverageWindowKind).toBe("local_source_window");
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
        sourceTruthState: "mixed_evidence",
        sourceTruth: "first_party_event_fact",
        freshnessState: "source_current",
        evidenceKind: "observed",
        confidenceBand: "verified",
        dedupeDimensions: [...RECOVERY_METRIC_DEDUPE_DIMENSIONS],
        lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
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
        sourceTruthState: "mixed_evidence",
        sourceTruth: "first_party_event_fact",
        freshnessState: "source_current",
        evidenceKind: "observed",
        confidenceBand: "verified",
        dedupeDimensions: [...RECOVERY_METRIC_DEDUPE_DIMENSIONS],
        lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
        primarySourceState: "first_party_present",
        secondSourceState: "ga4_present",
        classifications: ["internal_traffic_mismatch"],
        blockingOwner: "source agreement count-delta review",
        productTruthEligible: false,
      }),
    ]));
    expect(detail.sourceTruthPolicy.firstPartyPrimary).toBe(true);
    expect(detail.sourceTruthPolicy.ga4SecondSourceOnly).toBe(true);
  });

  it("does not call GA4 plus legacy overlap a duplicate product event without first-party facts", () => {
    const detail = buildSourceAgreementFailureDetailFromLaunchHistoryCoverage({
      proofMode: "local_export",
      launchHistoryCoverage: {
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        days: [
          {
            dayKey: "2026-05-03",
            expected: true,
            sourceCounts: { first_party: 0, ga4: 1, historicalSnapshot: 0, legacySupport: 1 },
          },
        ],
      },
    });

    expect(detail.sourceAgreementStatus).toBe("review");
    expect(detail.disagreements).toEqual([
      expect.objectContaining({
        dayKey: "2026-05-03",
        primarySourceState: "first_party_missing",
        secondSourceState: "ga4_present",
        fallbackState: "fallback_present",
        classifications: expect.arrayContaining(["external_source_gap"]),
        productTruthEligible: false,
      }),
    ]);
    expect(detail.disagreements[0]?.classifications).not.toContain("duplicate_event");
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

  it("uses recovery-spine launch day state instead of local recovered-count math", () => {
    const source = readFileSync("src/lib/analytics/source-agreement-detail.ts", "utf8");

    expect(source).toContain("buildLaunchHistorySourceCoverageRowsState");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryStatesFromSources");
    expect(source).toContain("buildLaunchHistoryDayRecoveryState");
    expect(source).toContain("buildLaunchHistoryCoverageSummaryState");
    expect(source).toContain("buildLaunchHistoryCoverageRangeProofEligibility");
    expect(source).not.toContain("const recoveredExpectedDayCount = input.launchHistoryCoverage.days");
    expect(source).not.toContain("Object.values(day.sourceCounts).some");
    expect(source).not.toContain("function hasExplicitAllLaunchRangeProof");
    expect(source).not.toContain("function proofModeAllowsLaunchRangeProof");
  });

  it("recognizes completed admin truth sample coverage without flattening source counts", () => {
    const raw = {
      status: "complete",
      surface: "admin_truth_sample",
      redactions: [
        "No user identifiers, emails, transaction IDs, provider IDs, raw auth data, or support content included.",
      ],
      checks: [
        {
          id: "redacted-artifact-attached",
          status: "pass",
          notes: "artifactPath=agent/evidence/admin-truth-sample/launch.redacted.json",
        },
      ],
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

    expect(isUsableLaunchHistoryCoverageEvidence("agent/evidence/admin-truth-sample/launch.json", raw)).toBe(true);
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
    const missingLocalExport = statuses.find((entry) => entry.path === "agent/evidence/launch-analytics/launch-history-coverage.local.json");
    const adminSampleWithoutCoverage = statuses.find((entry) => entry.path === "agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.redacted.json");

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
    expect(missingLocalExport?.nextAction).toContain("npm run capture:truthful-evidence -- --launch-coverage-from");
    expect(missingLocalExport?.nextAction).toContain("launch-history-coverage.export.json");
    expect(adminSampleWithoutCoverage?.nextAction).toContain("lacks launchHistoryCoverage day rows");
    expect(adminSampleWithoutCoverage?.nextAction).toContain("launch-history-coverage.export.json");
    expect(statuses.some((entry) => entry.state === "usable_launch_history_coverage")).toBe(false);
  });

  it("centralizes launch coverage evidence input summaries for dry-run reports", () => {
    const summary = summarizeLaunchCoverageInputEvidence({
      sourceAgreementInputMode: "fixture_only_local_window",
      sourceAgreementInputPath: "none",
      usableLaunchCoverageInputFound: false,
      candidateLaunchCoverageInputStatuses: [
        {
          path: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
          state: "missing",
          proofMode: "none",
          nextAction: "Attach the local export.",
        },
        {
          path: "agent/evidence/admin-truth-sample/sample.redacted.json",
          state: "present_without_launch_history_coverage",
          proofMode: "none",
          nextAction: "Add launchHistoryCoverage rows.",
        },
      ],
    });

    expect(summary).toMatchObject({
      inputMode: "fixture_only_local_window",
      inputPath: "none",
      usableInputFound: false,
      candidateCount: 2,
      stateCounts: {
        missing: 1,
        present_without_launch_history_coverage: 1,
      },
    });
    expect(launchCoverageInputEvidenceNextAction(summary)).toContain("agent/evidence/launch-analytics/launch-history-coverage.local.json");
    expect(launchCoverageInputEvidenceNextAction({
      ...summary,
      usableInputFound: true,
    })).toContain("Attach approved launch-history coverage");
    expect(launchCoverageInputEvidenceNextAction({
      ...summary,
      usableInputFound: true,
      stateCounts: {
        usable_launch_history_coverage: 1,
      },
    })).toBeNull();
  });

  it("reads launch coverage evidence head without inventing current-head proof", () => {
    expect(readLaunchCoverageInputHead({ currentHead: "head-a" })).toBe("head-a");
    expect(readLaunchCoverageInputHead({ sourceCommit: "head-b" })).toBe("head-b");
    expect(readLaunchCoverageInputHead({ sourceHead: "head-c" })).toBe("head-c");
    expect(readLaunchCoverageInputHead({ commit: "head-d" })).toBe("head-d");
    expect(readLaunchCoverageInputHead({ currentHead: "" })).toBeNull();
    expect(readLaunchCoverageInputHead({})).toBeNull();
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

  it("does not treat launch history day rows as usable evidence without completion and redaction proof", () => {
    const raw = {
      status: "draft",
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
    };

    expect(normalizeLaunchHistoryCoverageExport(raw)).not.toBeNull();
    expect(isUsableLaunchHistoryCoverageEvidence(
      "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      raw,
    )).toBe(false);
    expect(isUsableLaunchHistoryCoverageEvidence(
      "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      {
        ...raw,
        status: "complete",
        redaction: {
          rawUserIdentifiersIncluded: false,
          rawPaymentDetailsIncluded: false,
          secretsIncluded: false,
        },
      },
    )).toBe(true);
    expect(launchHistoryCoverageHasFormalRangeProof(
      "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      {
        ...raw,
        status: "complete",
        redaction: {
          rawUserIdentifiersIncluded: false,
          rawPaymentDetailsIncluded: false,
          secretsIncluded: false,
        },
      },
    )).toBe(false);
  });

  it("keeps complete redacted local-window evidence distinct from formal launch-range proof", () => {
    const localWindow = {
      status: "complete",
      redaction: {
        rawUserIdentifiersIncluded: false,
        rawPaymentDetailsIncluded: false,
        secretsIncluded: false,
      },
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-05-01",
        rangeEndDayKey: "2026-05-01",
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        days: [{
          dayKey: "2026-05-01",
          expected: true,
          sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 0, legacySupport: 0 },
        }],
      },
    };
    const formalRangeExport = {
      status: "complete",
      generatedAtUtc: "2026-02-12T12:00:00.000Z",
      redaction: {
        rawUserIdentifiersIncluded: false,
        rawPaymentDetailsIncluded: false,
        secretsIncluded: false,
      },
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-02-12",
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        rangeProof: {
          allLaunchRangeProven: true,
          expectedRangeSource: "approved_all_launch_export",
          coverageWindowKind: "all_range_historical_export",
        },
        days: [{
          dayKey: "2026-02-12",
          expected: true,
          sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 0, legacySupport: 0 },
        }],
      },
    };
    const shortCurrentExport = {
      ...formalRangeExport,
      generatedAtUtc: "2026-06-20T12:00:00.000Z",
    };

    expect(isUsableLaunchHistoryCoverageEvidence(
      "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      localWindow,
    )).toBe(true);
    expect(launchHistoryCoverageHasFormalRangeProof(
      "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      localWindow,
    )).toBe(false);
    expect(launchHistoryCoverageHasFormalRangeProof(
      "agent/evidence/launch-analytics/launch-history-coverage.export.json",
      formalRangeExport,
    )).toBe(true);
    expect(launchHistoryCoverageHasFormalRangeProof(
      "agent/evidence/launch-analytics/launch-history-coverage.export.json",
      shortCurrentExport,
    )).toBe(false);

    const summary = summarizeLaunchCoverageInputEvidence({
      sourceAgreementInputMode: "local_export",
      sourceAgreementInputPath: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      usableLaunchCoverageInputFound: true,
      candidateLaunchCoverageInputStatuses: [{
        path: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
        state: "usable_local_window_only",
        proofMode: "local_export",
        nextAction: "Add all-launch proof.",
      }],
    });

    expect(summary.stateCounts.usable_local_window_only).toBe(1);
    expect(launchCoverageInputEvidenceNextAction(summary)).toContain("only proves a local evidence window");
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

  it("collapses duplicate launch coverage day rows before scoring source agreement", () => {
    const coverage = normalizeLaunchHistoryCoverageExport({
      status: "complete",
      surface: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 3,
        recoveredDayCount: 3,
        state: "available",
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 1, ga4: 2, historicalSnapshot: 0, legacySupport: 0 },
            internalAdminExcludedCount: 1,
          },
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 5, ga4: 1, historicalSnapshot: 2, legacySupport: 0 },
            internalAdminExcludedCount: 3,
          },
          {
            dayKey: "2026-05-02",
            expected: true,
            sourceCounts: { first_party: 0, ga4: 0, historicalSnapshot: 0, legacySupport: 0 },
          },
        ],
      },
    });

    expect(coverage).toMatchObject({
      expectedDayCount: 2,
      recoveredDayCount: 1,
      state: "partial",
    });
    expect(coverage?.days).toHaveLength(2);
    expect(coverage?.days[0]).toMatchObject({
      dayKey: "2026-05-01",
      sourceCounts: {
        first_party: 5,
        ga4: 2,
        historicalSnapshot: 2,
        legacySupport: 0,
      },
      internalAdminExcludedCount: 3,
    });
  });

  it("normalizes imported launch coverage through the recovery spine so GA4-only evidence stays partial", () => {
    const source = readFileSync("scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared.ts", "utf8");
    const coverage = normalizeLaunchHistoryCoverageExport({
      status: "complete",
      surface: "admin_truth_sample",
      launchHistoryCoverage: {
        expectedDayCount: 2,
        recoveredDayCount: 2,
        state: "available",
        days: [
          {
            dayKey: "2026-05-01",
            expected: true,
            sourceCounts: { first_party: 0, ga4: 7, historicalSnapshot: 0, legacySupport: 0 },
          },
          {
            dayKey: "2026-05-02",
            expected: true,
            sourceCounts: { first_party: 0, ga4: 5, historicalSnapshot: 0, legacySupport: 0 },
          },
        ],
      },
    });

    expect(source).toContain("buildLaunchHistorySourceCoverageRowsState");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryStatesFromSources");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryState({");
    expect(source).toContain("buildLaunchHistoryCoverageSummaryState");
    expect(source).not.toContain("const recoveredDayCount = days.filter");
    expect(source).not.toContain("day.sourceCounts.first_party <= 0");
    expect(source).not.toContain("!day.evidenceObserved");
    expect(coverage).toMatchObject({
      expectedDayCount: 2,
      recoveredDayCount: 2,
      state: "partial",
    });
  });

  it("preserves compact launch-critical family coverage from redacted exports", () => {
    const coverage = normalizeLaunchHistoryCoverageExport({
      status: "complete",
      redaction: {
        rawUserIdentifiersIncluded: false,
        rawPaymentDetailsIncluded: false,
        secretsIncluded: false,
      },
      launchHistoryCoverage: {
        expectedDayCount: 1,
        recoveredDayCount: 1,
        state: "available",
        eventFamilyCoverage: {
          canonicalMappedFamilyCount: 13,
          canonicalMappingCoveragePercent: 100,
          observedFirstPartyFamilyCount: 1,
          observedFirstPartyCoveragePercent: 7.7,
          sourceCoverageStatus: "blocked",
          holdbackValidation: {
            observedFirstPartyRequired: true,
            modeledOrInferredCanCalibrateOnly: true,
            observedFirstPartyFamilyGapCount: 12,
            status: "blocked",
            reason: "First-party holdback still missing.",
          },
          familySourceStates: [
            {
              familyId: "page_view",
              observedFirstParty: true,
              sourceCoverageState: "observed_first_party",
              sourceRole: "product_truth",
              strongestSourceTruth: "first_party_event_fact",
              strongestEvidenceKind: "observed",
              confidenceBand: "verified",
              productTruthEligible: true,
              nextAction: "Use first-party truth.",
            },
            {
              familyId: "purchase",
              observedFirstParty: false,
              sourceCoverageState: "source_missing",
              sourceRole: "missing_source",
              strongestSourceTruth: "source_missing",
              strongestEvidenceKind: "missing",
              confidenceBand: "missing",
              productTruthEligible: false,
              nextAction: "Recover server purchase facts.",
            },
          ],
        },
        days: [{
          dayKey: "2026-05-01",
          expected: true,
          sourceCounts: { first_party: 3, ga4: 4, historicalSnapshot: 0, legacySupport: 0 },
        }],
      },
    });

    expect(coverage?.eventFamilyCoverage).toMatchObject({
      canonicalMappedFamilyCount: 13,
      canonicalMappingCoveragePercent: 100,
      observedFirstPartyFamilyCount: 1,
      sourceCoverageStatus: "blocked",
      holdbackValidation: {
        observedFirstPartyRequired: true,
        observedFirstPartyFamilyGapCount: 12,
        status: "blocked",
      },
      familySourceStates: [
        expect.objectContaining({
          familyId: "page_view",
          observedFirstParty: true,
          productTruthEligible: true,
        }),
        expect.objectContaining({
          familyId: "purchase",
          observedFirstParty: false,
          sourceCoverageState: "source_missing",
          productTruthEligible: false,
        }),
      ],
    });
  });
});
