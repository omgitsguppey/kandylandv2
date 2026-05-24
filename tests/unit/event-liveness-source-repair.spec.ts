import { describe, expect, it } from "vitest";

import {
  buildEventLivenessSourceRepairReport,
  validateEventLivenessSourceRepairReport,
} from "../../scripts/agent/validate-event-liveness-source-repair";

describe("event liveness source repair", () => {
  it("turns expected-live sourceMissing events into actionable source map groups", () => {
    const report = buildEventLivenessSourceRepairReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.sourceMissingBefore).toBeGreaterThan(0);
    expect(report.sourceMissingActionableGroups.length).toBeGreaterThan(0);
    expect(report.quietFutureIncludesExpectedLive).toBe(false);
    expect(report.expectedLiveSourceMap.every((entry) => entry.producer && entry.lastSeenSourceStatus)).toBe(true);
    expect(validateEventLivenessSourceRepairReport(report)).toEqual([]);
  });
});
