import { describe, expect, it } from "vitest";

import {
  buildQaHarnessConsolidationReport,
  validateQaHarnessConsolidationReport,
} from "../../src/lib/test-hardening/qa-harness-map";
import { classifyMockEvidence } from "../../src/lib/testing/mock-evidence-classifier";

describe("QA harness consolidation", () => {
  it("classifies QA harness proof boundaries and owners", () => {
    const report = buildQaHarnessConsolidationReport();
    const validation = validateQaHarnessConsolidationReport(report);

    expect(report.harnessesAudited).toBeGreaterThan(5);
    expect(report.harnesses.some((harness) => harness.packageScript === "score:beta")).toBe(true);
    expect(report.harnesses.every((harness) => harness.productionReadsForbidden)).toBe(true);
    expect(report.duplicateHarnessesUnclassified).toBe(0);
    expect(validation.ok).toBe(true);
  });

  it("prevents mock evidence from clearing real proof gates", () => {
    const sourceOnly = classifyMockEvidence("source_only");
    const providerLike = classifyMockEvidence("provider_like");

    expect(sourceOnly.canClearRuntimeGate).toBe(false);
    expect(sourceOnly.canClearProviderGate).toBe(false);
    expect(providerLike.canClaimActualProviderProof).toBe(false);
  });
});
