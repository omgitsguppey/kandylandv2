import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsRegionDemandModel } from "@/lib/admin-analytics-region-demand";

describe("buildAdminAnalyticsRegionDemandModel", () => {
  it("labels fallback GA geography rows as modeled evidence", () => {
    const model = buildAdminAnalyticsRegionDemandModel({
      selectedRange: "30d",
      loading: false,
      response: {
        generatedAtMs: Date.parse("2026-05-06T12:00:00.000Z"),
        geo: [
          { city: "Austin", country: "United States", users: 7 },
        ],
      },
    });

    expect(model.sourceTruth).toBe("ga4_evidence_only");
    expect(model.freshnessState).toBe("external_evidence_required");
    expect(model.sourceLabel).toBe("Vendor evidence only");
    expect(model.freshnessLabel).toBe("Source evidence required");
    expect(model.truthState).toBe("degraded");
    expect(model.rows[0]).toMatchObject({
      city: "Austin",
      country: "United States",
      rawCount: 7,
      adjustedCount: 7,
      sourceTruth: "ga4_evidence_only",
      evidenceKind: "modeled",
      freshnessState: "external_evidence_required",
      confidenceScore: 58,
      lateArrivalWindowDays: 12,
      productTruthEligible: false,
      missingVsZeroState: "source_present",
    });
    expect(model.rows[0]?.dedupeKey).toContain("launch_recovery|page_view");
  });

  it("keeps zero-count fallback geography rows source-missing", () => {
    const model = buildAdminAnalyticsRegionDemandModel({
      selectedRange: "30d",
      loading: false,
      response: {
        generatedAtMs: Date.parse("2026-05-06T12:00:00.000Z"),
        geo: [
          { city: "Unknown", country: "Unknown", users: 0 },
        ],
      },
    });

    expect(model.sourceTruth).toBe("source_missing");
    expect(model.freshnessState).toBe("source_missing");
    expect(model.truthState).toBe("unavailable");
    expect(model.rows[0]).toMatchObject({
      city: null,
      country: null,
      rawCount: 0,
      sourceTruth: "source_missing",
      evidenceKind: "missing",
      freshnessState: "source_missing",
      confidenceScore: 0,
      productTruthEligible: false,
      missingVsZeroState: "source_missing",
    });
  });
});
