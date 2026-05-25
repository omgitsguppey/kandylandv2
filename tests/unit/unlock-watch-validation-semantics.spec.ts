import { describe, expect, it } from "vitest";

import { buildHistoricalValidationSummary } from "@/lib/server/admin-analytics-historical-validation";

function build(overrides: Partial<Parameters<typeof buildHistoricalValidationSummary>[0]> = {}) {
  return buildHistoricalValidationSummary({
    selectedRange: "30d",
    lastValidatedAt: Date.UTC(2026, 4, 24, 15, 57, 48),
    generatedAtMs: Date.UTC(2026, 4, 24, 15, 57, 48),
    propertyId: "G-TEST",
    gaEventCounts: {},
    telemetryEventCounts: {},
    canonicalEventCounts: {},
    firstPartyAuthenticatedEvents: 500,
    canonicalSampleCount: 500,
    pipelineFailureCount: 0,
    pipelineFailureClusters: [],
    firstPartyTaskLifecycleEvents: 1,
    taskPipeline: [{ label: "Task activity", count: 1 }],
    normalizedTaskEventCount: 1,
    completedPurchaseTransactionsCount: 0,
    firstPartyPurchaseCount: 0,
    telemetryPurchaseCount: 0,
    unlockTransactionsCount: 47,
    firstPartyUnlockCount: 145,
    telemetryUnlockCount: 0,
    onboardingStartCount: 1,
    normalizedOnboardingCompletions: 1,
    onboardingStartSource: "tracked",
    guidedOnboardingCompletionCount: 1,
    legacyOnboardingCompletionCount: 0,
    taskGuidance: {
      viewed: 1,
      dismissed: 0,
      tapped: 1,
      completed: 1,
      guidanceViews: 1,
      guidanceDismissals: 0,
      guidanceTaps: 1,
      guidanceCompletions: 1,
      taskCardExpansions: 1,
      taskHelpOpens: 1,
    },
    creatorSpendTransactionCount: 1,
    creatorSpendParityMismatchCount: 0,
    creatorRestrictedSpendViolationCount: 0,
    watchSessionCount: 200,
    watchAssetCount: 200,
    filteredSessionFactsLength: 370,
    viewerSessionStartedLogsLength: 0,
    watchCaptureFullCount: 65,
    watchCaptureDegradedCount: 0,
    watchCaptureReplayRecoveredCount: 135,
    watchCaptureCloseMissingCount: 0,
    truthState: {
      score: 100,
      pass: 1,
      warn: 0,
      fail: 0,
      sources: [],
      legacyCoverageWarnings: 0,
    },
    gaPresentDayKeys: ["2026-05-24"],
    snapshotPresentDayKeys: ["2026-05-24"],
    legacyPresentDayKeys: ["2026-05-24"],
    expectedDayKeys: ["2026-05-24"],
    recentWindowDayKeys: ["2026-05-24"],
    ...overrides,
  } as Parameters<typeof buildHistoricalValidationSummary>[0]);
}

describe("unlock/watch validation semantics", () => {
  it("blocks unlock, viewer start, and replay recovery parity with exact reasons", () => {
    const summary = build();

    expect(summary.validations.find((check) => check.checkKey === "unlock_access_truth")).toMatchObject({
      status: "fail",
      passAllowed: false,
      passBlockedReason: "missing_server_unlock_telemetry",
    });
    expect(summary.validations.find((check) => check.checkKey === "unlock_funnel_telemetry")).toMatchObject({
      status: "fail",
      passAllowed: false,
      passBlockedReason: "required_sample_missing",
    });
    expect(summary.validations.find((check) => check.checkKey === "viewer_activity_truth")).toMatchObject({
      status: "fail",
      passAllowed: false,
      passBlockedReason: "viewer_start_missing",
    });
    expect(summary.validations.find((check) => check.checkKey === "watch_capture_quality")).toMatchObject({
      status: "fail",
      passAllowed: false,
      passBlockedReason: "replay_recovery_rate_high",
    });
  });
});
