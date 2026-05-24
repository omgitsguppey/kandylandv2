import { describe, expect, it } from "vitest";

import {
  buildOrphanedLogicRefreshReport,
  validateOrphanedLogicRefreshReport,
} from "../../scripts/agent/debug-cockpit-batch14-shared";

describe("orphaned logic refresh", () => {
  it("refreshes the orphaned logic artifact and keeps findings actionable", () => {
    const report = buildOrphanedLogicRefreshReport();

    expect(report.statusAfter).toBe("refreshed_current");
    expect(report.ageAfter).toBeLessThanOrEqual(72);
    expect(report.sourceHeadMatchesCurrent).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "realtime_hot_cache",
          owner: "admin-analytics",
          nextAction: expect.stringContaining("hot-cache"),
        }),
        expect.objectContaining({
          category: "telemetry_duplicate_intent",
          owner: "telemetry",
          nextAction: expect.stringContaining("alias"),
        }),
      ]),
    );
    expect(validateOrphanedLogicRefreshReport(report)).toEqual([]);
  });
});
