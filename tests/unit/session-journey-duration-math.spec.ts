import { existsSync } from "node:fs";
import { join } from "node:path";
import { createSourceValidatorTaskFixture } from "./utils/source-validator-contract";
import { describe, expect, it } from "vitest";

import {
  calculateJourneyStepDuration,
  calculateSessionActiveMs,
  calculateSessionHiddenMs,
  calculateSessionIdleMs,
  classifyBounce,
  classifyEngagedSession,
  classifyMeaningfulInteraction,
  classifySessionCloseout,
  explainSessionMath,
  linkGuestUserSession,
} from "@/lib/math/session-journey-math";

describe("session journey duration math", () => {
  it("excludes hidden and idle intervals from active session time", () => {
    const intervals = [
      { startedAtMs: 0, endedAtMs: 20_000, foreground: true, lastMeaningfulInteractionAtMs: 0 },
      { startedAtMs: 20_000, endedAtMs: 60_000, foreground: true, lastMeaningfulInteractionAtMs: 0 },
      { startedAtMs: 60_000, endedAtMs: 90_000, foreground: false, lastMeaningfulInteractionAtMs: 60_000 },
    ];

    expect(calculateSessionActiveMs({ intervals })).toBe(30_000);
    expect(calculateSessionIdleMs({ intervals })).toBe(30_000);
    expect(calculateSessionHiddenMs({ intervals })).toBe(30_000);
  });

  it("does not backfill active time before the activity anchor", () => {
    const intervals = [
      { startedAtMs: 0, endedAtMs: 60_000, foreground: true, lastMeaningfulInteractionAtMs: 30_000 },
    ];

    expect(calculateSessionActiveMs({ intervals })).toBe(30_000);
    expect(calculateSessionIdleMs({ intervals })).toBe(30_000);
  });

  it("uses the canonical bounce and engagement thresholds", () => {
    expect(classifyBounce({
      routeCount: 1,
      meaningfulInteractionCount: 0,
      activeMs: 9_999,
      conversionCount: 0,
      closeout: "observed_closeout",
    })).toMatchObject({ bounceStatus: "bounced" });

    expect(classifyBounce({
      routeCount: 1,
      meaningfulInteractionCount: 0,
      activeMs: 9_999,
      conversionCount: 1,
      closeout: "observed_closeout",
    })).toMatchObject({ bounceStatus: "not_bounced", reason: "conversion" });

    expect(classifyEngagedSession({
      routeCount: 1,
      meaningfulInteractionCount: 0,
      activeMs: 10_000,
      conversionCount: 0,
    })).toMatchObject({ engagementStatus: "engaged", reason: "active_threshold" });
  });

  it("does not auto-count unknown closeout as bounce", () => {
    const closeout = classifySessionCloseout({ closeoutObserved: false, endReason: "missing_closeout" });
    expect(closeout).toMatchObject({ closeout: "unknown_closeout", confidence: "weak" });
    expect(classifyBounce({
      routeCount: 1,
      meaningfulInteractionCount: 0,
      activeMs: 0,
      conversionCount: 0,
      closeout: closeout.closeout,
    })).toMatchObject({ bounceStatus: "unknown", reason: "unknown_closeout" });
  });

  it("classifies meaningful interactions from canonical action names", () => {
    expect(classifyMeaningfulInteraction({ eventName: "drop_unlocked" })).toMatchObject({ meaningful: true, category: "drop" });
    expect(classifyMeaningfulInteraction({ eventName: "chat_thread_opened" })).toMatchObject({ meaningful: true, category: "chat" });
    expect(classifyMeaningfulInteraction({ eventName: "session_activity_tick" })).toMatchObject({ meaningful: false });
  });

  it("calculates journey step duration from adjacent events without inventing missing duration", () => {
    expect(calculateJourneyStepDuration({
      startedAtMs: 1_000,
      endedAtMs: 8_000,
      activeMs: 5_000,
    })).toMatchObject({ durationMs: 7_000, activeMs: 5_000, confidence: "exact" });

    expect(calculateJourneyStepDuration({ startedAtMs: 1_000 })).toMatchObject({
      durationMs: null,
      activeMs: null,
      confidence: "unavailable",
    });
  });

  it("preserves guest-to-user continuity only within exact handoff rules", () => {
    expect(linkGuestUserSession({
      guestSessionId: "session-1",
      userSessionId: "session-1",
      guestEventAtMs: 10_000,
      authTransitionAtMs: 12_000,
      guestId: "guest-1",
      userId: "user-1",
      linkId: "link-1",
    })).toMatchObject({ preservedSessionContinuity: true, doubleCountSuppressed: true, reason: "same_session" });

    expect(linkGuestUserSession({
      guestSessionId: "session-1",
      userSessionId: "session-2",
      guestEventAtMs: 10_000,
      authTransitionAtMs: 250_000,
      guestId: "guest-1",
      userId: "user-1",
    })).toMatchObject({ preservedSessionContinuity: true, reason: "auth_transition_window" });

    expect(linkGuestUserSession({
      guestSessionId: "session-1",
      userSessionId: "session-2",
      guestEventAtMs: 10_000,
      authTransitionAtMs: 400_001,
      guestId: "guest-1",
      userId: "user-1",
    })).toMatchObject({ preservedSessionContinuity: false, reason: "outside_transition_window" });

    expect(explainSessionMath({ routeCount: 1, meaningfulInteractionCount: 0, activeMs: 0, conversionCount: 0 }))
      .toContain("30 minute inactivity timeout");
  });
});


describe("measured zero versus missing activity", () => {
  it("does not convert an elapsed interval into active engagement", () => {
    expect(calculateJourneyStepDuration({ startedAtMs: 1_000, endedAtMs: 301_000 })).toMatchObject({ durationMs: 300_000, activeMs: null });
  });
  it("retains explicit active zero with and without an elapsed endpoint", () => {
    expect(calculateJourneyStepDuration({ startedAtMs: 1_000, endedAtMs: 301_000, activeMs: 0 })).toMatchObject({ activeMs: 0 });
    expect(calculateJourneyStepDuration({ startedAtMs: 1_000, activeMs: 0 })).toMatchObject({ activeMs: 0, durationMs: null, reason: "active_only" });
  });
});


describe("session-journey-duration-math task-bound CLI", () => {
  const fixture = (allowedSourceFiles: string[] = []) => createSourceValidatorTaskFixture({ validator: "scripts/agent/validate-session-journey-duration-math.ts", report: "agent/state/session-journey-duration-math.generated.json", allowedSourceFiles });
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
});
