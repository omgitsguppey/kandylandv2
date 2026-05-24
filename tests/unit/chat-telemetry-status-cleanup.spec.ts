import { describe, expect, it } from "vitest";

import {
  buildChatTelemetryStatusCleanupReport,
  validateChatTelemetryStatusCleanupReport,
} from "../../scripts/agent/chat-cost-status-cleanup-shared";

describe("chat telemetry status cleanup", () => {
  it("keeps telemetry contract healthy while all-zero runtime samples collect", () => {
    const report = buildChatTelemetryStatusCleanupReport();

    expect(validateChatTelemetryStatusCleanupReport(report)).toEqual([]);
    expect(report.contractStatusAfter).toBe("config_healthy_current");
    expect(report.runtimeSampleStatusAfter).toBe("source_ready_collecting");
    expect(report.transcriptGuardStatus).toBe("config_healthy_current");
    expect(report.rawDefault).toBe(false);
  });
});

