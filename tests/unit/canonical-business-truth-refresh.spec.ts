import { describe, expect, it } from "vitest";

import { buildCanonicalBusinessTruthRefreshReport, validateCanonicalBusinessTruthRefreshReport } from "../../scripts/agent/business-truth-recovery-shared";

describe("canonical business truth refresh", () => {
  it("audits bounded snapshot sources without raw production reads or page-time watch metrics", () => {
    const report = buildCanonicalBusinessTruthRefreshReport({
      currentHead: "head-current",
      confidenceScore: 74,
      sourceFreshness: "stale",
    });

    expect(validateCanonicalBusinessTruthRefreshReport(report)).toEqual([]);
    expect(report.refreshPolicy).toBe("bounded_snapshot_only");
    expect(report.productionReadRequired).toBe(false);
    expect(report.metricSources.watch.sourceClass).toBe("valid_watch_time");
    expect(report.metricSources.watch.canUsePageTime).toBe(false);
    expect(report.metricSources.revenue.sourceClass).toBe("operator_confirmed_provider_formal_missing");
    expect(report.nextExactSteps).toContain("Refresh admin truth source sample with npm run check:admin-truth-source-sample.");
  });
});
