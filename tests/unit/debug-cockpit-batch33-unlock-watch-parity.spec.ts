import { describe, expect, it } from "vitest";

import batch33Report from "../../agent/state/debug-cockpit-batch33-unlock-watch-parity.generated.json";

describe("Debug Cockpit Batch 33 unlock/watch parity lock", () => {
  it("reports source-ready repairs while preserving historical blockers", () => {
    expect(batch33Report).toMatchObject({
      unlockTransactionsCount: 47,
      canonicalUnlockRollupCountBefore: 145,
      unlockTelemetryCountBefore: 0,
      viewerStartEventsBefore: 0,
      watchSessions: 200,
      sessionFacts: 370,
      replayRecoveredSessions: 135,
      replayRecoveryRate: 67.5,
      gumdropMathChanged: false,
      contentProtectionChanged: false,
    });
    expect(batch33Report.unlockMismatchReasonAfter).not.toBe("unknown");
    expect(batch33Report.watchCaptureStatusAfter).toBe("fail");
    expect(batch33Report.remainingGaps).toContain("Existing historical unlocks and viewer starts still need real future telemetry or an explicit no-mutation recovery plan; this batch does not backfill production.");
  });
});
