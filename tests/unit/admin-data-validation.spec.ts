import { describe, expect, it } from "vitest";

import { buildDataValidationPanelState, buildHistoricalValidationSummary } from "@/lib/server/admin-analytics-historical-validation";
import type { AnalyticsTruthSummary } from "@/lib/admin-analytics-truth";

const truthState: AnalyticsTruthSummary = {
  score: 100,
  healthy: 1,
  warn: 0,
  fail: 0,
  staleRequiredCount: 0,
  legacyCoverageWarnings: 0,
  sources: [
    {
      key: "analytics_event_stats",
      label: "Analytics events",
      count: 10,
      lastSeenAt: 1_700_000_000_000,
      required: true,
      legacyHistoricalSupport: false,
      status: "healthy",
      ageMs: 0,
      detail: "fresh",
    },
  ],
};

function build(overrides: Partial<Parameters<typeof buildHistoricalValidationSummary>[0]> = {}) {
  return buildHistoricalValidationSummary({
    selectedRange: "30d",
    lastValidatedAt: 1_700_000_000_000,
    propertyId: "properties/123",
    generatedAtMs: 1_700_000_000_000,
    gaEventCounts: {},
    telemetryEventCounts: {},
    canonicalEventCounts: {},
    gaPresentDayKeys: [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
    ],
    snapshotPresentDayKeys: [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
    ],
    legacyPresentDayKeys: [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
    ],
    expectedDayKeys: [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
    ],
    recentWindowDayKeys: [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
    ],
    gaLastSeenAtMs: 1_700_000_000_000,
    snapshotLastSeenAtMs: 1_700_000_000_000,
    legacyLastSeenAtMs: 1_700_000_000_000,
    taskPipeline: [],
    normalizedTaskEventCount: 10,
    firstPartyTaskLifecycleEvents: 10,
    firstPartyPurchaseCount: 19,
    firstPartyUnlockCount: 96,
    completedPurchaseTransactionsCount: 19,
    unlockTransactionsCount: 94,
    guestInteractionCount: 0,
    pageRollupViewCount: 1,
    dropRollupActivityCount: 1,
    viewerSessionFactCount: 1,
    securityEventsCount: 1,
    securityLogCount: 1,
    guidedOnboardingCompletionCount: 450,
    legacyOnboardingCompletionCount: 0,
    normalizedOnboardingCompletions: 450,
    onboardingStartCount: 481,
    onboardingStartSource: "tracked",
    taskGuidance: {
      viewed: 0,
      dismissed: 0,
      tapped: 0,
      completed: 0,
    },
    firstPartyAuthenticatedEvents: 6846,
    canonicalSampleCount: 0,
    telemetryParityEventSource: "analytics_rollups_daily.authenticatedEvents",
    telemetryParitySampleSource: "analytics_event_facts",
    telemetryPurchaseCount: 1,
    telemetryUnlockCount: 3,
    viewerSessionCount: 1,
    watchSessionCount: 1,
    watchAssetCount: 1,
    watchCaptureFullCount: 1,
    watchCaptureDegradedCount: 0,
    watchCaptureCloseMissingCount: 0,
    watchCaptureReplayRecoveredCount: 0,
    filteredSessionFactsLength: 1,
    viewerSessionStartedLogsLength: 1,
    pipelineFailureCount: 6341,
    pipelineFailureClusters: [],
    creatorSpendTransactionCount: 0,
    creatorSpendParityMismatchCount: 0,
    creatorRestrictedSpendViolationCount: 0,
    truthState,
    ...overrides,
  });
}

describe("buildHistoricalValidationSummary", () => {
  it("blocks PASS when required telemetry samples are missing", () => {
    const summary = build();
    const telemetryDepth = summary.validations.find((check) => check.checkKey === "telemetry_depth");

    expect(telemetryDepth).toMatchObject({
      status: "fail",
      sampleRequired: true,
      sampleCount: 0,
      passAllowed: false,
      passBlockedReason: "required_sample_missing",
    });
  });

  it("blocks telemetry parity when samples exist but confidence is low and refresh diagnostics fail", () => {
    const summary = build({
      firstPartyAuthenticatedEvents: 25_000,
      canonicalSampleCount: 500,
      pipelineFailureCount: 153,
      pipelineFailureClusters: [
        {
          source: "server_diagnostics",
          reasonCode: "UnknownError",
          count: 46,
          firstSeenAtUtc: "2026-05-24T15:49:14.000Z",
          lastSeenAtUtc: "2026-05-24T15:57:42.000Z",
          affectedRoute: "Analytics.IngestIdentified",
          suggestedAction: "Inspect identified ingest failures.",
        },
      ],
    });
    const telemetryDepth = summary.validations.find((check) => check.checkKey === "telemetry_depth");

    expect(summary.telemetryParityValidation).toMatchObject({
      status: "fail",
      sampleCoveragePct: 2,
      blockedReason: "analytics_refresh_failures_present",
    });
    expect(telemetryDepth).toMatchObject({
      status: "fail",
      confidence: 2,
      sampleCount: 500,
      passAllowed: false,
      passBlockedReason: "analytics_refresh_failures_present",
    });
    expect(telemetryDepth?.operatorSummary).toContain("Sample presence confirmed");
    expect(telemetryDepth?.action).toContain("Fix analytics refresh failures");
    expect(telemetryDepth?.action).not.toMatch(/which event source is missing/iu);
  });

  it("separates purchase revenue truth from funnel telemetry undercount", () => {
    const summary = build();

    expect(summary.validations.find((check) => check.checkKey === "purchase_revenue_truth")).toMatchObject({
      status: "pass",
      passAllowed: true,
    });
    expect(summary.validations.find((check) => check.checkKey === "purchase_funnel_telemetry")).toMatchObject({
      status: "fail",
      passAllowed: false,
      passBlockedReason: "purchase_telemetry_undercount",
    });
    expect(summary.validations.find((check) => check.checkKey === "unlock_access_truth")?.status).toBe("warn");
    expect(summary.validations.find((check) => check.checkKey === "unlock_funnel_telemetry")).toMatchObject({
      status: "fail",
      passAllowed: false,
      passBlockedReason: "unlock_telemetry_undercount",
    });
    expect(summary.validations.find((check) => check.checkKey === "pipeline_health")?.status).toBe("fail");
  });

  it("fails unlock funnel telemetry when successful unlocks have zero telemetry", () => {
    const summary = build({
      unlockTransactionsCount: 102,
      firstPartyUnlockCount: 105,
      telemetryUnlockCount: 0,
    });

    expect(summary.validations.find((check) => check.checkKey === "unlock_access_truth")?.status).toBe("fail");
    expect(summary.validations.find((check) => check.checkKey === "unlock_funnel_telemetry")).toMatchObject({
      status: "fail",
      sampleCount: 0,
      passAllowed: false,
      passBlockedReason: "required_sample_missing",
    });
  });

  it("fails viewer activity truth when raw starts are required but missing", () => {
    const summary = build({
      watchSessionCount: 434,
      watchAssetCount: 628,
      filteredSessionFactsLength: 376,
      viewerSessionStartedLogsLength: 0,
    });

    expect(summary.validations.find((check) => check.checkKey === "viewer_activity_truth")).toMatchObject({
      status: "fail",
      sampleCount: 810,
    });
    expect(summary.validations.find((check) => check.checkKey === "watch_capture_quality")?.status).toBe("pass");
  });

  it("does not pass empty task guidance samples", () => {
    const summary = build();
    const taskGuidance = summary.validations.find((check) => check.checkKey === "task_guidance_parity");

    expect(taskGuidance).toMatchObject({
      status: "fail",
      sampleRequired: true,
      sampleCount: 0,
      passAllowed: false,
    });
  });

  it("marks recent continuity gaps as failures even when availability is sampled", () => {
    const summary = build({
      gaPresentDayKeys: ["2026-05-01"],
      snapshotPresentDayKeys: ["2026-05-01"],
      legacyPresentDayKeys: ["2026-05-01"],
      expectedDayKeys: [
        "2026-05-01",
        "2026-05-02",
        "2026-05-03",
        "2026-05-04",
        "2026-05-05",
        "2026-05-06",
      ],
      recentWindowDayKeys: [
        "2026-05-01",
        "2026-05-02",
        "2026-05-03",
        "2026-05-04",
        "2026-05-05",
        "2026-05-06",
      ],
    });

    expect(summary.analyticsSourceHealth.continuity.recentGapDays).toEqual([
      "2026-05-02",
      "2026-05-03",
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
    ]);
    expect(summary.analyticsSourceHealth.chartReadiness.state).toBe("gap_detected");
    expect(summary.validations.find((check) => check.checkKey === "recent_6_day_coverage")?.status).toBe("fail");
  });

  it("does not mark complete continuity as a gap", () => {
    const summary = build();

    expect(summary.analyticsSourceHealth.continuity.missingDays).toEqual([]);
    expect(summary.analyticsSourceHealth.chartReadiness.state).toBe("ready");
    expect(summary.validations.find((check) => check.checkKey === "daily_continuity_coverage")?.status).toBe("pass");
  });

  it("scopes all-time continuity to the first recovered launch-history day", () => {
    const recoveredDays = [
      "2026-05-01",
      "2026-05-02",
      "2026-05-03",
    ];
    const summary = build({
      selectedRange: "all",
      gaPresentDayKeys: recoveredDays,
      snapshotPresentDayKeys: recoveredDays,
      legacyPresentDayKeys: recoveredDays,
      expectedDayKeys: [
        "2020-01-01",
        "2020-01-02",
        ...recoveredDays,
      ],
      recentWindowDayKeys: recoveredDays,
    });

    expect(summary.analyticsSourceHealth.launchHistoryCoverage).toMatchObject({
      rangeProof: {
        expectedRangeSource: "all_range_historical_route",
        coverageWindowKind: "all_range_historical_route",
        allLaunchRangeProven: false,
      },
      firstRecoveredDayKey: "2026-05-01",
      lastRecoveredDayKey: "2026-05-03",
      expectedDayCount: 3,
      recoveredDayCount: 3,
      preLaunchIgnoredDayCount: 2,
      state: "available",
    });
    expect(summary.analyticsSourceHealth.launchHistoryCoverage?.rangeProof.reason).toContain("launch-start proof");
    expect(summary.analyticsSourceHealth.launchHistoryCoverage?.firstPartyCoverage.canPromoteProductTruth).toBe(false);
    expect(summary.analyticsSourceHealth.continuity.missingDays).toEqual([]);
    expect(summary.analyticsSourceHealth.chartReadiness.state).toBe("partial");
    expect(summary.analyticsSourceHealth.chartReadiness.reason).toContain("first recovered source day");
  });

  it("keeps per-day launch recovery source labels without promoting GA4 to product truth", () => {
    const summary = build({
      selectedRange: "all",
      gaPresentDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      firstPartyPresentDayKeys: ["2026-05-01"],
      snapshotPresentDayKeys: ["2026-05-01", "2026-05-02"],
      legacyPresentDayKeys: ["2026-05-03"],
      expectedDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      recentWindowDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
    });
    const coverage = summary.analyticsSourceHealth.launchHistoryCoverage;

    expect(coverage?.sourceDayCounts).toMatchObject({
      firstParty: 1,
      ga4: 3,
      historicalSnapshot: 2,
      legacySupport: 1,
    });
    expect(coverage?.rangeProof).toMatchObject({
      expectedRangeSource: "all_range_historical_route",
      allLaunchRangeProven: false,
    });
    expect(coverage?.firstPartyCoverage).toMatchObject({
      state: "partial",
      coveredDayCount: 1,
      missingRanges: ["2026-05-02..2026-05-03"],
      canPromoteProductTruth: false,
    });
    expect(coverage?.days).toEqual([
      expect.objectContaining({
        dayKey: "2026-05-01",
        recovered: true,
        confidence: "mixed",
        sourceCounts: expect.objectContaining({ first_party: 1, ga4: 1 }),
      }),
      expect.objectContaining({
        dayKey: "2026-05-02",
        recovered: true,
        confidence: "fallback",
        sourceCounts: expect.objectContaining({ first_party: 0, ga4: 1, historicalSnapshot: 1 }),
        nextAction: expect.stringContaining("first-party"),
      }),
      expect.objectContaining({
        dayKey: "2026-05-03",
        recovered: true,
        confidence: "fallback",
        sourceCounts: expect.objectContaining({ first_party: 0, ga4: 1, legacySupport: 1 }),
      }),
    ]);
    expect(coverage?.days[1]?.reason).toContain("Historical snapshot covers this day");
    expect(summary.analyticsSourceHealth.sourceAgreement.state).toBe("failed");
    expect(summary.analyticsSourceHealth.sourceAgreement.classifications).toEqual(expect.arrayContaining([
      "date_range_mismatch",
      "external_source_gap",
      "missing_materializer",
    ]));
    expect(summary.analyticsSourceHealth.sourceAgreement.classifications).not.toContain("duplicate_event");
  });

  it("names partial or empty module coverage gaps with missing sources and validators", () => {
    const summary = build();
    const moduleCoverageCheck = summary.validations.find((check) => check.checkKey === "module_coverage");

    expect(summary.analyticsModuleCoverage.passAllowed).toBe(false);
    expect(summary.analyticsModuleCoverage.modules.some((module) => module.status !== "verified")).toBe(true);
    expect(moduleCoverageCheck?.moduleCoverage?.modules.filter((module) => module.status !== "verified").length).toBeGreaterThan(0);
    expect(moduleCoverageCheck?.detail).toContain("Task Guidance");
    expect(moduleCoverageCheck?.detail).toContain("missing");
    expect(moduleCoverageCheck?.moduleCoverage?.modules.find((module) => module.moduleId === "task_guidance")).toMatchObject({
      dependentPanels: expect.arrayContaining(["Onboarding/task parity"]),
      nextValidator: "check:task-guidance-telemetry-contract",
    });
  });

  it("returns not_validated when no validation rows are available", () => {
    const panelState = buildDataValidationPanelState({
      validations: [],
      range: "30d",
      generatedAtMs: 1_700_000_000_000,
      cacheState: "fresh",
    });

    expect(panelState).toMatchObject({
      status: "not_validated",
      checkCount: null,
      failCount: null,
      warnCount: null,
      staleCount: null,
      blockedPassCount: null,
      range: "30d",
      cacheState: "hit",
      lastValidatedAtUtc: null,
    });
  });

  it("returns loaded counts only after validation rows exist", () => {
    const summary = build();
    const panelState = buildDataValidationPanelState({
      validations: summary.validations,
      range: "30d",
      generatedAtMs: 1_700_000_000_000,
      cacheState: "fresh",
    });

    expect(panelState.checkCount).toBe(summary.validations.length);
    expect(panelState.failCount).toBeGreaterThan(0);
    expect(panelState.warnCount).toBeGreaterThan(0);
    expect(panelState.lastValidatedAtUtc).toBe("2023-11-14T22:13:20.000Z");
    expect(["loaded", "stale", "failed"]).toContain(panelState.status);
  });

  it("returns failed when the validation route errors", () => {
    const panelState = buildDataValidationPanelState({
      validations: null,
      range: "30d",
      generatedAtMs: 1_700_000_000_000,
      cacheState: "stale",
      loadError: "Route failed",
    });

    expect(panelState).toMatchObject({
      status: "failed",
      checkCount: null,
      failCount: null,
      warnCount: null,
      staleCount: null,
      blockedPassCount: null,
      cacheState: "stale",
      loadError: "Route failed",
    });
  });
});
