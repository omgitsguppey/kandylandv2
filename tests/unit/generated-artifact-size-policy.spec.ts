import { describe, expect, it } from "vitest";

import {
  buildGeneratedArtifactSizePolicyReport,
  validateGeneratedArtifactSizePolicyReport,
} from "../../src/lib/test-hardening/generated-artifact-size-policy";

describe("generated artifact size policy", () => {
  it("keeps new test-hardening artifacts compact and classifies oversized legacy reports", () => {
    const report = buildGeneratedArtifactSizePolicyReport();
    const validation = validateGeneratedArtifactSizePolicyReport(report);

    expect(report.generatedArtifactsAudited).toBeGreaterThan(50);
    expect(report.defaultMaxLines).toBe(500);
    expect(report.defaultMaxBytes).toBe(250000);
    expect(report.oversizedArtifacts.some((artifact) => artifact.artifactPath.endsWith("product-body-map.generated.json"))).toBe(true);
    expect(report.oversizedArtifacts.every((artifact) => artifact.classification !== "unsafe_unknown")).toBe(true);
    expect(validation.ok).toBe(true);
  });
});
