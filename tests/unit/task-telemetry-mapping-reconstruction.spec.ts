import { describe, expect, it } from "vitest";
import { buildTaskTelemetryMappingReconstruction } from "@/lib/tasks/task-telemetry-mapping-engine";

describe("task telemetry mapping reconstruction", () => {
  it("flags 0/0 mapping when the task catalog has expected events", () => {
    const report = buildTaskTelemetryMappingReconstruction({
      catalogEventCount: 12,
      mappingRowCount: 0,
      sourcePath: "task telemetry mapping",
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
      aliasScanned: false,
    });

    expect(report.contradictions).toContain("tracked_events_zero_while_catalog_has_task_events");
    expect(report.aliasScanStatus).toBe("not_scanned");
    expect(report.nextAction).toContain("tracked_events_zero");
  });

  it("flags lifecycle contradictions when activity samples exist", () => {
    const report = buildTaskTelemetryMappingReconstruction({
      catalogEventCount: 12,
      mappingRowCount: 3,
      lifecycleEventCount: 0,
      taskActivityLifecycleSamples: 500,
      sourcePath: "task telemetry mapping",
      generatedAtUtc: "2026-05-25T12:00:00.000Z",
      aliasScanned: true,
    });

    expect(report.contradictions).toContain("lifecycle_events_contradict_task_activity_samples");
  });
});
