import { describe, expect, it } from "vitest";

import { evaluateSchedulerFreshness } from "../../scripts/check-scheduler-freshness";
import type { QueueJobHeartbeat } from "../../shared/runtime/runtime-warning-contract";

function makeHeartbeat(input: Partial<QueueJobHeartbeat> & { jobId: QueueJobHeartbeat["jobId"] }): QueueJobHeartbeat {
  return {
    jobId: input.jobId,
    executionLayer: input.executionLayer ?? "scheduler",
    surface: input.surface ?? `functions/${input.jobId}`,
    startedAt: input.startedAt ?? 1000,
    completedAt: input.completedAt ?? 1500,
    status: input.status ?? "ok",
    durationMs: input.durationMs ?? 500,
    itemsScanned: input.itemsScanned ?? 1,
    itemsChanged: input.itemsChanged ?? 1,
    warnings: input.warnings ?? [],
    lastErrorCode: input.lastErrorCode ?? null,
    staleAfterMs: input.staleAfterMs ?? 60_000,
    updatedAt: input.updatedAt ?? 1500,
  };
}

describe("evaluateSchedulerFreshness", () => {
  it("uses static scheduler wiring validation when no live heartbeat docs exist", () => {
    const failures = evaluateSchedulerFreshness({
      heartbeats: new Map(),
      staticWiringFailures: [],
    });

    expect(failures).toEqual([]);
  });

  it("fails when any required live heartbeat is missing once live scheduler state exists", () => {
    const failures = evaluateSchedulerFreshness({
      heartbeats: new Map([
        ["process_queue", makeHeartbeat({ jobId: "process_queue", startedAt: 1000, completedAt: 1500, updatedAt: 1500 })],
      ]),
      now: 2_000,
    });

    expect(failures).toContain("Missing queue heartbeat for notify_active_drops.");
  });

  it("fails on stale or failed live heartbeats", () => {
    const failures = evaluateSchedulerFreshness({
      heartbeats: new Map([
        ["process_queue", makeHeartbeat({ jobId: "process_queue", status: "failed", lastErrorCode: "queue_runtime_failed", staleAfterMs: 100, updatedAt: 1000 })],
        ["notify_active_drops", makeHeartbeat({ jobId: "notify_active_drops", staleAfterMs: 100, updatedAt: 1000, completedAt: 1000 })],
      ]),
      now: 2_000,
    });

    expect(failures).toContain("process_queue last run failed with queue_runtime_failed.");
    expect(failures).toContain("process_queue heartbeat is stale.");
    expect(failures).toContain("notify_active_drops heartbeat is stale.");
  });

  it("ignores non-scheduler heartbeats for scheduler freshness and falls back to static wiring", () => {
    const failures = evaluateSchedulerFreshness({
      heartbeats: new Map([
        ["process_queue", makeHeartbeat({ jobId: "process_queue", executionLayer: "next_route", surface: "cron/process-queue" })],
        ["notify_active_drops", makeHeartbeat({ jobId: "notify_active_drops", executionLayer: "next_route", surface: "cron/notify-active-drops" })],
      ]),
      staticWiringFailures: [],
    });

    expect(failures).toEqual([]);
  });
});
