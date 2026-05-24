import { describe, expect, it } from "vitest";

import {
  buildChatGatingStatusCleanupReport,
  validateChatGatingStatusCleanupReport,
} from "../../scripts/agent/chat-cost-status-cleanup-shared";

describe("chat gating status cleanup", () => {
  it("keeps paid-GD source config healthy while runtime counters collect", () => {
    const report = buildChatGatingStatusCleanupReport();

    expect(validateChatGatingStatusCleanupReport(report)).toEqual([]);
    expect(report.configStatusAfter).toBe("config_healthy_current");
    expect(report.runtimeSampleStatusAfter).toBe("source_ready_collecting");
    expect(report.sourceOfFundsTruthStatus).toBe("purchased_only_enforced");
    expect(report.rewardFreeGdAccepted).toBe(false);
  });
});

