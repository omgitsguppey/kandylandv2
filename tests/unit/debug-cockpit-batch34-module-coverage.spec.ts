import { describe, expect, it } from "vitest";

import batch34Report from "../../agent/state/debug-cockpit-batch34-module-coverage.generated.json";

describe("Debug Cockpit Batch 34 module coverage lock", () => {
  it("reports module coverage policy repair without pretending historical gaps are backfilled", () => {
    expect(batch34Report).toMatchObject({
      totalModules: 14,
      verifiedBefore: 4,
      partialBefore: 4,
      emptyBefore: 6,
      requiredGapsBefore: 7,
      optionalGapsBefore: 3,
      parityScoreBefore: 58,
      ga4RequirementPolicyStatus: "ga4_optional_or_external_for_internal_modules",
      optionalBlockingStatus: "optional_gaps_nonblocking",
    });
    expect(batch34Report.verifiedAfter).toBeGreaterThan(batch34Report.verifiedBefore);
    expect(batch34Report.requiredGapsAfter).toBeLessThan(batch34Report.requiredGapsBefore);
    expect(batch34Report.modulesChanged).toEqual(
      expect.arrayContaining(["daily_tasks", "task_guidance", "admin", "runtime", "unlock_watch"]),
    );
    expect(batch34Report.modulesStillBlocked).toContain("navigation");
    expect(batch34Report.remainingGaps).toContain("Navigation remains blocked until page view, route runtime, or page rollup evidence lands for the selected range.");
  });
});
