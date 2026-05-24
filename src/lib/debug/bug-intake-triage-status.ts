export function classifyBugIntakeTriageStatus(input: {
  loaded: number;
  last7d: number;
  olderBacklog: number;
  needsTriage: number;
  intakeSampleLoaded: boolean;
  sourceWindow?: { from: string; to: string } | null;
}) {
  if (!input.intakeSampleLoaded) {
    return {
      status: "source_ready_no_sample_loaded" as const,
      currentIntakeCount: 0,
      olderBacklogCount: input.olderBacklog,
      provenZero: false,
      nextAction: "Load the bug intake sample before treating loaded=0 as healthy.",
    };
  }
  if (input.loaded === 0 && input.last7d === 0 && input.needsTriage === 0 && input.sourceWindow) {
    return {
      status: "healthy_proven_zero" as const,
      currentIntakeCount: 0,
      olderBacklogCount: input.olderBacklog,
      provenZero: true,
      nextAction: "No current bug reports were found in the loaded source window.",
    };
  }
  return {
    status: input.needsTriage > 0 ? "degraded_current" as const : "sample_unavailable" as const,
    currentIntakeCount: input.loaded,
    olderBacklogCount: input.olderBacklog,
    provenZero: false,
    nextAction: input.needsTriage > 0
      ? "Convert current bug reports that need triage into AI debug work items."
      : "Attach the bug intake source window before calling the lane healthy.",
  };
}
