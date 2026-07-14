import { describe, expect, it } from "vitest";

import {
  buildOrphanedLogicRefreshReport,
  resolveDuplicateNormalizerCount,
  validateOrphanedLogicRefreshReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";

describe("orphaned logic refresh", () => {
  it("refreshes the orphaned logic artifact and keeps findings actionable", () => {
    const report = buildOrphanedLogicRefreshReport();

    expect(report.statusAfter).toBe("refreshed_current");
    expect(report.ageAfter).toBeLessThanOrEqual(72);
    expect(report.sourceHeadMatchesCurrent).toBe(true);
    expect(report.duplicateNormalizerCount).toBe(0);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "route_inline_business_logic",
          owner: "src/lib/server/",
          nextAction: expect.stringContaining("canonical server service owner"),
        }),
      ]),
    );
    expect(validateOrphanedLogicRefreshReport(report)).toEqual([]);
  });

  it("keeps a valid zero distinct from missing or malformed category counts", () => {
    expect(resolveDuplicateNormalizerCount({ categoryCounts: {} })).toBe(0);
    expect(resolveDuplicateNormalizerCount(null)).toBeNull();
    expect(resolveDuplicateNormalizerCount({})).toBeNull();
    expect(resolveDuplicateNormalizerCount({ categoryCounts: [] })).toBeNull();
    expect(resolveDuplicateNormalizerCount({ categoryCounts: { duplicate_normalizer: "0" } })).toBeNull();

    const report = buildOrphanedLogicRefreshReport();
    expect(validateOrphanedLogicRefreshReport({
      ...report,
      duplicateNormalizerCount: null,
    })).toContain("orphaned logic category counts are missing or malformed.");
  });
});
