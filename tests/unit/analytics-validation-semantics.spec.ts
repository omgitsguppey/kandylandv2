import { describe, expect, it } from "vitest";

import { buildValidationReadinessSummary } from "@/lib/analytics/validation-readiness-contract";

describe("analytics validation semantics", () => {
  it("keeps chart readiness separate from source agreement and parity failures", () => {
    const summary = buildValidationReadinessSummary({
      chartReadiness: {
        availability: "pass",
        continuity: "none",
        missingDays: [],
        recentGaps: [],
      },
      sourceAgreement: {
        sources: ["ga4", "historical_snapshot", "legacy_support"],
        failedSources: ["ga4", "historical_snapshot", "legacy_support"],
        reason: "Day-bucket coverage disagrees.",
      },
      validations: [
        { checkKey: "source_agreement_chart_readiness", status: "fail", passAllowed: false, passBlockedReason: "source agreement failed" },
      ],
    });

    expect(summary.chartReadiness.state).toBe("source_disagreement");
    expect(summary.sourceAgreement.state).toBe("failed");
    expect(summary.validationParity.state).toBe("fail");
    expect(summary.blockedPass.rows).toHaveLength(1);
    expect(summary.nextAction).toMatch(/source agreement/i);
    expect(summary.nextAction).not.toMatch(/^Retry the validation route/i);
  });
});
