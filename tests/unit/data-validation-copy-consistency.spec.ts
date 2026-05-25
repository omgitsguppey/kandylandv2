import { describe, expect, it } from "vitest";

import { buildHistoricalValidationSummary } from "@/lib/server/admin-analytics-historical-validation";
import type { AnalyticsTruthSummary } from "@/lib/admin-analytics-truth";

const truthState: AnalyticsTruthSummary = {
  score: 100,
  healthy: 10,
  warn: 0,
  fail: 0,
  staleRequiredCount: 0,
  legacyCoverageWarnings: 0,
  sources: [],
};

describe("data validation copy consistency", () => {
  it("does not use passed or clear copy for failed blocked chart readiness rows", () => {
    const summary = buildHistoricalValidationSummary({
      selectedRange: "30d",
      lastValidatedAt: 1_700_000_000_000,
      propertyId: "properties/123",
      generatedAtMs: 1_700_000_000_000,
      gaEventCounts: {},
      telemetryEventCounts: {},
      canonicalEventCounts: {},
      gaPresentDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      snapshotPresentDayKeys: ["2026-05-01"],
      legacyPresentDayKeys: ["2026-05-03"],
      expectedDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      recentWindowDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03"],
      gaLastSeenAtMs: 1_700_000_000_000,
      snapshotLastSeenAtMs: 1_700_000_000_000,
      legacyLastSeenAtMs: 1_700_000_000_000,
      taskPipeline: [],
      normalizedTaskEventCount: 1,
      firstPartyTaskLifecycleEvents: 1,
      firstPartyPurchaseCount: 1,
      firstPartyUnlockCount: 1,
      completedPurchaseTransactionsCount: 1,
      unlockTransactionsCount: 1,
      guestInteractionCount: 1,
      pageRollupViewCount: 1,
      dropRollupActivityCount: 1,
      viewerSessionFactCount: 1,
      securityEventsCount: 1,
      securityLogCount: 1,
      guidedOnboardingCompletionCount: 1,
      legacyOnboardingCompletionCount: 0,
      normalizedOnboardingCompletions: 1,
      onboardingStartCount: 1,
      onboardingStartSource: "tracked",
      taskGuidance: { viewed: 1, dismissed: 0, tapped: 1, completed: 1 },
      firstPartyAuthenticatedEvents: 1,
      canonicalSampleCount: 1,
      telemetryParityEventSource: "analytics_rollups_daily.authenticatedEvents",
      telemetryParitySampleSource: "analytics_event_facts",
      telemetryPurchaseCount: 1,
      telemetryUnlockCount: 1,
      viewerSessionCount: 1,
      watchSessionCount: 1,
      watchAssetCount: 1,
      watchCaptureFullCount: 1,
      watchCaptureDegradedCount: 0,
      watchCaptureCloseMissingCount: 0,
      watchCaptureReplayRecoveredCount: 0,
      filteredSessionFactsLength: 1,
      viewerSessionStartedLogsLength: 1,
      pipelineFailureCount: 0,
      pipelineFailureClusters: [],
      creatorSpendTransactionCount: 1,
      creatorSpendParityMismatchCount: 0,
      creatorRestrictedSpendViolationCount: 0,
      truthState,
    });
    const row = summary.validations.find((check) => check.checkKey === "source_agreement_chart_readiness");

    expect(row?.status).toBe("fail");
    expect(row?.passAllowed).toBe(false);
    expect(row?.operatorSummary).not.toMatch(/passed|clear/iu);
    expect(row?.passBlockedReason).toBe("source_agreement_failed");
    expect(row?.technicalEvidence).toMatch(/availability passed/i);
    expect(row?.technicalEvidence).toMatch(/continuity passed/i);
    expect(row?.technicalEvidence).toMatch(/source agreement failed/i);
    expect(row?.technicalEvidence).toMatch(/chart readiness blocked/i);
  });
});
