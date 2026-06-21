import { describe, expect, it } from "vitest";

import { classifyCanonicalBusinessTruthStatus } from "@/lib/debug/canonical-business-truth-status";

describe("canonical business truth status", () => {
  it("keeps stale low-confidence business truth actionable without degrading ops health", () => {
    const result = classifyCanonicalBusinessTruthStatus({
      generatedAt: Date.now() - 18 * 60_000,
      sourceFreshness: "stale",
      sourceTruth: "canonical",
      confidenceScore: 74,
      issues: [{ code: "stale_inputs", severity: "warn", message: "Snapshot source inputs are stale." }],
      totalUsers: 864,
      verifiedPurchases: 67,
      totalRevenueUsd: 573,
      trackedUnwraps: 210,
      validWatchTimeMs: 21 * 60_000,
      formalAdminSampleStatus: "missing_formal_artifact",
      operatorConfirmedPayment: true,
      formalProviderGateCleared: false,
      watchTimeSource: "valid_watch_time",
    });

    expect(result.status).toBe("low_confidence_review");
    expect(result.opsHealthInherited).toBe(false);
    expect(result.freshnessCause).toBe("stale source inputs");
    expect(result.freshnessExplanation).toContain("source inputs stale");
    expect(result.refreshCommand).toBe("npm run check:admin-truth-source-sample");
    expect(result.revenueSourceClass).toBe("operator_confirmed_provider_formal_missing");
    expect(result.purchaseSourceClass).toBe("operator_confirmed_provider_formal_missing");
    expect(result.watchSourceClass).toBe("valid_watch_time");
    expect(result.watchMetricCanUsePageTime).toBe(false);
    expect(result.nextAction).toContain("admin source activity sample");
    expect(result.nextAction).not.toMatch(/first-party admin truth|formal gate|manual proof|screenshot proof/iu);
  });

  it("keeps admin sample compatibility status while rendering typed evidence gate copy", () => {
    const result = classifyCanonicalBusinessTruthStatus({
      generatedAt: Date.now() - 10 * 60_000,
      sourceFreshness: "current",
      sourceTruth: "canonical",
      confidenceScore: 92,
      totalUsers: 864,
      verifiedPurchases: 67,
      totalRevenueUsd: 573,
      trackedUnwraps: 210,
      validWatchTimeMs: 21 * 60_000,
      formalAdminSampleStatus: "missing_formal_artifact",
      watchTimeSource: "valid_watch_time",
    });

    expect(result.formalAdminSampleRequired).toBe(true);
    expect(result.freshnessCause).toBe("admin source activity sample missing");
    expect(result.freshnessExplanation).toContain("admin source activity sample evidence");
    expect(result.nextAction).toBe("Produce a redacted admin source activity sample before clearing the typed evidence gate.");
    expect(`${result.freshnessExplanation} ${result.nextAction}`).not.toMatch(/first-party admin truth|formal gate|manual proof|screenshot proof/iu);
  });
});
