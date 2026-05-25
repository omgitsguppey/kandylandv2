import { classifySourceWindowZeroShell } from "@/lib/debug/source-window-zero-shell-classifier";
import type { TaskCatalogRuntimeReconstructionReport } from "@/lib/tasks/task-catalog-coverage-contract";

export function buildTaskCatalogRuntimeReconstruction(input: {
  builtInCount: number;
  readyCount?: number;
  partialCount?: number;
  unsupportedCount?: number;
  rewardRiskCount?: number;
  trackingGapCount?: number;
  completionGapCount?: number;
  sourceMix?: Partial<TaskCatalogRuntimeReconstructionReport["sourceMix"]>;
  rewardVersion?: number | null;
  multiplierPct?: number | null;
  builtInAvgGd?: number | null;
  legacyCustomCount?: number;
  sourceWindowStartUtc?: string | null;
  sourceWindowEndUtc?: string | null;
  generatedAtUtc?: string | null;
  sourcePath?: string | null;
}): TaskCatalogRuntimeReconstructionReport {
  const builtInCount = Math.max(0, input.builtInCount);
  const rewardConfigLoaded = Boolean(input.rewardVersion && input.multiplierPct && input.builtInAvgGd);
  const status = classifySourceWindowZeroShell({
    rowsLoaded: builtInCount,
    sampleCount: builtInCount,
    sourceWindowStartUtc: input.sourceWindowStartUtc,
    sourceWindowEndUtc: input.sourceWindowEndUtc,
    generatedAtUtc: input.generatedAtUtc,
    sourcePath: input.sourcePath,
    sourceExists: Boolean(input.sourcePath),
    sourceReady: Boolean(input.sourcePath),
    formulaState: rewardConfigLoaded ? "documented" : "missing",
    freshnessState: input.generatedAtUtc ? "fresh" : "unknown",
    nextAction: builtInCount === 0
      ? "Load built-in task definitions from the catalog before displaying task coverage as loaded."
      : "Inspect tracking and completion gaps before treating task catalog coverage as verified.",
  });

  return {
    status,
    builtInCount,
    readyCount: Math.max(0, input.readyCount ?? 0),
    partialCount: Math.max(0, input.partialCount ?? 0),
    unsupportedCount: Math.max(0, input.unsupportedCount ?? 0),
    rewardRiskCount: Math.max(0, input.rewardRiskCount ?? 0),
    trackingGapCount: Math.max(0, input.trackingGapCount ?? 0),
    completionGapCount: Math.max(0, input.completionGapCount ?? 0),
    sourceMix: {
      canonical: Math.max(0, input.sourceMix?.canonical ?? 0),
      telemetry: Math.max(0, input.sourceMix?.telemetry ?? 0),
      legacy: Math.max(0, input.sourceMix?.legacy ?? 0),
    },
    rewardVersion: input.rewardVersion ?? null,
    multiplierPct: input.multiplierPct ?? null,
    builtInAvgGd: input.builtInAvgGd ?? null,
    legacyCustomCount: Math.max(0, input.legacyCustomCount ?? 0),
    sampleWindow: {
      startUtc: input.sourceWindowStartUtc ?? null,
      endUtc: input.sourceWindowEndUtc ?? null,
    },
    generatedAtUtc: input.generatedAtUtc ?? null,
    nextAction: status.nextAction,
  };
}
