import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsJourneyFunnelModel } from "@/lib/admin-analytics-journey-funnel";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

function responseWithFunnel(funnel: HistoricalAnalyticsResponse["funnel"]): HistoricalAnalyticsResponse {
  return {
    success: true,
    cacheState: "fresh",
    generatedAtMs: 1_771_000_000_000,
    funnel,
  };
}

describe("buildAdminAnalyticsJourneyFunnelModel", () => {
  it("classifies non-sequential counts as raw events and exposes mismatches", () => {
    const response = responseWithFunnel({
      authModalOpens: 108,
      authSignIns: 0,
      authSignUps: 3,
      previewOpens: 26,
      viewerOpens: 19,
      assetSwitches: 0,
      unlocks: 96,
      shares: 2,
      walletOpens: 0,
      checkoutStarts: 5,
      purchases: 19,
      checkIns: 4,
      experienceViews: 0,
    });

    const model = buildAdminAnalyticsJourneyFunnelModel({
      selectedRange: "30d",
      response,
      funnel: response.funnel,
      onboardingStats: { starts: 20, completions: 10, avgDuration: 0, completionRate: 0.5 },
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.visibleTitle).toBe("Event Chain");
    expect(model.funnelMode).toBe("raw_event");
    expect(model.denominatorMode).toBe("raw_event_ratio");
    expect(model.nonSequentialSteps).toContain("unlocks");
    expect(model.sourceMismatchSteps).toContain("purchases");
    expect(model.steps.find((step) => step.stepKey === "purchases")?.displayedPercent).toBeCloseTo(19 / 5);
    expect(model.steps.find((step) => step.stepKey === "purchases")?.source).toBe("mixed_first_party_payment");
    expect(model.recommendation).toContain("Raw events exceed prior steps");
  });

  it("prevents fake zeros when data is unavailable", () => {
    const model = buildAdminAnalyticsJourneyFunnelModel({
      selectedRange: "7d",
      loading: true,
    });

    expect(model.steps[0].displayedCount).toBeNull();
    expect(model.steps[0].fakeZeroPrevented).toBe(true);
    expect(model.modeLabel).toBe("WAIT");
    expect(model.visibleHelperCopy).toContain("Waiting");
  });
});
