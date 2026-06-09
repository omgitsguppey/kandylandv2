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

  it("does not treat legacy watch samples as canonical even when legacy fallback is allowed", () => {
    expect(buildWatchTimeRollupFromRecords({
      records: [
        { validWatchMs: 9000, watchScoreSource: "legacy_page_duration", lastSeenAtMs: 1000 },
      ],
      views: 1,
      allowLegacyFallback: true,
    })).toMatchObject({
      watchTimeMs: 0,
      source: "unavailable",
      validSessionCount: 0,
      legacyPageDurationMs: 0,
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "watch_time_missing_despite_views" }),
      ]),
    });
  });

  it("ignores non-rollup sources and non-positive watch samples", () => {
    expect(buildWatchTimeRollupFromRecords({
      records: [
        { validWatchMs: 9000, watchScoreSource: "legacy_page_duration" },
        { validWatchMs: 0, watchScoreSource: "watch_session_rollup", visibleMs: 2000 },
        { validWatchMs: -4000, watchScoreSource: "watch_session_rollup" },
        { validWatchMs: 6000, watchScoreSource: "diagnostic_estimate" },
      ],
      views: 2,
      viewerOpenMs: 14000,
      pageDurationMs: 20000,
      viewedFileCount: 2,
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

  it("keeps diagnostic estimates separate from canonical watch time", () => {
    const rollup = buildWatchTimeRollupFromRecords({
      records: [],
      views: 1,
      viewerOpenMs: 25000,
      pageDurationMs: 25000,
      viewedFileCount: 1,
    });

    expect(rollup.diagnosticEstimate?.estimatedWatchMs).toBeGreaterThan(0);
    expect(rollup.watchTimeMs).toBe(0);
    expect(rollup.source).toBe("unavailable");
  });

  it("uses image manual advance and active visibility as diagnostics only", () => {
    const rollup = buildWatchTimeRollupFromRecords({
      records: [
        {
          watchScoreSource: "watch_session_rollup",
          mediaType: "image",
          visibleMs: 9000,
          activeMs: 9000,
          manualAdvanceAfterMs: 9000,
        },
      ],
      views: 1,
      viewerOpenMs: 12000,
      pageDurationMs: 30000,
      viewedFileCount: 1,
      mediaType: "image",
    });

    expect(rollup.watchTimeMs).toBe(0);
    expect(rollup.source).toBe("unavailable");
    expect(rollup.diagnosticEstimate).toMatchObject({
      source: "diagnostic_estimate",
      estimatedWatchMs: 12000,
      confidenceCapPercent: 60,
      basis: expect.objectContaining({
        mediaType: "image",
        visibleMs: 9000,
        activeMs: 9000,
        manualAdvanceAfterMs: 9000,
        sourceReliability: "bounded_intervals",
      }),
    });
  });

  it("uses video partial ticks and progress to recover a stronger diagnostic estimate", () => {
    const rollup = buildWatchTimeRollupFromRecords({
      records: [
        {
          watchScoreSource: "watch_session_rollup",
          mediaType: "video",
          visibleMs: 45000,
          playingMs: 45000,
          maxProgressPercent: 70,
        },
      ],
      views: 1,
      viewerOpenMs: 60000,
      pageDurationMs: 90000,
      medianKnownWatchMsForMediaType: 120000,
      viewedFileCount: 1,
      mediaType: "video",
    });

    expect(rollup.watchTimeMs).toBe(0);
    expect(rollup.diagnosticEstimate).toMatchObject({
      source: "diagnostic_estimate",
      estimatedWatchMs: 60000,
      confidenceCapPercent: 60,
      basis: expect.objectContaining({
        mediaType: "video",
        playingMs: 45000,
        progressPercent: 70,
        sourceReliability: "bounded_intervals",
      }),
    });
  });

  it("keeps no-tick diagnostics low confidence and bounded by foreground/open signals", () => {
    const rollup = buildWatchTimeRollupFromRecords({
      records: [{ watchScoreSource: "watch_session_rollup" }],
      views: 1,
      viewerOpenMs: 10000,
      pageDurationMs: 60000,
      viewedFileCount: 1,
    });

    expect(rollup.watchTimeMs).toBe(0);
    expect(rollup.diagnosticEstimate).toMatchObject({
      source: "diagnostic_estimate",
      estimatedWatchMs: 10000,
      confidenceCapPercent: 40,
      basis: expect.objectContaining({
        sourceReliability: "partial_ticks",
      }),
    });
  });

  it("does not turn hidden or idle page duration into watch-time diagnostics", () => {
    const rollup = buildWatchTimeRollupFromRecords({
      records: [],
      views: 1,
      viewerOpenMs: 0,
      pageDurationMs: 60000,
      viewedFileCount: 1,
    });

    expect(rollup.watchTimeMs).toBe(0);
    expect(rollup.source).toBe("unavailable");
    expect(rollup.diagnosticEstimate).toBeNull();
  });
});
