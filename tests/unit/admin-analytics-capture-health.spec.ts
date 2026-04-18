import { describe, expect, it } from "vitest";

import { buildWatchCaptureHealthSummary } from "@/lib/server/admin-analytics-capture-health";

type MockDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

function mockDoc(id: string, data: Record<string, unknown>): FirebaseFirestore.QueryDocumentSnapshot {
  return {
    id,
    data: () => data,
  } as FirebaseFirestore.QueryDocumentSnapshot;
}

describe("buildWatchCaptureHealthSummary", () => {
  it("summarizes degraded and replay-recovered watch sessions from canonical docs", () => {
    const summary = buildWatchCaptureHealthSummary({
      watchSessionDocs: [
        mockDoc("watch_1", {
          watchSessionId: "watch_1",
          lastSeenAtMs: 1_000,
          captureTransport: "fetch",
          replayRecovered: false,
          replayRecoveredCount: 0,
          flushFailureCount: 0,
          gapCount: 0,
          hiddenDurationSeconds: 3,
          isClosed: true,
          closeReason: "manual_close",
        }),
        mockDoc("watch_2", {
          watchSessionId: "watch_2",
          lastSeenAtMs: 2_000,
          captureTransport: "replay_fetch",
          replayRecovered: true,
          replayRecoveredCount: 1,
          flushFailureCount: 1,
          gapCount: 2,
          maxGapMs: 8_500,
          hiddenDurationSeconds: 9,
          isClosed: false,
          closeReason: null,
        }),
      ],
      watchAssetDocs: [
        mockDoc("asset_1", {
          watchSessionId: "watch_1",
          waitingDurationSeconds: 4,
          seekCount: 1,
          playbackRateAverage: 1,
          mutedSampleCount: 0,
        }),
        mockDoc("asset_2", {
          watchSessionId: "watch_2",
          waitingDurationSeconds: 10,
          seekCount: 3,
          playbackRateAverage: 1.5,
          mutedSampleCount: 2,
        }),
      ],
    });

    expect(summary).toMatchObject({
      sessionCount: 2,
      fullCaptureCount: 1,
      degradedSessionCount: 1,
      replayRecoveredCount: 1,
      gapDetectedCount: 1,
      flushDegradedCount: 1,
      closeMissingCount: 1,
      averageGapMs: 8500,
      averageHiddenSeconds: 6,
      averageWaitSeconds: 7,
      averageSeekCount: 2,
      averagePlaybackRate: 1,
      mutedSessionCount: 1,
      lastSeenAtMs: 2000,
    });
    expect(summary.transportBreakdown).toEqual([
      { transport: "fetch", count: 1 },
      { transport: "keepalive_fetch", count: 0 },
      { transport: "replay_fetch", count: 1 },
      { transport: "unknown", count: 0 },
    ]);
    expect(summary.warnings).toContain(
      "1 session(s) degraded with close-missing capture state.",
    );
  });

  it("does not keep closed sessions in flush-degraded state after terminal recovery", () => {
    const summary = buildWatchCaptureHealthSummary({
      watchSessionDocs: [
        mockDoc("watch_closed", {
          watchSessionId: "watch_closed",
          lastSeenAtMs: 3_000,
          captureTransport: "fetch",
          replayRecovered: true,
          replayRecoveredCount: 1,
          flushFailureCount: 12,
          gapCount: 0,
          isClosed: true,
          closeReason: "flush_close_recovered",
        }),
      ],
      watchAssetDocs: [],
    });

    expect(summary.flushDegradedCount).toBe(0);
    expect(summary.closeMissingCount).toBe(0);
    expect(summary.degradedSessionCount).toBe(1);
  });
});
