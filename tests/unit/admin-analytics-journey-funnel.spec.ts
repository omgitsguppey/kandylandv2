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

function responseWithoutFunnel(): HistoricalAnalyticsResponse {
  return {
    success: true,
    cacheState: "fresh",
    generatedAtMs: 1_771_000_000_000,
  };
}

describe("buildAdminAnalyticsJourneyFunnelModel", () => {
  it("classifies non-sequential event counts and exposes mismatches", () => {
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
    expect(model.funnelMode).toBe("partial_event_chain");
    expect(model.denominatorMode).toBe("prior_step_events");
    expect(model.nonSequentialSteps).toContain("unlocks");
    expect(model.sourceMismatchSteps).toContain("purchases");
    expect(model.steps.find((step) => step.stepKey === "purchases")?.displayedPercent).toBeCloseTo(19 / 5);
    expect(model.steps.find((step) => step.stepKey === "purchases")?.source).toBe("mixed_first_party_payment");
    expect(model.measurementMode).toBe("event_volume_only");
    expect(model.exactUserFunnelAvailable).toBe(false);
    expect(model.recommendation).toContain("True user funnel unavailable");
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

  it("does not classify a missing non-loading response as an error", () => {
    const model = buildAdminAnalyticsJourneyFunnelModel({
      selectedRange: "7d",
      loading: false,
    });

    expect(model.hydrationState).toBe("no_sample");
    expect(model.modeLabel).not.toBe("ERROR");
    expect(model.modeLabel).toBe("NO SAMPLE");
    expect(model.hasUsableEventSample).toBe(false);
    expect(model.canRenderStepDetails).toBe(false);
    expect(model.nextSourceStep).toContain("Generate bounded sample activity");
  });

  it("keeps actual errors distinct from no-sample states", () => {
    const model = buildAdminAnalyticsJourneyFunnelModel({
      selectedRange: "7d",
      loading: false,
      error: new Error("historical route failed"),
    });

    expect(model.hydrationState).toBe("error");
    expect(model.modeLabel).toBe("ERROR");
  });

  it("prevents fake zero math for missing event counts", () => {
    const response = responseWithoutFunnel();
    const model = buildAdminAnalyticsJourneyFunnelModel({
      selectedRange: "30d",
      response,
      loading: false,
      overviewTruthState: "live",
    });

    const firstStep = model.steps[0];
    const ratioStep = model.steps[1];

    expect(model.hasUsableEventSample).toBe(false);
    expect(firstStep.count).toBe(0);
    expect(firstStep.displayedCount).toBeNull();
    expect(firstStep.state).toBe("unknown");
    expect(firstStep.fakeZeroPrevented).toBe(true);
    expect(firstStep.explanation).toContain("has no verified event sample");
    expect(ratioStep.explanation).not.toContain("compared against 0");
    expect(model.steps.map((step) => step.explanation).join(" ")).not.toContain("0 compared against 0");
  });

  it("keeps aggregate event counts in event-volume mode until ordered actor sessions exist", () => {
    const response = responseWithFunnel({
      authModalOpens: 100,
      authSignIns: 20,
      authSignUps: 12,
      previewOpens: 80,
      viewerOpens: 60,
      assetSwitches: 0,
      unlocks: 30,
      shares: 2,
      walletOpens: 0,
      checkoutStarts: 10,
      purchases: 4,
      checkIns: 5,
      experienceViews: 0,
    });

    const model = buildAdminAnalyticsJourneyFunnelModel({
      selectedRange: "30d",
      response,
      funnel: response.funnel,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.hydrationState).toBe("ready");
    expect(model.hasUsableEventSample).toBe(true);
    expect(model.canRenderStepDetails).toBe(true);
    expect(model.measurementMode).toBe("event_volume_only");
    expect(model.exactUserFunnelAvailable).toBe(false);
    expect(model.algorithmRecommendation).toContain("ordered actor/session funnel");
    expect(model.algorithmRecommendation).toContain("Aggregate event counts alone remain event-volume ratios");
  });
});
