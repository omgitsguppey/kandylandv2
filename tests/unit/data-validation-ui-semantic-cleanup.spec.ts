import { describe, expect, it } from "vitest";

import { buildDataValidationUiSemantics } from "@/lib/analytics/validation-readiness-contract";

describe("data validation UI semantic cleanup", () => {
  it("surfaces four compact dimensions and keeps raw rows collapsed", () => {
    const semantics = buildDataValidationUiSemantics({
      chartReadinessState: "ready",
      sourceAgreementState: "fail",
      validationParityState: "fail",
      blockedPassCount: 10,
      routeLoadedSuccessfully: true,
      failedRows: ["source_agreement_chart_readiness"],
      cacheState: "miss",
    });

    expect(semantics.summaryPills.map((pill) => pill.label)).toEqual([
      "Chart readiness",
      "Source agreement",
      "Validation parity",
      "Blocked pass",
    ]);
    expect(semantics.rawRowsDefaultOpen).toBe(false);
    expect(semantics.cacheMissIsFailure).toBe(false);
    expect(semantics.nextAction).toMatch(/Source agreement/i);
    expect(semantics.nextAction).not.toMatch(/^Retry/i);
  });
});
