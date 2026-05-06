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
    expect(summary.validations.find((check) => check.checkKey === "unlock_parity")?.status).toBe("fail");
    expect(summary.validations.find((check) => check.checkKey === "pipeline_health")?.status).toBe("fail");
  });

  it("does not pass empty task guidance samples", () => {
    const summary = build();
    const taskGuidance = summary.validations.find((check) => check.checkKey === "task_guidance_parity");

    expect(taskGuidance).toMatchObject({
      status: "warn",
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
