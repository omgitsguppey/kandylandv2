export type AiDebugLaneTruthStatus =
  | "healthy_proven_zero"
  | "source_ready_no_sample_loaded"
  | "sample_unavailable"
  | "degraded_current";

export type SourceWindow = { from: string; to: string } | null;

export function classifyTaskIssueAttributionStatus(input: {
  impactedUsers: number;
  sampleLoaded: boolean;
  sourceWindow: SourceWindow;
}) {
  if (!input.sampleLoaded) {
    return {
      status: "source_ready_no_sample_loaded" as const,
      provenZero: false,
      sourceWindow: input.sourceWindow,
      nextAction: "Load the task issue attribution sample before treating impacted users=0 as healthy.",
    };
  }
  if (input.impactedUsers === 0 && input.sourceWindow) {
    return {
      status: "healthy_proven_zero" as const,
      provenZero: true,
      sourceWindow: input.sourceWindow,
      nextAction: "No current task assignment issues were found in the loaded source window.",
    };
  }
  return {
    status: input.impactedUsers > 0 ? "degraded_current" as const : "sample_unavailable" as const,
    provenZero: false,
    sourceWindow: input.sourceWindow,
    nextAction: input.impactedUsers > 0
      ? "Convert impacted task issues into AI debug work items."
      : "Attach the task issue source window before calling the lane healthy.",
  };
}
