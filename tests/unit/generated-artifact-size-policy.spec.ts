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
    expect(report.reportCompleteness).toBe("complete");
    expect(report.cleanupPolicy).toBe("regenerate");
    expect(report.sourceTruthRole).toBe("generated_snapshot");
    expect(report.gitStatus === "available" || report.gitStatus === "missing").toBe(true);
    expect(report.highRiskCounts.sourceTruth).toBe(report.oversizedArtifacts.length);
    expect(report.oversizedArtifacts.every((artifact) => artifact.justification.length > 0)).toBe(true);
    expect(report.oversizedArtifacts.every((artifact) => artifact.classification !== "unsafe_unknown")).toBe(true);
    expect(validation.ok).toBe(true);
  });
});
