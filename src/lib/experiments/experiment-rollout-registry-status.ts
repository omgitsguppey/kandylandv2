import { classifySourceWindowZeroShell } from "@/lib/debug/source-window-zero-shell-classifier";
import type { ExperimentRolloutRegistryReport } from "@/lib/experiments/experiment-rollout-registry-contract";

export function buildExperimentRolloutRegistryStatus(input: {
  configuredCount: number;
  activeCount?: number;
  pausedCount?: number;
  completedCount?: number;
  betaRelatedCount?: number;
  actorResolutionStatus?: "live" | "review" | "missing";
  assignmentSource?: string | null;
  exposureEventSource?: string | null;
  sourceWindowStartUtc?: string | null;
  sourceWindowEndUtc?: string | null;
  generatedAtUtc?: string | null;
  sourcePath?: string | null;
  registryExists?: boolean;
}): ExperimentRolloutRegistryReport {
  const configuredCount = Math.max(0, input.configuredCount);
  const status = classifySourceWindowZeroShell({
    rowsLoaded: configuredCount,
    sampleCount: configuredCount,
    sourceWindowStartUtc: input.sourceWindowStartUtc,
    sourceWindowEndUtc: input.sourceWindowEndUtc,
    generatedAtUtc: input.generatedAtUtc,
    sourcePath: input.sourcePath,
    sourceExists: Boolean(input.sourcePath),
    registryExists: input.registryExists,
    formulaState: "documented",
    freshnessState: input.generatedAtUtc ? "fresh" : "unknown",
    nextAction: configuredCount === 0
      ? "Prove the rollout registry loaded intentionally empty or wire the missing registry source."
      : "Verify assignment and exposure sources for active experiments.",
  });

  return {
    status,
    configuredCount,
    activeCount: Math.max(0, input.activeCount ?? 0),
    pausedCount: Math.max(0, input.pausedCount ?? 0),
    completedCount: Math.max(0, input.completedCount ?? 0),
    betaRelatedCount: Math.max(0, input.betaRelatedCount ?? 0),
    actorResolutionStatus: input.actorResolutionStatus ?? "missing",
    assignmentSource: input.assignmentSource || "unknown",
    exposureEventSource: input.exposureEventSource || "unknown",
    sampleWindow: {
      startUtc: input.sourceWindowStartUtc ?? null,
      endUtc: input.sourceWindowEndUtc ?? null,
    },
    generatedAtUtc: input.generatedAtUtc ?? null,
  };
}
