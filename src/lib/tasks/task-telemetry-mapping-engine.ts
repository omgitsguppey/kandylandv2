import { classifySourceWindowZeroShell } from "@/lib/debug/source-window-zero-shell-classifier";
import type { TaskTelemetryMappingReconstructionReport } from "@/lib/tasks/task-telemetry-mapping-contract";

export function buildTaskTelemetryMappingReconstruction(input: {
  catalogEventCount: number;
  mappingRowCount: number;
  taskTriggerReadyCount?: number;
  taskTriggerPartialCount?: number;
  taskTriggerMissingCount?: number;
  lifecycleEventCount?: number;
  supportingTelemetryCount?: number;
  sharedEventsNeedingCriteria?: number;
  unsupportedRuntimeCount?: number;
  taskActivityLifecycleSamples?: number;
  aliasScanned?: boolean;
  sourceWindowStartUtc?: string | null;
  sourceWindowEndUtc?: string | null;
  generatedAtUtc?: string | null;
  sourcePath?: string | null;
}): TaskTelemetryMappingReconstructionReport {
  const contradictions: string[] = [];
  if ((input.taskActivityLifecycleSamples ?? 0) > 0 && (input.lifecycleEventCount ?? 0) === 0) {
    contradictions.push("lifecycle_events_contradict_task_activity_samples");
  }
  if (input.catalogEventCount > 0 && input.mappingRowCount === 0) {
    contradictions.push("tracked_events_zero_while_catalog_has_task_events");
  }
  if (!input.aliasScanned) {
    contradictions.push("aliases_unscanned");
  }

  const status = classifySourceWindowZeroShell({
    rowsLoaded: input.mappingRowCount,
    sampleCount: input.mappingRowCount,
    sourceWindowStartUtc: input.sourceWindowStartUtc,
    sourceWindowEndUtc: input.sourceWindowEndUtc,
    generatedAtUtc: input.generatedAtUtc,
    sourcePath: input.sourcePath,
    sourceExists: Boolean(input.sourcePath),
    sourceReady: Boolean(input.sourcePath),
    formulaState: "documented",
    freshnessState: input.generatedAtUtc ? "fresh" : "unknown",
    nextAction: contradictions.length > 0
      ? `Resolve telemetry mapping contradiction: ${contradictions[0]}.`
      : "Review missing task triggers and shared event criteria before promoting task telemetry mapping.",
  });

  return {
    status,
    taskTriggerReadyCount: Math.max(0, input.taskTriggerReadyCount ?? 0),
    taskTriggerPartialCount: Math.max(0, input.taskTriggerPartialCount ?? 0),
    taskTriggerMissingCount: Math.max(0, input.taskTriggerMissingCount ?? 0),
    lifecycleEventCount: Math.max(0, input.lifecycleEventCount ?? 0),
    supportingTelemetryCount: Math.max(0, input.supportingTelemetryCount ?? 0),
    sharedEventsNeedingCriteria: Math.max(0, input.sharedEventsNeedingCriteria ?? 0),
    unsupportedRuntimeCount: Math.max(0, input.unsupportedRuntimeCount ?? 0),
    catalogEventCount: Math.max(0, input.catalogEventCount),
    aliasScanStatus: input.aliasScanned ? "scanned" : "not_scanned",
    contradictions,
    nextAction: status.nextAction,
  };
}
