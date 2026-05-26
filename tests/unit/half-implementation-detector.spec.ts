import { describe, expect, it } from "vitest";

import { buildHalfImplementationDetectorReport, validateHalfImplementationDetectorReport } from "@/lib/release-readiness/half-implementation-detector";

describe("half implementation detector", () => {
  it("does not allow missing release-critical validator/test/package wiring", () => {
    const report = buildHalfImplementationDetectorReport(process.cwd());
    expect(report.releaseCriticalFindings).toEqual([]);
    expect(validateHalfImplementationDetectorReport(report)).toEqual([]);
  }, 120000);
});
