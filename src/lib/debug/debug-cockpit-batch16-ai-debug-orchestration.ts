import { AI_DEBUG_SCORE_DIMENSIONS } from "./ai-debug-orchestration-contract";
import { buildAiDebugQueueTruthReport } from "./ai-debug-queue-truth";
import { buildManualUtilityRegistry } from "./manual-utility-contract";

export function buildDebugCockpitBatch16Report() {
  const queueTruth = buildAiDebugQueueTruthReport({
    taskIssues: { impactedUsers: 0, sampleLoaded: false, sourceWindow: null },
    repairs: {
      actionableRepairs: 0,
      inspectOnly: 0,
      duplicatesCollapsed: 0,
      contaminationRisks: 0,
      orchestrationSampleLoaded: false,
    },
    bugIntake: {
      loaded: 0,
      last7d: 0,
      olderBacklog: 0,
      needsTriage: 0,
      intakeSampleLoaded: false,
    },
    manualUtilityCount: buildManualUtilityRegistry().summary.total,
  });

  return {
    generatedAtUtc: new Date().toISOString(),
    taskIssueAttributionStatusBefore: "live_zero_sample",
    taskIssueAttributionStatusAfter: queueTruth.taskIssueStatus.status,
    repairQueueStatusBefore: "live_zero_sample",
    repairQueueStatusAfter: queueTruth.repairQueueStatus.status,
    bugTriageStatusBefore: "live_zero_sample",
    bugTriageStatusAfter: queueTruth.bugTriageStatus.status,
    manualUtilityStatus: "manual_utility_not_health",
    aiPlannerStatus: "deterministic_fallback_ready",
    aiCriticStatus: "critic_required_for_source_patch",
    providerCallsInTests: false,
    deterministicFallbackStatus: "ready",
    budgetGuardStatus: "source_visible",
    privacyRedactionStatus: "raw_bodies_blocked",
    workItemQueueStatus: queueTruth.workItems.length === 0 ? "source_ready_no_sample_loaded" : "queued",
    repairProposalStatus: "human_approval_required",
    contaminationRiskStatus: queueTruth.contaminationRiskGate,
    scoreBefore: 79,
    scoreAfter: 79,
    scoreDimensions: [...AI_DEBUG_SCORE_DIMENSIONS],
    remainingGaps: [
      "No live task, bug, or repair orchestration sample is loaded; keep lanes source_ready_no_sample_loaded.",
      "Provider-backed planning remains optional and budget-gated; validators must not call Gemini or Vertex.",
    ],
    nextExactSteps: [
      "Wire loaded task/bug/repair samples into AiDebugWorkItem queue when bounded samples are available.",
      "Require critic review and human approval before any source patch proposal can be applied.",
    ],
  };
}
