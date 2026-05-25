import type { SourceWindowZeroShellClassification } from "@/lib/debug/source-window-zero-shell-classifier";

export interface ExperimentRolloutRegistryReport {
  status: SourceWindowZeroShellClassification;
  configuredCount: number;
  activeCount: number;
  pausedCount: number;
  completedCount: number;
  betaRelatedCount: number;
  actorResolutionStatus: "live" | "review" | "missing";
  assignmentSource: string;
  exposureEventSource: string;
  sampleWindow: {
    startUtc: string | null;
    endUtc: string | null;
  };
  generatedAtUtc: string | null;
}
