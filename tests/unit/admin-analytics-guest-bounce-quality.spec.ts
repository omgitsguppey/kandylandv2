import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsGuestBounceQualityModel } from "@/lib/admin-analytics-guest-bounce-quality";
import type { HistoricalAnalyticsResponse, SemanticCategorySummaryItem } from "@/types/admin-analytics";

function semantic(input: Partial<SemanticCategorySummaryItem> & Pick<SemanticCategorySummaryItem, "key" | "label">): SemanticCategorySummaryItem {
  return {
    viewCount: 0,
    viewDurationMs: 0,
    engagedViewCount: 0,
    passiveViewCount: 0,
    bounceCount: 0,
    exitCount: 0,
    clickCount: 0,
    hoverCount: 0,
    pagesVisited: 0,
    signInCount: 0,
    returnCount: 0,
    logoutCount: 0,
    watchSecondsTotal: 0,
    watchSessionCount: 0,
    avgViewSeconds: 0,
    engagedRate: 0,
    ...input,
  };
}

function response(guestTraffic: HistoricalAnalyticsResponse["guestTraffic"]): HistoricalAnalyticsResponse {
  return {
    success: true,
    cacheState: "fresh",
    guestTraffic,
  } as HistoricalAnalyticsResponse;
}

describe("buildAdminAnalyticsGuestBounceQualityModel", () => {
  it("labels verified guest-quality samples without implying realtime proof", () => {
    const model = buildAdminAnalyticsGuestBounceQualityModel({
      selectedRange: "7d",
      response: {
        ...response({
          totalViews: 50,
          totalSessions: 0,
          identifiedViews: 10,
          identifiedSessions: 0,
          exactGuestViews: 40,
          exactGuestSessions: 0,
          estimatedGuestViews: 0,
          estimatedGuestSessions: 0,
          truthLabel: "exact",
          sourceLabel: "first_party",
          qualityAvailable: true,
        }),
        generatedAtMs: 1_771_000_000_000,
        guestQualityDiagnostics: {
          estimatedSourceTruth: "event_estimate",
          estimatedFormula: "first-party guest/public views",
          estimatedFormulaState: "available",
          estimatedConfidencePct: null,
          estimatedLastUpdatedAtUtc: "2026-02-12T12:00:00.000Z",
          consentedGuestBatchCount: 2,
          guestBatchCount: 2,
          lastGuestBatchAtUtc: "2026-02-12T12:00:00.000Z",
          state: "available",
          missingReason: "",
          nextAction: "Keep monitoring consented guest batches.",
          seriesState: "available",
          seriesExplanation: "Guest quality trend available.",
        },
      },
      guestTraffic: {
        totalViews: 50,
        totalSessions: 0,
        identifiedViews: 10,
        identifiedSessions: 0,
        exactGuestViews: 40,
        exactGuestSessions: 0,
        estimatedGuestViews: 0,
        estimatedGuestSessions: 0,
        truthLabel: "exact",
        sourceLabel: "first_party",
        qualityAvailable: true,
      },
      semanticCategories: [
        semantic({ key: "global", label: "Guest / Public", viewCount: 40, bounceCount: 5 }),
        semantic({ key: "user", label: "Signed-in", viewCount: 10, bounceCount: 1 }),
      ],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.badgeLabel).toBe("Sample");
    expect(model.moduleTruthState).toBe("verified");
    expect(model.guestQuality.state).toBe("available");
  });

  it("keeps refresh-due guest quality samples as cached truth instead of stale truth", () => {
    const model = buildAdminAnalyticsGuestBounceQualityModel({
      selectedRange: "7d",
      response: {
        ...response({
          totalViews: 50,
          totalSessions: 0,
          identifiedViews: 10,
          identifiedSessions: 0,
          exactGuestViews: 40,
          exactGuestSessions: 0,
          estimatedGuestViews: 0,
          estimatedGuestSessions: 0,
          truthLabel: "exact",
          sourceLabel: "first_party",
          qualityAvailable: true,
        }),
        cacheState: "refresh_due",
        staleButVerified: true,
        cacheRevalidating: true,
        generatedAtMs: 1_771_000_000_000,
        guestQualityDiagnostics: {
          estimatedSourceTruth: "event_estimate",
          estimatedFormula: "first-party guest/public views",
          estimatedFormulaState: "available",
          estimatedConfidencePct: null,
          estimatedLastUpdatedAtUtc: "2026-02-12T12:00:00.000Z",
          consentedGuestBatchCount: 2,
          guestBatchCount: 2,
          lastGuestBatchAtUtc: "2026-02-12T12:00:00.000Z",
          state: "available",
          missingReason: "",
          nextAction: "Keep monitoring consented guest batches.",
          seriesState: "available",
          seriesExplanation: "Guest quality trend available.",
        },
      },
      guestTraffic: {
        totalViews: 50,
        totalSessions: 0,
        identifiedViews: 10,
        identifiedSessions: 0,
        exactGuestViews: 40,
        exactGuestSessions: 0,
        estimatedGuestViews: 0,
        estimatedGuestSessions: 0,
        truthLabel: "exact",
        sourceLabel: "first_party",
        qualityAvailable: true,
      },
      semanticCategories: [
        semantic({ key: "global", label: "Guest / Public", viewCount: 40, bounceCount: 5 }),
        semantic({ key: "user", label: "Signed-in", viewCount: 10, bounceCount: 1 }),
      ],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.truthState).toBe("cached");
    expect(model.badgeLabel).toBe("Refresh due");
    expect(model.moduleTruthState).toBe("verified");
    expect(model.estimatedGuestViews.freshnessState).toBe("refresh_due");
    expect(model.signedInBounce.freshnessState).toBe("refresh_due");
    expect(model.summaryFacts).toContain("Signed-in bounce: refresh due sample");
  });

  it("labels estimated guest views and keeps guest quality unavailable without guest batches", () => {
    const model = buildAdminAnalyticsGuestBounceQualityModel({
      selectedRange: "30d",
      response: response({
        totalViews: 20_000,
        totalSessions: 0,
        identifiedViews: 800,
        identifiedSessions: 0,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 19_200,
        estimatedGuestSessions: 0,
        truthLabel: "estimated",
        sourceLabel: "ga_estimate",
        qualityAvailable: false,
      }),
      guestTraffic: {
        totalViews: 20_000,
        totalSessions: 0,
        identifiedViews: 800,
        identifiedSessions: 0,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 19_200,
        estimatedGuestSessions: 0,
        truthLabel: "estimated",
        sourceLabel: "ga_estimate",
        qualityAvailable: false,
      },
      semanticCategories: [
        semantic({ key: "global", label: "Guest / Public", viewCount: 0 }),
      ],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.guestViews.value).toBe(19_200);
    expect(model.guestViewsEstimated).toBe(true);
    expect(model.guestEstimateFormula).toBe("GA total views - identified first-party views");
    expect(model.guestBounce.value).toBeNull();
    expect(model.guestEngaged.value).toBeNull();
    expect(model.guestBounce.fakeZeroPrevented).toBe(true);
    expect(model.visibleCopy).toContain("Guest views are estimated");
    expect(model.chartCollapsedBecauseEmpty).toBe(true);
  });

  it("does not show signed-in bounce as zero without a denominator", () => {
    const model = buildAdminAnalyticsGuestBounceQualityModel({
      selectedRange: "7d",
      response: response({
        totalViews: 0,
        totalSessions: 0,
        identifiedViews: 0,
        identifiedSessions: 0,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 0,
        estimatedGuestSessions: 0,
        truthLabel: "exact",
        sourceLabel: "first_party",
        qualityAvailable: true,
      }),
      guestTraffic: {
        totalViews: 0,
        totalSessions: 0,
        identifiedViews: 0,
        identifiedSessions: 0,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 0,
        estimatedGuestSessions: 0,
        truthLabel: "exact",
        sourceLabel: "first_party",
        qualityAvailable: true,
      },
      semanticCategories: [
        semantic({ key: "user", label: "Signed-in", viewCount: 0, bounceCount: 0 }),
      ],
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.signedInBounce.value).toBeNull();
    expect(model.signedInBounce.fakeZeroPrevented).toBe(true);
    expect(model.signedInBounce.unavailableReason).toBe("Signed-in bounce has no valid visit sample.");
    expect(model.badgeLabel).toBe("No sample");
  });
});
