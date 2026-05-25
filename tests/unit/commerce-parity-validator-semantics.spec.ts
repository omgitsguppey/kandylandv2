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
  sources: [],
};

function buildCommerceSummary(overrides: Partial<Parameters<typeof buildHistoricalValidationSummary>[0]> = {}) {
  return buildHistoricalValidationSummary({
    selectedRange: "30d",
    lastValidatedAt: 1_700_000_000_000,
    propertyId: "properties/123",
    generatedAtMs: 1_700_000_000_000,
    gaEventCounts: {},
    telemetryEventCounts: {},
    canonicalEventCounts: {},
    gaPresentDayKeys: ["2026-05-20"],
    snapshotPresentDayKeys: ["2026-05-20"],
    legacyPresentDayKeys: ["2026-05-20"],
    expectedDayKeys: ["2026-05-20"],
    recentWindowDayKeys: ["2026-05-20"],
    gaLastSeenAtMs: 1_700_000_000_000,
    snapshotLastSeenAtMs: 1_700_000_000_000,
    legacyLastSeenAtMs: 1_700_000_000_000,
    taskPipeline: [],
    normalizedTaskEventCount: 1,
    firstPartyTaskLifecycleEvents: 1,
    firstPartyPurchaseCount: 13,
    firstPartyPurchaseRollupDocumentCount: 13,
    completedPurchaseTransactionsCount: 5,
    completedPurchaseTransactionIds: ["tx1", "tx2", "tx3", "tx4", "tx5"],
    commerceRollupSourceIds: ["r1", "r2"],
    commerceRollupStartDayKey: "2026-04-25",
    commerceRollupEndDayKey: "2026-05-24",
    firstPartyUnlockCount: 0,
    unlockTransactionsCount: 0,
    guestInteractionCount: 0,
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
    firstPartyAuthenticatedEvents: 10,
    canonicalSampleCount: 10,
    telemetryParityEventSource: "analytics_rollups_daily.authenticatedEvents",
    telemetryParitySampleSource: "analytics_event_facts",
    telemetryPurchaseCount: 0,
    telemetryUnlockCount: 0,
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
    creatorSpendTransactionCount: 15,
    creatorSpendParityMismatchCount: 0,
    creatorRestrictedSpendViolationCount: 0,
    truthState,
    ...overrides,
  });
}

describe("commerce parity validator semantics", () => {
  it("keeps purchase telemetry blocked when completed transactions have zero canonical server events", () => {
    const summary = buildCommerceSummary();
    const revenue = summary.validations.find((check) => check.checkKey === "purchase_revenue_truth");
    const funnel = summary.validations.find((check) => check.checkKey === "purchase_funnel_telemetry");
    const creatorSpend = summary.validations.find((check) => check.checkKey === "creator_spend_parity");

    expect(revenue).toMatchObject({
      status: "fail",
      passAllowed: false,
    });
    expect(revenue?.technicalEvidence).toContain("Mismatch reason: telemetry_missing");
    expect(funnel).toMatchObject({
      status: "fail",
      sampleCount: 0,
      passAllowed: false,
      passBlockedReason: "purchase_telemetry_undercount",
    });
    expect(funnel?.action).toContain("Wire canonical server purchase telemetry after verified PayPal capture");
    expect(creatorSpend).toMatchObject({
      status: "pass",
      passAllowed: true,
    });
  });
});
