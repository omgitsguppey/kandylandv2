import { describe, expect, it } from "vitest";

import { classifyTaskUserCreatorIntakeLane } from "../../scripts/agent/ops-health-cleanup-shared";

describe("task user and creator intake status cleanup", () => {
  it("does not mark zero-issue lanes healthy without source freshness", () => {
    expect(classifyTaskUserCreatorIntakeLane({ issueCount: 0, warningCount: 0, sourceWindowCurrent: false, sampleLoaded: false })).toBe("source_ready_no_sample_loaded");
    expect(classifyTaskUserCreatorIntakeLane({ issueCount: 0, warningCount: 0, sourceWindowCurrent: true, sampleLoaded: true })).toBe("healthy_current");
  });
});
