import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch5CleanupReport,
  validateDebugCockpitBatch5CleanupReport,
} from "../../scripts/agent/chat-cost-status-cleanup-shared";

describe("debug cockpit batch5 cleanup", () => {
  it("locks chat cost backlog and future catalog status truth", () => {
    const report = buildDebugCockpitBatch5CleanupReport();

    expect(validateDebugCockpitBatch5CleanupReport(report)).toEqual([]);
    expect(report.emptyLiveLanesAfter).toBe(0);
    expect(report.staleBadgeConflictsAfter).toBe(0);
    expect(report.configHealthyCurrentLanes).toEqual(expect.arrayContaining([
      "chat_gating_config",
      "chat_telemetry_contract",
      "cost_guard_config",
    ]));
    expect(report.sourceReadyCollectingLanes).toEqual(expect.arrayContaining([
      "chat_gating_runtime",
      "chat_telemetry_runtime",
    ]));
  });
});

