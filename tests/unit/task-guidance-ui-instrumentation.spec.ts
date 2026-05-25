import { describe, expect, it } from "vitest";

import {
  buildTaskGuidanceTelemetryPayload,
  shouldEmitTaskGuidanceViewed,
} from "@/lib/tasks/task-guidance-telemetry-contract";

describe("task guidance UI instrumentation", () => {
  it("builds consent-aware payloads with route, source component, task identity, and guidance version", () => {
    const payload = buildTaskGuidanceTelemetryPayload({
      eventName: "task_guidance_viewed",
      taskId: "check_in_today",
      taskKind: "daily_check_in",
      sourceComponent: "daily_tasks_module",
      route: "/experiences",
      sessionId: "session-1",
      consentMode: "minimal_analytics",
      guidanceVersion: "task_guidance_v2",
    });

    expect(payload).toMatchObject({
      task_id: "check_in_today",
      task_kind: "daily_check_in",
      source_component: "daily_tasks_module",
      route: "/experiences",
      session_id: "session-1",
      consent_mode: "minimal_analytics",
      guidance_version: "task_guidance_v2",
      sourceTruth: "client_supporting",
    });
  });

  it("prevents passive render spam for viewed events", () => {
    const seen = new Set<string>();

    expect(shouldEmitTaskGuidanceViewed({
      seenKeys: seen,
      visible: true,
      loading: false,
      taskId: "task-1",
      assignedAt: 10,
      guidanceVersion: "task_guidance_v2",
    })).toBe(true);
    expect(shouldEmitTaskGuidanceViewed({
      seenKeys: seen,
      visible: true,
      loading: false,
      taskId: "task-1",
      assignedAt: 10,
      guidanceVersion: "task_guidance_v2",
    })).toBe(false);
    expect(shouldEmitTaskGuidanceViewed({
      seenKeys: seen,
      visible: false,
      loading: false,
      taskId: "task-2",
      assignedAt: 11,
      guidanceVersion: "task_guidance_v2",
    })).toBe(false);
  });
});
