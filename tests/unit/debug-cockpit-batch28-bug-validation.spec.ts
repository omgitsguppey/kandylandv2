import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch28BugValidationReport } from "@/lib/debug/debug-cockpit-batch28-bug-validation";

describe("Debug Cockpit Batch 28 bug validation final lock", () => {
  it("reports terminal bug truth and split validation dimensions", () => {
    const report = buildDebugCockpitBatch28BugValidationReport({
      bugReportTruthStatusBefore: "loading",
      bugReportTerminalState: "loaded_empty",
      dataValidationStatusBefore: "failed",
      chartReadinessStatus: "ready",
      sourceAgreementStatus: "fail",
      validationParityStatus: "fail",
      blockedPassCount: 10,
      failedValidationRows: ["source_agreement_chart_readiness"],
      failedSourceAgreementSources: ["ga4", "historical_snapshot", "legacy_support"],
      cacheState: "miss",
      lastValidatedAtUtc: "2026-05-24T15:21:00.000Z",
    });

    expect(report.bugReportTruthStatusAfter).toBe("loaded_empty");
    expect(report.bugReportRedactionStatus).toBe("summary_only_raw_bodies_redacted");
    expect(report.dataValidationStatusAfter).toBe("failed_semantic_split");
    expect(report.chartReadinessStatus).toBe("ready");
    expect(report.sourceAgreementStatus).toBe("fail");
    expect(report.rawRowsDefaultOpen).toBe(false);
    expect(report.scoreDimensions).toContain("chartReadinessSourceAgreementSplit");
    expect(report.nextExactSteps.join(" ")).toMatch(/blocked pass/i);
  });
});
