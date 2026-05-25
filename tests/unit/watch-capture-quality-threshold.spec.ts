import { describe, expect, it } from "vitest";

import { classifyWatchCaptureQuality } from "@/lib/analytics/watch-capture-quality-contract";

describe("watch capture quality thresholds", () => {
  it("fails 135 replay-recovered sessions out of 200", () => {
    const result = classifyWatchCaptureQuality({
      watchSessions: 200,
      fullCaptures: 65,
      degradedCaptures: 0,
      replayRecoveredSessions: 135,
      closeMissingSessions: 0,
    });

    expect(result.replayRecoveryRate).toBe(67.5);
    expect(result.state).toBe("fail");
    expect(result.nextAction).toContain("replay recovery");
  });
});
