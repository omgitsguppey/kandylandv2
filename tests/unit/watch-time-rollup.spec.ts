import { describe, expect, it } from "vitest";

import { buildWatchTimeRollupFromRecords } from "@/lib/server/watch-time-rollup";

describe("buildWatchTimeRollupFromRecords", () => {
  it("aggregates valid watch-session rollups", () => {
    expect(buildWatchTimeRollupFromRecords({
      records: [
        { validWatchMs: 5000, watchScoreSource: "watch_session_rollup", lastSeenAtMs: 1000 },
        { validWatchMs: 7000, watchScoreSource: "watch_session_rollup", lastSeenAtMs: 2000 },
      ],
      views: 2,
    })).toMatchObject({
      watchTimeMs: 12000,
      source: "watch_session_rollup",
      sessionCount: 2,
      validSessionCount: 2,
      latestWatchAt: 2000,
      issues: [],
    });
  });

  it("does not count legacy page duration unless explicitly allowed", () => {
    expect(buildWatchTimeRollupFromRecords({
      records: [
        { validWatchMs: 9000, watchScoreSource: "legacy_page_duration" },
      ],
      views: 1,
      viewerOpenMs: 9000,
      pageDurationMs: 12000,
      viewedFileCount: 1,
    })).toMatchObject({
      watchTimeMs: 0,
      source: "unavailable",
      validSessionCount: 0,
      diagnosticEstimate: expect.objectContaining({
        source: "diagnostic_estimate",
      }),
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "watch_time_missing_despite_views" }),
      ]),
    });
  });

  it("labels legacy page duration fallback when allowed", () => {
    expect(buildWatchTimeRollupFromRecords({
      records: [],
      views: 1,
      legacyPageDurationMs: 8000,
      allowLegacyFallback: true,
      viewerOpenMs: 10000,
      pageDurationMs: 12000,
      viewedFileCount: 1,
    })).toMatchObject({
      watchTimeMs: 8000,
      source: "legacy_page_duration",
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "legacy_page_duration_fallback" }),
        expect.objectContaining({ code: "watch_time_missing_despite_views" }),
      ]),
    });
  });

  it("caps diagnostics-only estimates when watch sessions are missing", () => {
    expect(buildWatchTimeRollupFromRecords({
      records: [],
      views: 3,
      viewerOpenMs: 18000,
      pageDurationMs: 30000,
      medianKnownWatchMsForMediaType: 7000,
      viewedFileCount: 3,
    })).toMatchObject({
      watchTimeMs: 0,
      source: "unavailable",
      diagnosticEstimate: {
        estimatedWatchMs: 18000,
        confidenceCapPercent: 25,
      },
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "watch_time_missing_despite_views" }),
      ]),
    });
  });
});
