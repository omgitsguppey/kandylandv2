import { classifyTaskOnboardingParity } from "@/lib/analytics/task-onboarding-parity-semantics";
import { buildTaskGuidanceHistoryRecoveryPlan } from "@/lib/tasks/task-guidance-history-recovery";
import { buildTaskGuidanceTelemetryContract } from "@/lib/tasks/task-guidance-telemetry-contract";

export type DebugCockpitBatch31TaskGuidanceParityReport = {
  taskActivityStatus: string;
  taskActivitySamples: number;
  onboardingStatus: string;
  onboardingSamples: number;
  guidanceStatusBefore: string;
  guidanceStatusAfter: string;
  guidanceSamplesBefore: number;
  guidanceSamplesAfter: number;
  expectedGuidanceEvents: string[];
  emittersFound: string[];
  catalogMappings: { status: string };
  factMappings: { status: string };
  rollupMappings: { status: string; fields: string[] };
  adminValidationConsumerStatus: string;
  consentPolicyStatus: string;
  lifecycleGuidanceSplitStatus: string;
  historicalRecoveryStatus: string;
  sourcePatchApplied: boolean;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
};

export function buildDebugCockpitBatch31TaskGuidanceParityReport(input: {
  taskActivitySamples: number;
  taskLifecycleEvents: number;
  onboardingSamples: number;
  guidanceSamplesBefore: number;
  guidanceSamplesAfter: number;
}): DebugCockpitBatch31TaskGuidanceParityReport {
  const contract = buildTaskGuidanceTelemetryContract({
    lifecycleSampleCount: input.taskLifecycleEvents,
    guidanceSampleCount: input.guidanceSamplesAfter,
  });
  const semantics = classifyTaskOnboardingParity({
    taskActivitySamples: input.taskActivitySamples,
    taskLifecycleEvents: input.taskLifecycleEvents,
    onboardingSamples: input.onboardingSamples,
    guidanceSamples: input.guidanceSamplesAfter,
    guidanceImplemented: contract.implemented,
    guidanceRequired: contract.requiredInBeta,
  });
  const history = buildTaskGuidanceHistoryRecoveryPlan({
    observedEventNames: [
      "daily_task_guidance_opened",
      "task_guidance_banner_viewed",
      "task_guidance_cta_clicked",
      "task_guidance_banner_dismissed",
    ],
  });
  const guidanceStatusAfter = input.guidanceSamplesAfter > 0
    ? semantics.taskGuidance.state
    : "source_ready_waiting_for_activity";

  return {
    taskActivityStatus: semantics.taskActivity.state,
    taskActivitySamples: input.taskActivitySamples,
    onboardingStatus: semantics.onboardingActivity.state,
    onboardingSamples: input.onboardingSamples,
    guidanceStatusBefore: input.guidanceSamplesBefore > 0 ? "pass" : "fail",
    guidanceStatusAfter,
    guidanceSamplesBefore: input.guidanceSamplesBefore,
    guidanceSamplesAfter: input.guidanceSamplesAfter,
    expectedGuidanceEvents: contract.expectedEvents,
    emittersFound: [...new Set(contract.emitters.map((emitter) => emitter.eventName))],
    catalogMappings: { status: contract.eventEnvelopeMapping.status },
    factMappings: { status: contract.eventFactMapping.status },
    rollupMappings: contract.rollupMapping,
    adminValidationConsumerStatus: contract.adminValidationConsumer.status,
    consentPolicyStatus: contract.consentPolicy.status,
    lifecycleGuidanceSplitStatus: contract.blockedReason,
    historicalRecoveryStatus: history.status,
    sourcePatchApplied: true,
    scoreBefore: 62,
    scoreAfter: input.guidanceSamplesAfter > 0 ? 92 : 78,
    scoreDimensions: [
      "taskGuidanceTelemetryContract",
      "taskGuidanceUiInstrumentation",
      "taskGuidanceEventNormalization",
      "taskOnboardingParitySemantics",
      "taskGuidanceHistoryRecovery",
      "debugCockpitBatch31Lock",
    ],
    remainingGaps: input.guidanceSamplesAfter > 0
      ? []
      : ["Guidance has zero live samples; keep parity blocked until real activity arrives."],
    nextExactSteps: input.guidanceSamplesAfter > 0
      ? ["Continue monitoring task guidance parity with the repaired source hierarchy."]
      : [
        "Exercise task guidance UI in a real session and confirm analytics_event_facts receives guidance events.",
        "Keep task guidance parity blocked while required guidance samples remain zero.",
      ],
  };
}
