import { describe, expect, it } from "vitest";

import {
  buildOpenBacklogStatusCleanupReport,
  validateOpenBacklogStatusCleanupReport,
} from "../../scripts/agent/chat-cost-status-cleanup-shared";

describe("open backlog status cleanup", () => {
  it("keeps zero open backlog current without stale or fixable noise", () => {
    const report = buildOpenBacklogStatusCleanupReport();

    expect(validateOpenBacklogStatusCleanupReport(report)).toEqual([]);
    expect(report.statusAfter).toBe("runtime_sample_proven_zero");
    expect(report.scoreImpactAfter).toBe("none");
    expect(report.refreshCommand).toBe("npm run check:debug-backlog-engine");
  });
});

