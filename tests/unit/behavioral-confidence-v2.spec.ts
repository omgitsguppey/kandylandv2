import { describe, expect, it } from "vitest";

import { computeBehavioralConfidenceV2 } from "@/lib/behavioral/behavioral-confidence-v2";

describe("behavioral confidence v2 caps", () => {
  it("caps guest-only confidence at 0.45", () => {
    const result = computeBehavioralConfidenceV2({
      sourceReliabilityMax: 1,
      lineage: "guest_only",
      sampleCount: 400,
      ageMs: 0,
      maxFreshnessMs: 1000 * 60 * 60 * 24,
      requiredFieldsPresent: 50,
      requiredFieldsTotal: 50,
      outcomeValidation: "validated",
      hasServerOrCanonicalTruth: true,
    });
    expect(result.confidence).toBeLessThanOrEqual(0.45);
  });

  it("caps legacy-only confidence at 0.30", () => {
    const result = computeBehavioralConfidenceV2({
      sourceReliabilityMax: 1,
      lineage: "legacy_only",
      sampleCount: 400,
      ageMs: 0,
      maxFreshnessMs: 1000 * 60 * 60 * 24,
      requiredFieldsPresent: 50,
      requiredFieldsTotal: 50,
      outcomeValidation: "validated",
      hasServerOrCanonicalTruth: true,
    });
    expect(result.confidence).toBeLessThanOrEqual(0.30);
  });

  it("caps no-outcome confidence at 0.60", () => {
    const result = computeBehavioralConfidenceV2({
      sourceReliabilityMax: 1,
      lineage: "identified_user",
      sampleCount: 400,
      ageMs: 0,
      maxFreshnessMs: 1000 * 60 * 60 * 24,
      requiredFieldsPresent: 50,
      requiredFieldsTotal: 50,
      outcomeValidation: "none",
      hasServerOrCanonicalTruth: true,
    });
    expect(result.confidence).toBeLessThanOrEqual(0.60);
  });
});
