import { describe, expect, it } from "vitest";

import {
  buildFutureActivityCatalogStatusCleanupReport,
  validateFutureActivityCatalogStatusCleanupReport,
} from "../../scripts/agent/chat-cost-status-cleanup-shared";

describe("future activity catalog status cleanup", () => {
  it("keeps quiet future catalog collapsed and non-degraded", () => {
    const report = buildFutureActivityCatalogStatusCleanupReport();

    expect(validateFutureActivityCatalogStatusCleanupReport(report)).toEqual([]);
    expect(report.statusAfter).toBe("quiet_catalog_current");
    expect(report.warningSeverity).toBe(false);
    expect(report.rawRowsDefaultOpen).toBe(false);
    expect(report.expectedLiveEventsInQuietCatalog).toBe(0);
  });
});

