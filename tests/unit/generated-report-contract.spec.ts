import { describe, expect, it } from "vitest";

import { deriveGeneratedReportFreshness } from "@/lib/generated-reports/generated-report-contract";

describe("generated report contract", () => {
  it("treats current-head mismatches as stale even inside the age window", () => {
    const freshness = deriveGeneratedReportFreshness({
      generatedAt: "2026-06-11T12:00:00.000Z",
      nowMs: Date.parse("2026-06-11T13:00:00.000Z"),
      sourceCommit: "old-head",
      currentHead: "new-head",
    });

    expect(freshness).toBe("stale");
  });

  it("keeps same-head generated reports fresh within the freshness window", () => {
    const freshness = deriveGeneratedReportFreshness({
      generatedAt: "2026-06-11T12:00:00.000Z",
      nowMs: Date.parse("2026-06-11T13:00:00.000Z"),
      sourceCommit: "same-head",
      currentHead: "same-head",
    });

    expect(freshness).toBe("fresh");
  });
});
