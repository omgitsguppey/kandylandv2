import { describe, expect, it } from "vitest";

import { classifyUnlockWatchJourneyNormalization } from "@/lib/behavioral/unlock-watch-journey-normalization";

describe("unlock/watch journey normalization", () => {
  it("keeps watch sessions while marking missing viewer start as an attribution gap", () => {
    const result = classifyUnlockWatchJourneyNormalization({
      unlockTransactionCount: 47,
      serverUnlockTelemetryCount: 0,
      viewerStartEventCount: 0,
      watchSessionCount: 200,
      uniqueJourneyKeys: ["unlock:tx-1", "watch:watch-1"],
      rawPrivateContentFields: [],
    });

    expect(result.watchSessionsDropped).toBe(false);
    expect(result.attributionGaps).toContain("missing_viewer_start");
    expect(result.state).toBe("fail");
  });
});
