import { describe, expect, it } from "vitest";

import {
  RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS,
  applyRuntimeWatchEvent,
  createInitialRuntimeWatchSessionState,
  validateRuntimeWatchEventPayload,
  type RuntimeWatchEvent,
} from "@/lib/analytics/watch-time-v2";

const baseEvent = {
  watchSessionId: "watch_session_1",
  mediaId: "media_1",
  surface: "drop_viewer",
  route: "/dashboard/viewer/drop_1",
  guestId: "guest_1",
  userId: null,
  sessionId: "session_1",
  identityState: "guest_only",
  mediaDurationMs: 60_000,
  playheadMs: 0,
  playbackRate: 1,
  muted: false,
  visible: true,
  active: true,
  clientElapsedMs: 0,
  clientEventAt: "2026-05-18T12:00:00.000Z",
  eventId: "watch_event_start",
  sequence: 1,
  eventType: "watch_start",
} satisfies RuntimeWatchEvent;

describe("runtime watch time v2", () => {
  it("adds watch time for a playing visible heartbeat", () => {
    let state = createInitialRuntimeWatchSessionState();
    state = applyRuntimeWatchEvent(state, baseEvent).state;

    const result = applyRuntimeWatchEvent(state, {
      ...baseEvent,
      eventId: "watch_event_heartbeat",
      eventType: "watch_heartbeat",
      sequence: 2,
      playheadMs: 10_000,
      clientElapsedMs: 10_000,
      clientEventAt: "2026-05-18T12:00:10.000Z",
    });

    expect(result.delta.watchTimeMs).toBe(10_000);
    expect(result.state.watchTimeMs).toBe(10_000);
    expect(result.state.confidence).toBe("runtime_verified");
  });

  it("adds zero watch time for hidden heartbeats while preserving attention separation", () => {
    let state = createInitialRuntimeWatchSessionState();
    state = applyRuntimeWatchEvent(state, baseEvent).state;

    const result = applyRuntimeWatchEvent(state, {
      ...baseEvent,
      eventId: "watch_event_hidden",
      eventType: "watch_heartbeat",
      sequence: 2,
      visible: false,
      playheadMs: 10_000,
      clientElapsedMs: 10_000,
      clientEventAt: "2026-05-18T12:00:10.000Z",
    });

    expect(result.delta.watchTimeMs).toBe(0);
    expect(result.state.watchTimeMs).toBe(0);
    expect(result.state.confidence).toBe("client_limited");
  });

  it("dedupes repeated event ids", () => {
    let state = createInitialRuntimeWatchSessionState();
    state = applyRuntimeWatchEvent(state, baseEvent).state;
    const first = applyRuntimeWatchEvent(state, {
      ...baseEvent,
      eventId: "watch_event_duplicate",
      eventType: "watch_heartbeat",
      sequence: 2,
      playheadMs: 10_000,
      clientElapsedMs: 10_000,
    });
    const second = applyRuntimeWatchEvent(first.state, {
      ...baseEvent,
      eventId: "watch_event_duplicate",
      eventType: "watch_heartbeat",
      sequence: 2,
      playheadMs: 10_000,
      clientElapsedMs: 10_000,
    });

    expect(first.delta.watchTimeMs).toBe(10_000);
    expect(second.delta.watchTimeMs).toBe(0);
    expect(second.state.watchTimeMs).toBe(10_000);
  });

  it("caps heartbeat deltas to 15 seconds", () => {
    let state = createInitialRuntimeWatchSessionState();
    state = applyRuntimeWatchEvent(state, baseEvent).state;

    const result = applyRuntimeWatchEvent(state, {
      ...baseEvent,
      eventId: "watch_event_large_delta",
      eventType: "watch_heartbeat",
      sequence: 2,
      playheadMs: 30_000,
      clientElapsedMs: 30_000,
      clientEventAt: "2026-05-18T12:00:30.000Z",
    });

    expect(result.delta.watchTimeMs).toBe(15_000);
    expect(result.delta.clamped).toBe(true);
  });

  it("handles playhead decreases without adding fake watch time", () => {
    let state = createInitialRuntimeWatchSessionState();
    state = applyRuntimeWatchEvent(state, baseEvent).state;
    state = applyRuntimeWatchEvent(state, {
      ...baseEvent,
      eventId: "watch_event_first",
      eventType: "watch_heartbeat",
      sequence: 2,
      playheadMs: 20_000,
      clientElapsedMs: 10_000,
    }).state;

    const result = applyRuntimeWatchEvent(state, {
      ...baseEvent,
      eventId: "watch_event_seek_back",
      eventType: "watch_heartbeat",
      sequence: 3,
      playheadMs: 5_000,
      clientElapsedMs: 10_000,
    });

    expect(result.delta.watchTimeMs).toBe(0);
    expect(result.delta.reasonCodes).toContain("playhead_decrease_excluded");
  });

  it("computes completion percent from a completed runtime event", () => {
    let state = createInitialRuntimeWatchSessionState();
    state = applyRuntimeWatchEvent(state, baseEvent).state;

    const result = applyRuntimeWatchEvent(state, {
      ...baseEvent,
      eventId: "watch_event_complete",
      eventType: "watch_complete",
      sequence: 2,
      playheadMs: 59_000,
      clientElapsedMs: 10_000,
      clientEventAt: "2026-05-18T12:00:10.000Z",
    });

    expect(result.state.completed).toBe(true);
    expect(result.state.completionPercent).toBeCloseTo(98.33, 1);
  });

  it("does not turn page-open events into watch time", () => {
    const state = applyRuntimeWatchEvent(createInitialRuntimeWatchSessionState(), baseEvent).state;

    expect(state.watchTimeMs).toBe(0);
    expect(state.attentionTimeMs).toBe(0);
  });

  it("returns calm 4xx validation for invalid payloads", () => {
    const result = validateRuntimeWatchEventPayload({
      ...baseEvent,
      eventId: "",
      mediaDurationMs: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.retryable).toBe(false);
    }
  });

  it("keeps the default heartbeat cost-safe", () => {
    expect(RUNTIME_WATCH_HEARTBEAT_INTERVAL_MS).toBeGreaterThanOrEqual(10_000);
  });
});
