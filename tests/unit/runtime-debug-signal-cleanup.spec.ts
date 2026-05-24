import { describe, expect, it } from "vitest";

import {
  buildRuntimeDebugSignalCleanupReport,
  validateRuntimeDebugSignalCleanupReport,
} from "../../scripts/agent/validate-runtime-debug-signal-cleanup";

describe("runtime debug signal cleanup", () => {
  it("classifies failed signals and groups warnings instead of exposing raw warning rows", () => {
    const report = buildRuntimeDebugSignalCleanupReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test-head",
    });

    expect(report.rawWarningsDefaultVisible).toBe(false);
    expect(report.failedSignals.every((signal) => signal.classification)).toBe(true);
    expect(report.warningGroups.length).toBeLessThanOrEqual(report.rawWarningCount);
    expect(validateRuntimeDebugSignalCleanupReport(report)).toEqual([]);
  });
});
