import { describe, expect, it } from "vitest";

import {
  buildIdentityHandoffStatusCleanupReport,
  validateIdentityHandoffStatusCleanupReport,
} from "../../scripts/agent/tracking-runtime-surface-status-cleanup-shared";

describe("identity handoff status cleanup", () => {
  it("reclassifies source-present missing samples away from LIVE unknown", () => {
    const report = buildIdentityHandoffStatusCleanupReport({ sourcePresent: true, runtimeSampleLoaded: false });

    expect(validateIdentityHandoffStatusCleanupReport(report)).toEqual([]);
    expect(report.identityStatusBefore).toBe("live_unknown");
    expect(report.identityStatusAfter).toBe("source_ready_collecting");
    expect(report.lanes.every((lane) => lane.status !== "unknown")).toBe(true);
  });
});
