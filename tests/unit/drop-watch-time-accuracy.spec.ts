import { describe, expect, it } from "vitest";

import {
  buildDropWatchTimeDebugLane,
  DROP_WATCH_TIME_TELEMETRY_EVENTS,
} from "@/lib/analytics/drop-watch-time-contract";
import {
  calculateActiveWatchMs,
  calculateNormalizedWatchPercent,
  preventWatchTimeDoubleCount,
  resolveDropWatchTelemetryPolicy,
  startDropWatchSession,
  stopDropWatchSession,
  updateDropWatchProgress,
} from "@/lib/analytics/drop-watch-time-engine";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { getPersonMetricDefinition } from "@/lib/analytics/person-metrics-contract";

describe("drop watch time accuracy", () => {
  it("counts video playback only while foreground visible and caps completion by duration per replay", () => {
    const started = startDropWatchSession({
      dropId: "drop-video",
      mediaId: "video-1",
      mediaKind: "video",
      contentDurationMs: 30_000,
      visibleStartedAt: 1_000,
      activeStartedAt: 1_000,
      playbackStartedAt: 1_000,
      dedupeKey: "watch:video-1",
    });

    const progressed = updateDropWatchProgress(started, {
      nowMs: 41_000,
      visibleMsDelta: 40_000,
      activeMsDelta: 40_000,
      playingMsDelta: 40_000,
      backgroundMsDelta: 10_000,
      playbackPositionMs: 30_000,
      replayCount: 1,
    });

    expect(progressed.activeWatchMs).toBe(30_000);
    expect(progressed.backgroundMs).toBe(10_000);
    expect(progressed.completionPercent).toBe(100);
    expect(progressed.normalizedWatchPercent).toBe(100);
    expect(progressed.replayCount).toBe(1);
    expect(progressed.watchConfidence).toBe("exact_media_runtime");
    expect(stopDropWatchSession(progressed, { nowMs: 41_000, reason: "completed" }).status).toBe("completed");
  });

  it("uses active visible dwell for image drops without counting passive page-open or background time", () => {
    const session = updateDropWatchProgress(
      startDropWatchSession({
        dropId: "drop-image",
        mediaId: "image-1",
        mediaKind: "image",
        contentDurationMs: 15_000,
        visibleStartedAt: 5_000,
        activeStartedAt: 7_000,
        dedupeKey: "watch:image-1",
      }),
      {
        nowMs: 25_000,
        visibleMsDelta: 20_000,
        activeMsDelta: 8_000,
        passiveVisibleMsDelta: 12_000,
        backgroundMsDelta: 4_000,
      },
    );

    expect(calculateActiveWatchMs(session)).toBe(8_000);
    expect(session.passiveVisibleMs).toBe(12_000);
    expect(session.backgroundMs).toBe(4_000);
    expect(session.watchConfidence).toBe("active_visibility_estimated");
    expect(session.durationBiasPolicy).toContain("active");
  });

  it("marks unknown duration as weak or unavailable instead of exact watch proof", () => {
    const session = updateDropWatchProgress(
      startDropWatchSession({
        dropId: "drop-unknown",
        mediaId: "unknown-1",
        mediaKind: "unknown",
        contentDurationMs: null,
        visibleStartedAt: 0,
        activeStartedAt: 0,
        dedupeKey: "watch:unknown-1",
      }),
      { nowMs: 5_000, visibleMsDelta: 5_000, activeMsDelta: 3_000 },
    );

    expect(session.watchConfidence).toBe("weak_visibility_only");
    expect(calculateNormalizedWatchPercent(session)).toBeNull();
  });

  it("dedupes replays/retries and throttles progress telemetry", () => {
    expect(preventWatchTimeDoubleCount({ dedupeKey: "same", seenDedupeKeys: new Set(["same"]) }).allow).toBe(false);
    expect(preventWatchTimeDoubleCount({ dedupeKey: "new", seenDedupeKeys: new Set(["same"]) }).allow).toBe(true);

    const policy = resolveDropWatchTelemetryPolicy({
      eventName: "drop_watch_progress",
      lastProgressEventAtMs: 10_000,
      nowMs: 12_000,
    });
    expect(policy.shouldEmit).toBe(false);
    expect(policy.reason).toBe("progress_throttled");
  });

  it("maps drop watch events into behavioral facts, person metrics, and debug lane", () => {
    const fact = normalizeBehavioralEventFact({
      eventId: "drop_watch_completed:test",
      eventName: "drop_watch_completed",
      params: {
        source_component: "drop_watch_time",
        route: "/dashboard/viewer",
        drop_id: "drop-1",
        media_id: "media-1",
        watch_session_id: "watch-1",
      },
      timestamp: 1_000,
    });
    const metric = getPersonMetricDefinition("runtime_watch_sessions");
    const lane = buildDropWatchTimeDebugLane({
      exactMediaRuntimeCount: 1,
      activeVisibilityEstimatedCount: 1,
      durationMissingCount: 1,
      backgroundExcludedCount: 2,
      suspiciousPageTimeFallbackCount: 0,
    });

    expect(fact?.normalizedAction).toBe("watch_session_completed");
    expect(metric?.eventNames).toEqual(expect.arrayContaining([...DROP_WATCH_TIME_TELEMETRY_EVENTS]));
    expect(lane.label).toBe("Drop watch time");
    expect(lane.suspiciousPageTimeFallbackCount).toBe(0);
  });
});
