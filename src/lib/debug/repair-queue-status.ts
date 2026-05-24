export function classifyRepairQueueStatus(input: {
  actionableRepairs: number;
  inspectOnly: number;
  duplicatesCollapsed: number;
  contaminationRisks: number;
  orchestrationSampleLoaded: boolean;
}) {
  if (!input.orchestrationSampleLoaded) {
    return {
      status: "source_ready_no_sample_loaded" as const,
      sampleLoaded: false,
      provenZero: false,
      nextAction: "Load the repair orchestration sample before treating repairs=0 as healthy.",
    };
  }
  if (input.contaminationRisks > 0 || input.actionableRepairs > 0) {
    return {
      status: "degraded_current" as const,
      sampleLoaded: true,
      provenZero: false,
      nextAction: "Review repair proposals and contamination risks before any human-approved apply path.",
    };
  }
  return {
    status: "healthy_proven_zero" as const,
    sampleLoaded: true,
    provenZero: true,
    nextAction: "No current repair proposals are open in the loaded orchestration sample.",
  };
}
