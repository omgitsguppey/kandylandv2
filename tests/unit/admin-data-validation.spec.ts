import { describe, expect, it } from "vitest";

import { buildHistoricalValidationSummary } from "@/lib/server/admin-analytics-historical-validation";
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
    gaEventCounts: {},
    telemetryEventCounts: {},
    canonicalEventCounts: {},
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
    telemetryLogCount: 0,
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
      status: "warn",
      sampleRequired: true,
      sampleCount: 0,
      passAllowed: false,
      passBlockedReason: "required_sample_missing",
    });
  });

  it("keeps low-confidence purchase and unlock parity as failures", () => {
    const summary = build();

    expect(summary.validations.find((check) => check.checkKey === "purchase_parity")?.status).toBe("fail");
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
});
