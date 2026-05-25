import { describe, expect, it } from "vitest";

import { buildHistoricalValidationSummary } from "@/lib/server/admin-analytics-historical-validation";

const now = Date.parse("2026-05-24T15:57:48.000Z");

function buildInput() {
  return {
    selectedRange: "30d",
    lastValidatedAt: now,
    propertyId: "property",
    generatedAtMs: now,
    gaEventCounts: {},
    telemetryEventCounts: {},
    canonicalEventCounts: { task_completed: 20, page_viewed: 100 },
    gaPresentDayKeys: ["2026-05-23"],
    snapshotPresentDayKeys: ["2026-05-23"],
    legacyPresentDayKeys: ["2026-05-23"],
    expectedDayKeys: ["2026-05-23"],
    recentWindowDayKeys: ["2026-05-23"],
    gaLastSeenAtMs: now,
    snapshotLastSeenAtMs: now,
    legacyLastSeenAtMs: now,
    taskPipeline: [{ label: "Task guidance", count: 376 }],
    normalizedTaskEventCount: 500,
    firstPartyTaskLifecycleEvents: 2817,
    firstPartyPurchaseCount: 13,
    completedPurchaseTransactionIds: [],
    commerceRollupSourceIds: [],
    firstPartyUnlockCount: 145,
    completedUnlockTransactionIds: [],
    unlockRollupSourceIds: [],
    completedPurchaseTransactionsCount: 5,
    unlockTransactionsCount: 47,
    guestInteractionCount: 0,
    pageRollupViewCount: 0,
    dropRollupActivityCount: 0,
    viewerSessionFactCount: 370,
    securityEventsCount: 0,
    securityLogCount: 0,
    guidedOnboardingCompletionCount: 0,
    legacyOnboardingCompletionCount: 0,
    normalizedOnboardingCompletions: 38,
    onboardingStartCount: 38,
    onboardingStartSource: "event_facts",
    taskGuidance: { viewed: 0, dismissed: 0, tapped: 0, completed: 0 },
    firstPartyAuthenticatedEvents: 10,
    canonicalSampleCount: 500,
    telemetryParityEventSource: "analytics_rollups_daily.authenticatedEvents",
    telemetryParitySampleSource: "analytics_event_facts",
    telemetryPurchaseCount: 0,
    telemetryUnlockCount: 0,
    viewerSessionCount: 200,
    watchSessionCount: 200,
    watchAssetCount: 0,
    watchCaptureFullCount: 65,
    watchCaptureDegradedCount: 0,
    watchCaptureCloseMissingCount: 0,
    watchCaptureReplayRecoveredCount: 135,
    filteredSessionFactsLength: 370,
    viewerSessionStartedLogsLength: 0,
    pipelineFailureCount: 0,
    pipelineFailureClusters: [],
    creatorSpendTransactionCount: 15,
    creatorSpendParityMismatchCount: 0,
    creatorRestrictedSpendViolationCount: 0,
    truthState: {
      score: 100,
      generatedAtUtc: "2026-05-24T15:57:48.000Z",
      healthy: true,
      fail: 0,
      warn: 0,
      staleRequiredCount: 0,
      legacyCoverageWarnings: [],
      sources: [],
    },
  } as unknown as Parameters<typeof buildHistoricalValidationSummary>[0];
}

describe("module coverage validator semantics", () => {
  it("separates required and optional gaps and names blocked modules", () => {
    const summary = buildHistoricalValidationSummary(buildInput());
    const moduleCoverage = summary.analyticsModuleCoverage;
    const row = summary.validations.find((check) => check.checkKey === "module_coverage");

    expect(moduleCoverage.requiredModules).toBeGreaterThan(0);
    expect(moduleCoverage.optionalModules).toBeGreaterThan(0);
    expect(moduleCoverage.optionalGaps).toBeGreaterThan(0);
    expect(moduleCoverage.blockedReason).toMatch(/^module_empty:/);
    expect(moduleCoverage.parityScoreFormula).toContain("Required verified=1.0");
    expect(row?.sampleSource).toBe("module evidence samples");
    expect(row?.technicalEvidence).toContain("Required gaps:");
    expect(row?.technicalEvidence).toContain("Optional gaps:");
  });
});
