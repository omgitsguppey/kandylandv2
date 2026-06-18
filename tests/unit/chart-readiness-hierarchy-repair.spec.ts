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

function buildSummary() {
  return buildHistoricalValidationSummary({
    selectedRange: "30d",
    lastValidatedAt: 1_700_000_000_000,
    propertyId: "properties/123",
    generatedAtMs: 1_700_000_000_000,
    gaEventCounts: {},
    telemetryEventCounts: {},
    canonicalEventCounts: {},
    gaPresentDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05"],
    snapshotPresentDayKeys: ["2026-05-01", "2026-05-02"],
    legacyPresentDayKeys: ["2026-05-04", "2026-05-05"],
    expectedDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05"],
    recentWindowDayKeys: ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05"],
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
}

describe("chart readiness hierarchy repair", () => {
  it("blocks ready chart state when source agreement failed even if availability and continuity pass", () => {
    const summary = buildSummary();
    const sourceAgreementRow = summary.validations.find((check) => check.checkKey === "source_agreement_chart_readiness");

    expect(summary.analyticsSourceHealth.continuity.gapSeverity).toBe("none");
    expect(summary.analyticsSourceHealth.sourceAgreement.state).toBe("failed");
    expect(summary.analyticsSourceHealth.chartReadiness.state).toBe("source_disagreement");
    expect(summary.analyticsSourceHealth.chartReadiness.reason).toContain("source lanes do not agree across first-party, GA4, historical snapshot, and legacy support");
    expect(sourceAgreementRow).toMatchObject({
      status: "fail",
      passAllowed: false,
      passBlockedReason: "source_agreement_failed",
    });
    expect(sourceAgreementRow?.operatorSummary).not.toMatch(/passed|clear/iu);
    expect(sourceAgreementRow?.technicalEvidence).toMatch(/source agreement failed/iu);
  });
});
