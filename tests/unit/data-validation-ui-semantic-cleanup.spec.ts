import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("shows stale cache mechanics as refresh due instead of live truth", () => {
    const component = readFileSync(
      join(process.cwd(), "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx"),
      "utf8",
    );

    expect(component).toContain("cacheDisplayState(panelState.cacheState)");
    expect(component).toContain("cacheTruthState(panelState.cacheState)");
    expect(component).toContain("REFRESH DUE");
    expect(component).not.toContain('panelState.cacheState === "stale" ? "STALE"');
  });

  it("formats analytics source states for humans while preserving data attributes", () => {
    const component = readFileSync(
      join(process.cwd(), "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx"),
      "utf8",
    );

    expect(component).toContain("function formatAnalyticsSourceState");
    expect(component).toContain('if (status === "failed" || status === "fail" || status === "source_disagreement") return "needs repair";');
    expect(component).toContain('data-analytics-source-agreement-state');
    expect(component).not.toContain('<Pill label="Source agreement" value={semanticSummary.sourceAgreement.state}');
    expect(component).not.toContain('<p><span className="font-semibold text-white">Source agreement:</span> {analyticsSourceHealth.sourceAgreement.state}');
  });
});
