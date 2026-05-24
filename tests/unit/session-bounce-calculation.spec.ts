import { describe, expect, it } from "vitest";

import {
  SESSION_METRICS_TELEMETRY_EVENTS,
  buildSessionBounceDebugLane,
} from "@/lib/analytics/session-metrics-contract";
import {
  calculateActiveSessionTime,
  classifyBounce,
  classifyEngagedSession,
  closeSession,
  explainSessionMetric,
  linkGuestSessionToUser,
  resolveSessionTelemetryPolicy,
  startSession,
  updateSessionActivity,
} from "@/lib/analytics/session-metrics-engine";
import { getPersonMetricDefinition } from "@/lib/analytics/person-metrics-contract";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";

describe("session bounce calculation", () => {
  it("separates active, idle, and hidden time without counting page-open duration as active", () => {
    const session = updateSessionActivity(
      startSession({
        sessionId: "session-passive",
        actorKind: "guest",
        guestId: "guest-1",
        startedAt: 1_000,
        routeCount: 1,
        inactivityThresholdMs: 30 * 60 * 1000,
      }),
      {
        at: 61_000,
        foregroundMsDelta: 60_000,
        hiddenMsDelta: 15_000,
        eventCountDelta: 1,
        meaningfulInteractionCountDelta: 0,
      },
    );

    expect(calculateActiveSessionTime(session)).toBe(0);
    expect(session.idleMs).toBe(45_000);
    expect(session.hiddenMs).toBe(15_000);
    expect(classifyEngagedSession(session)).toBe("passive");
    expect(classifyBounce(session)).toBe("bounced");
  });

  it("does not classify a one-route session with meaningful activity as a bounce", () => {
    const session = updateSessionActivity(
      startSession({
        sessionId: "session-active",
        actorKind: "guest",
        guestId: "guest-1",
        startedAt: 1_000,
        routeCount: 1,
      }),
      {
        at: 10_000,
        activeMsDelta: 4_000,
        idleMsDelta: 5_000,
        eventCountDelta: 3,
        meaningfulInteractionCountDelta: 1,
        conversionCountDelta: 0,
      },
    );

    expect(session.activeMs).toBe(4_000);
    expect(classifyEngagedSession(session)).toBe("engaged");
    expect(classifyBounce(session)).toBe("not_bounced");
  });

  it("links guest sessions to signed-in users without double-counting", () => {
    const linked = linkGuestSessionToUser(
      startSession({
        sessionId: "session-link",
        actorKind: "guest",
        guestId: "guest-1",
        startedAt: 1_000,
      }),
      {
        userId: "user-1",
        linkedPersonId: "person-1",
        linkId: "link-1",
      },
    );

    expect(linked.sessionId).toBe("session-link");
    expect(linked.userId).toBe("user-1");
    expect(linked.guestUserHandoff.doubleCountSuppressed).toBe(true);
    expect(linked.guestUserHandoff.preservedSessionContinuity).toBe(true);
  });

  it("keeps closeout confidence and end reason explicit when closeout is missing", () => {
    const closed = closeSession(
      startSession({
        sessionId: "session-missing-closeout",
        actorKind: "guest",
        guestId: "guest-1",
        startedAt: 1_000,
      }),
      {
        endedAt: 1_801_000,
        endReason: "missing_closeout",
        closeoutObserved: false,
      },
    );

    expect(closed.confidence).toBe("estimated_missing_closeout");
    expect(closed.endReason).toBe("missing_closeout");
    expect(explainSessionMetric(closed)).toContain("estimated");
  });

  it("throttles activity ticks and maps sessions into metrics, event facts, and debug lane", () => {
    expect(resolveSessionTelemetryPolicy({
      eventName: "session_activity_tick",
      lastActivityTickAtMs: 10_000,
      nowMs: 12_000,
    }).shouldEmit).toBe(false);

    const metric = getPersonMetricDefinition("sessions");
    const fact = normalizeBehavioralEventFact({
      eventId: "session_closed:test",
      eventName: "session_closed",
      params: {
        source_component: "DeepTracker",
        route: "/dashboard",
        session_id: "session-1",
        active_ms: 4_000,
        idle_ms: 2_000,
        hidden_ms: 0,
        bounce_status: "not_bounced",
      },
      timestamp: 1_000,
      sessionId: "session-1",
    });
    const lane = buildSessionBounceDebugLane({
      activeSessionCount: 1,
      idleSessionCount: 1,
      missingCloseoutCount: 0,
      bounceClassifiedCount: 1,
      hiddenTimeExcludedCount: 1,
      guestUserLinkStatus: "mapped",
    });
    const debugSummary = buildDebugPanelTrackingSummary({
      sessionBounceCalculation: { debugLane: lane },
    });

    expect(metric?.eventNames).toEqual(expect.arrayContaining([...SESSION_METRICS_TELEMETRY_EVENTS]));
    expect(fact?.normalizedAction).toBe("session_closed");
    expect(lane.label).toBe("Session/bounce");
    expect(debugSummary.lanes.some((entry) => entry.id === "session_bounce")).toBe(true);
  });
});
