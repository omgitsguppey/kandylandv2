import { describe, expect, it } from "vitest";

import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  DAILY_TASK_LIFECYCLE_EVENT_NAMES,
  buildDailyTaskLifecycleEventPayload,
  buildDailyTaskLifecycleDebugLane,
} from "@/lib/tasks/daily-task-telemetry";
import {
  classifyDailyTaskAbandonment,
  computeDailyTaskActiveDuration,
  finishDailyTaskDuration,
  startDailyTaskDuration,
} from "@/lib/tasks/daily-task-duration";
import {
  buildDailyTaskLifecycleTelemetryReport,
  validateDailyTaskLifecycleTelemetryReport,
} from "../../scripts/agent/validate-daily-task-lifecycle-telemetry";

const TEST_HEAD = "0123456789abcdef0123456789abcdef01234567";
const TEST_SCORE = {
  sourceHealth: 90,
  runtimeHealth: 90,
  evidenceCompleteness: 90,
  freshness: 90,
  costRisk: 90,
  regressionRisk: 90,
  overallHealthScore: 90,
};

function envelope(eventName: string): CanonicalEventEnvelope {
  return {
    eventId: `evt_${eventName}`,
    eventName,
    eventVersion: 1,
    timestamp: "2026-05-24T03:00:00.000Z",
    featureId: "daily_checkin",
    surface: "dashboard",
    actorKind: "signed_in_user",
    identityState: "logged_in_unlinked",
    identityConfidence: "exact",
    consentMode: "minimal_analytics",
    sessionId: "session_1",
    guestId: null,
    userRef: { kind: "user", id: "user_1" },
    linkId: null,
    source: "client",
    materializerLane: "person_metrics.daily_tasks",
    debugVisibility: "admin_debug",
    scoreImpact: "evidence_completeness",
    privacyClass: "minimal_product",
    metadata: eventName === "daily_task_reward_granted"
      ? { taskId: "check_in_today", resetWindowId: "2026-05-24" }
      : {},
    pipelineStatus: "normal",
    unavailableGuestReason: null,
    includeInUserBehavior: true,
  };
}

describe("daily task lifecycle telemetry", () => {
  it("defines the complete lifecycle event set with reward-GD source metadata", () => {
    expect(DAILY_TASK_LIFECYCLE_EVENT_NAMES).toEqual([
      "daily_task_surface_viewed",
      "daily_task_card_viewed",
      "daily_task_guidance_opened",
      "daily_task_started",
      "daily_task_action_attempted",
      "daily_task_completed",
      "daily_task_reward_granted",
      "daily_task_failed",
      "daily_task_abandoned",
      "daily_task_reset_locked",
      "daily_task_next_eligible_viewed",
    ]);

    const payload = buildDailyTaskLifecycleEventPayload({
      eventName: "daily_task_started",
      taskId: "check_in_today",
      taskKind: "daily_check_in",
      rewardGdAmount: 10,
      resetPolicy: "calendar_day",
      nextEligibleAt: 1_764_000_000_000,
      sourceComponent: "DailyCheckIn",
      route: "/dashboard",
      userId: "user_1",
      consentMode: "minimal_analytics",
      startedAt: 1_764_000_100_000,
    });

    expect(payload).toMatchObject({
      event_name: "daily_task_started",
      task_id: "check_in_today",
      task_kind: "daily_check_in",
      reward_gd: 10,
      reward_source: "reward_gd_only",
      reset_policy: "calendar_day",
      next_eligible_at: 1_764_000_000_000,
      source_component: "DailyCheckIn",
      route: "/dashboard",
      user_id: "user_1",
      consent_mode: "minimal_analytics",
      started_at: 1_764_000_100_000,
    });
  });

  it("measures active task duration from active start or attempt, not passive page time", () => {
    const pageViewedAt = 1_000;
    const started = startDailyTaskDuration({
      taskId: "check_in_today",
      nowMs: 6_000,
      pageViewedAt,
      visibilityState: "visible",
    });
    const attemptedAt = 11_000;
    const activeDuration = computeDailyTaskActiveDuration({
      startedAt: started.startedAt,
      attemptedAt,
      completedAt: 16_000,
      pageViewedAt,
      visibilityState: "visible",
    });

    expect(started.startedAt).toBe(6_000);
    expect(activeDuration.durationMs).toBe(5_000);
    expect(activeDuration.durationMs).not.toBe(15_000);
    expect(activeDuration.confidence).toBe("exact");
  });

  it("marks background or legacy duration unavailable instead of zero", () => {
    const duration = computeDailyTaskActiveDuration({
      pageViewedAt: 1_000,
      completedAt: 10_000,
      visibilityState: "hidden",
    });

    expect(duration).toMatchObject({
      durationMs: null,
      confidence: "unavailable",
      usedPassivePageTime: false,
    });
  });

  it("classifies abandonments with an explicit threshold and failure reason", () => {
    const started = startDailyTaskDuration({
      taskId: "check_in_today",
      nowMs: 10_000,
      visibilityState: "visible",
    });
    const abandoned = classifyDailyTaskAbandonment({
      startedAt: started.startedAt,
      lastInteractionAt: 70_001,
      nowMs: 131_000,
      thresholdMs: 60_000,
      visibilityState: "visible",
    });
    const finished = finishDailyTaskDuration({
      startedAt: started.startedAt,
      finishedAt: 70_000,
      status: "abandoned",
      failureReason: abandoned.failureReason,
      visibilityState: "visible",
    });

    expect(abandoned.abandoned).toBe(true);
    expect(abandoned.failureReason).toBe("inactive_after_start");
    expect(finished).toMatchObject({
      status: "abandoned",
      durationMs: 60_000,
      confidence: "active_session_estimated",
      failureReason: "inactive_after_start",
    });
  });

  it("hydrates daily task lifecycle events into global and per-user person metrics", () => {
    const report = hydratePersonMetrics({
      envelopes: [
        envelope("daily_task_started"),
        envelope("daily_task_completed"),
        envelope("daily_task_reward_granted"),
        envelope("daily_task_abandoned"),
        envelope("daily_task_reset_locked"),
      ],
    });

    expect(report.metricStatus.daily_task_starts.count).toBe(1);
    expect(report.metricStatus.daily_task_completions.count).toBe(1);
    expect(report.metricStatus.daily_task_rewards_granted.count).toBe(1);
    expect(report.metricStatus.daily_task_abandonments.count).toBe(1);
    expect(report.metricStatus.daily_task_reset_locked_views.count).toBe(1);
  });

  it("summarizes lifecycle debug gaps without exposing raw task rows by default", () => {
    const lane = buildDailyTaskLifecycleDebugLane({
      missingStarts: 0,
      completionsWithoutStarts: 0,
      rewardsWithoutCompletions: 0,
      durationUnavailableCount: 1,
      failureReasons: ["inactive_after_start"],
    });

    expect(lane).toMatchObject({
      lane: "Daily task lifecycle",
      rawDetailsCollapsedByDefault: true,
      status: "review",
      durationUnavailableCount: 1,
      failureReasons: ["inactive_after_start"],
    });
  });

  it("emits a deterministic full-head source verdict envelope", () => {
    const report = buildDailyTaskLifecycleTelemetryReport({
      generatedAtUtc: "2026-07-14T17:00:00.000Z",
      currentHead: TEST_HEAD,
      dirtyFiles: [],
      scoreBefore: TEST_SCORE,
      scoreAfter: TEST_SCORE,
    });

    expect(report).toMatchObject({
      reportKey: "daily-task-lifecycle-telemetry",
      status: "pass",
      passed: true,
      currentHead: TEST_HEAD,
      sourceCommit: TEST_HEAD,
      canClearSourceGate: true,
      sourceStatus: "pass",
      validationFailures: [],
      sourceValidationFailures: [],
      isolationFailures: [],
    });
    expect(validateDailyTaskLifecycleTelemetryReport(report)).toEqual([]);
  });

  it("does not clear the canonical source gate when only isolation checks fail", () => {
    const report = buildDailyTaskLifecycleTelemetryReport({
      generatedAtUtc: "2026-07-14T17:00:00.000Z",
      currentHead: TEST_HEAD,
      dirtyFiles: ["tmp/unclassified-lifecycle-file.txt"],
      scoreBefore: TEST_SCORE,
      scoreAfter: TEST_SCORE,
    });

    expect(report.status).toBe("fail");
    expect(report.sourceStatus).toBe("pass");
    expect(report.isolationFailures).toHaveLength(1);
    expect(report.canClearSourceGate).toBe(false);
  });

  it("fails closed when Git provenance is unavailable", () => {
    const report = buildDailyTaskLifecycleTelemetryReport({
      currentHead: "unknown",
      dirtyFiles: [],
      scoreBefore: TEST_SCORE,
      scoreAfter: TEST_SCORE,
    });
    expect(report.status).toBe("fail");
    expect(report.canClearSourceGate).toBe(false);
    expect(report.validationFailures).toContain("daily task lifecycle report provenance is not a full matching Git commit.");
  });
});
