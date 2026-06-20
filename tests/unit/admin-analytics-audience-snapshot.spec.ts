import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsAudienceSnapshotModel } from "@/lib/admin-analytics-audience-snapshot";
import type { HistoricalAnalyticsResponse } from "@/types/admin-analytics";

describe("buildAdminAnalyticsAudienceSnapshotModel", () => {
  it("delegates guest product-truth eligibility to the recovery spine", () => {
    const source = readFileSync("src/lib/admin-analytics-audience-snapshot.ts", "utf8");

    expect(source).toContain("productTruthEligible: guestTrafficRecoveryMetric.productTruthEligible");
    expect(source).not.toContain('productTruthEligible: guestTrafficRecoveryMetric.sourceTruth === "first_party_event_fact"');
  });

  it("labels GA users and estimated guest visits without fake zeros", () => {
    const response: HistoricalAnalyticsResponse = {
      success: true,
      generatedAtMs: 1_771_000_000_000,
      cacheState: "fresh",
      totals: {
        users: 1200,
        views: 1800,
        sessions: 1300,
        newUsers: 900,
        avgSessionDuration: 31,
        engagementRate: 0.23,
      },
      guestTraffic: {
        totalViews: 1800,
        totalSessions: 1300,
        identifiedViews: 400,
        identifiedSessions: 250,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 1400,
        estimatedGuestSessions: 1050,
        truthLabel: "estimated",
        sourceLabel: "ga_total_minus_identified_first_party",
        qualityAvailable: false,
      },
    };

    const model = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "30d",
      response,
      loading: false,
      overviewTruthState: "live",
    });

    expect(model.totalUsers.label).toBe("GA4 users | selected range");
    expect(model.totalUsersSource).toBe("ga_total");
    expect(model.guestVisits.label).toBe("Estimated guest visits");
    expect(model.guestEstimateFormulaUsed).toBe(true);
    expect(model.guestEstimateClamped).toBe(false);
    expect(model.guestEstimateMetadata.canonicalSourceTruth).toBe("ga4_evidence_only");
    expect(model.guestEstimateMetadata.evidenceKind).toBe("modeled");
    expect(model.guestEstimateMetadata.sourceFreshnessState).toBe("external_evidence_required");
    expect(model.guestEstimateMetadata.productTruthEligible).toBe(false);
    expect(model.guestEstimateMetadata.missingVsZeroState).toBe("source_present");
    expect(model.guestEstimateMetadata.dedupeKey).toContain("launch_recovery|page_view");
    expect(model.guestEstimateMetadata.lateArrivalWindowDays).toBe(12);
    expect(model.fakeZeroPrevented).toBe(false);
    expect(model.chartSeries[0]).toMatchObject({
      key: "users",
      stroke: "#ffffff",
    });
  });

  it("prevents fake zero and reports clamped guest estimates", () => {
    const response: HistoricalAnalyticsResponse = {
      success: true,
      totals: {
        users: 10,
        views: 5,
        sessions: 4,
        newUsers: 1,
        avgSessionDuration: 12,
        engagementRate: 0.1,
      },
      guestTraffic: {
        totalViews: 5,
        totalSessions: 4,
        identifiedViews: 7,
        identifiedSessions: 5,
        exactGuestViews: 0,
        exactGuestSessions: 0,
        estimatedGuestViews: 0,
        estimatedGuestSessions: 0,
        truthLabel: "estimated",
        sourceLabel: "ga_total_minus_identified_first_party",
        qualityAvailable: false,
      },
    };

    const clamped = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "7d",
      response,
      loading: false,
    });
    const waiting = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "7d",
      loading: true,
    });

    expect(clamped.guestEstimateClamped).toBe(true);
    expect(clamped.guestEstimateWarning).toContain("clamped");
    expect(waiting.totalUsers.value).toBeNull();
    expect(waiting.totalUsers.label).toBe("Waiting for audience snapshot");
    expect(waiting.fakeZeroPrevented).toBe(true);
  });

  it("marks missing audience snapshots as unavailable instead of stale cached truth", () => {
    const model = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "7d",
      loading: false,
    });

    expect(model.sourceState).toBe("missing");
    expect(model.totalUsers.truthState).toBe("unavailable");
    expect(model.guestVisits.truthState).toBe("unavailable");
    expect(model.guestEstimateMetadata.canonicalSourceTruth).toBe("source_missing");
    expect(model.guestEstimateMetadata.evidenceKind).toBe("missing");
    expect(model.guestEstimateMetadata.sourceFreshnessState).toBe("source_missing");
    expect(model.guestEstimateMetadata.missingVsZeroState).toBe("source_missing");
    expect(model.fakeZeroPrevented).toBe(true);
    expect(model.visibleCopy).toContain("Audience snapshot unavailable.");
  });

  it("keeps refresh-due audience cache as cached truth with refresh metadata", () => {
    const response: HistoricalAnalyticsResponse = {
      success: true,
      generatedAtMs: 1_771_000_000_000,
      cacheState: "refresh_due",
      staleButVerified: true,
      totals: {
        users: 1200,
        views: 1800,
        sessions: 1300,
        newUsers: 900,
        avgSessionDuration: 31,
        engagementRate: 0.23,
      },
      guestTraffic: {
        totalViews: 1800,
        totalSessions: 1300,
        identifiedViews: 400,
        identifiedSessions: 250,
        exactGuestViews: 1400,
        exactGuestSessions: 1050,
        estimatedGuestViews: 0,
        estimatedGuestSessions: 0,
        truthLabel: "exact",
        sourceLabel: "analytics_guest_batches",
        qualityAvailable: true,
      },
    };

    const model = buildAdminAnalyticsAudienceSnapshotModel({
      selectedRange: "30d",
      response,
      loading: false,
    });

    expect(model.sourceState).toBe("verified");
    expect(model.guestEstimateMetadata.freshnessState).toBe("refresh_due");
    expect(model.guestEstimateMetadata.canonicalSourceTruth).toBe("first_party_event_fact");
    expect(model.guestEstimateMetadata.evidenceKind).toBe("observed");
    expect(model.guestEstimateMetadata.productTruthEligible).toBe(true);
    expect(model.guestVisits.truthState).toBe("cached");
    expect(model.totalUsers.truthState).toBe("cached");
    expect(model.backendCacheStatus).toBe("refresh_due");
  });
});
