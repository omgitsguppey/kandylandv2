import { describe, expect, it } from "vitest";

import {
  buildDebugEvidencePrecatcherRefreshReport,
  validateDebugEvidencePrecatcherRefreshReport,
} from "../../scripts/agent/debug-cockpit-batch12-shared";

describe("debug evidence and pre-catcher refresh cleanup", () => {
  it("classifies zero-finding debug evidence and pre-catcher artifacts as current source-checked reports", () => {
    const report = buildDebugEvidencePrecatcherRefreshReport();

    expect(report.debugEvidenceStatusAfter).toBe("clean_current");
    expect(report.precatcherStatusAfter).toBe("clean_current");
    expect(report.debugEvidenceAgeAfter).toBeLessThanOrEqual(72);
    expect(report.precatcherAgeAfter).toBeLessThanOrEqual(72);
    expect(report.productionReadsRequired).toBe(false);
    expect(report.findingsZeroUnknownAfter).toBe(false);
    expect(validateDebugEvidencePrecatcherRefreshReport(report)).toEqual([]);
  });
});
