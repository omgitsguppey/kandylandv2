import { existsSync } from "node:fs";
import { join } from "node:path";
import { createSourceValidatorTaskFixture } from "./utils/source-validator-contract";
import { readSessionMeasurementCheckpoint } from "@/lib/analytics/session-metrics-contract";
import { summarizeSessionMeasurementCheckpoints } from "@/lib/analytics/session-metrics-engine";
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


describe("bounded session checkpoint custody", () => {
  const measured = (overrides: Record<string, unknown> = {}) => ({ version: "session_measurement_v1", segmentId: "segment_measurement_fixture", sequence: 1, startedAtMs: 1_000, endedAtMs: 31_000, activeMs: 10_000, idleMs: 20_000, hiddenMs: 0, status: "checkpoint", ...overrides });
  it("retains a measured zero while rejecting missing and invalid measurements", () => {
    expect(readSessionMeasurementCheckpoint(measured({ activeMs: 0, idleMs: 30_000 }))?.activeMs).toBe(0);
    for (const input of [undefined, {}, measured({ activeMs: -1 }), measured({ activeMs: Infinity }), measured({ idleMs: 30_001 }), measured({ version: "old" }), measured({ sequence: 0 }), measured({ endedAtMs: 100_000_000 })]) {
      expect(readSessionMeasurementCheckpoint(input)).toBeNull();
    }
  });
  it("uses the latest cumulative checkpoint without adding earlier snapshots or retries", () => {
    expect(summarizeSessionMeasurementCheckpoints([measured(), measured(), measured({ sequence: 2, endedAtMs: 61_000, activeMs: 25_000, idleMs: 30_000, hiddenMs: 5_000, status: "final" })])).toMatchObject({ activeMs: 25_000, idleMs: 30_000, hiddenMs: 5_000, durationMs: 60_000, segmentCount: 1, status: "available" });
  });
  it("orders checkpoints by sequence instead of delivery order", () => {
    expect(summarizeSessionMeasurementCheckpoints([measured({ sequence: 2, endedAtMs: 61_000, activeMs: 40_000, idleMs: 20_000 }), measured()]).activeMs).toBe(40_000);
  });
  it("adds separate sequential route segments once", () => {
    expect(summarizeSessionMeasurementCheckpoints([measured(), measured({ segmentId: "second_segment_fixture", startedAtMs: 31_000, endedAtMs: 51_000, activeMs: 5_000, idleMs: 15_000 })])).toMatchObject({ activeMs: 15_000, durationMs: 50_000, segmentCount: 2 });
  });
  it("does not label an unobserved interval as zero", () => {
    expect(summarizeSessionMeasurementCheckpoints([])).toMatchObject({ activeMs: null, status: "source_missing" });
    expect(summarizeSessionMeasurementCheckpoints([measured(), undefined])).toMatchObject({ activeMs: null, status: "partial" });
  });
  it("rejects cumulative regressions and conflicting retry bodies", () => {
    for (const conflict of [measured({ activeMs: 9_000, idleMs: 21_000 }), measured({ sequence: 2, endedAtMs: 61_000, activeMs: 5_000, idleMs: 55_000 }), measured({ sequence: 2, startedAtMs: 2_000, endedAtMs: 62_000, activeMs: 40_000, idleMs: 20_000 })]) {
      expect(summarizeSessionMeasurementCheckpoints([measured(), conflict])).toMatchObject({ activeMs: null, conflictCount: 1 });
    }
  });
  it("does not add overlapping differently named segments as complete time", () => {
    expect(summarizeSessionMeasurementCheckpoints([measured(), measured({ segmentId: "overlap_segment_fixture" })])).toMatchObject({ activeMs: null, conflictCount: 1, status: "partial" });
  });
});


describe("final checkpoint ownership", () => {
  it("rejects a later sequence after final closeout without labeling the contradiction as absent", () => {
    const checkpoint = { version: "session_measurement_v1", segmentId: "segment_final_fixture", sequence: 1, startedAtMs: 1_000, endedAtMs: 31_000, activeMs: 10_000, idleMs: 20_000, hiddenMs: 0, status: "final" };
    expect(summarizeSessionMeasurementCheckpoints([checkpoint, { ...checkpoint, sequence: 2, endedAtMs: 41_000, idleMs: 30_000 }])).toMatchObject({ status: "partial", activeMs: null, conflictCount: 1 });
  });
});


describe("session-bounce-calculation task-bound CLI", () => {
  const fixture = (allowedSourceFiles: string[] = []) => createSourceValidatorTaskFixture({ validator: "scripts/agent/validate-session-bounce-calculation.ts", report: "agent/state/session-bounce-calculation.generated.json", allowedSourceFiles });
  it("accepts declared source changes with inherited protected dirt, denies later protected changes and recovers without replacing prior proof", () => {
    const f = fixture();
    f.write("fixture.ts", "export const value = 2;\n");
    const accepted = f.run(); expect(accepted.output).not.toContain("Error:"); expect(accepted.status).toBe(0);
    const before = f.read(f.report);
    expect(JSON.parse(before).mutationScope).toMatchObject({ mode: "input_bound_task", changedFiles: ["fixture.ts"], sourceFingerprint: f.fingerprint() });
    f.write(f.protectedFile, "export const value = 3;\n");
    const denied = f.run(); expect(denied.status).not.toBe(0); expect(denied.output).toContain("Output scope violation: " + f.protectedFile);
    expect(f.read(f.report)).toBe(before);
    f.write(f.protectedFile, "export const value = 2;\n");
    expect(f.run().status).toBe(0);
  }, 60_000);
  it("retains the standalone protected-runtime safeguard", () => {
    const f = fixture(); const result = f.run([]);
    expect(result.status).not.toBe(0); expect(result.output).toContain("dirty files are unclassified.");
    expect(JSON.parse(f.read(f.report)).mutationScope).toEqual({ mode: "whole_git_worktree" });
  }, 60_000);
  it("rejects an undeclared untracked mutation before publishing a report", () => {
    const f = fixture(); f.write("unexpected.ts", "export const unexpected = true;\n");
    const result = f.run(); expect(result.status).not.toBe(0); expect(result.output).toContain("Output scope violation: unexpected.ts");
    expect(existsSync(join(f.root, f.report))).toBe(false);
  }, 60_000);
  it("rejects a disconnected closeout despite a literal decoy and accepts an equivalent emitter binding", () => {
    const file = "src/components/Analytics/DeepTracker.tsx", f = fixture([file]), before = f.read(file);
    f.write(file, before.replace('trackObservedEvent("session_closed",', 'trackObservedEvent("disconnected_closeout",') + '\n// trackEvent("session_closed", {});\n');
    const failed = f.run(); expect(failed.status).not.toBe(0); expect(failed.output).toContain("DeepTracker does not emit session closeout telemetry.");
    f.write(file, before.replaceAll("trackObservedEvent", "emitMeasuredEvent"));
    expect(f.run().status).toBe(0);
  }, 60_000);
});
