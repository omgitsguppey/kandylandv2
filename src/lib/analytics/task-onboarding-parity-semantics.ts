export type TaskOnboardingParityState = "pass" | "partial" | "fail" | "unavailable";

export type TaskOnboardingParityDimension = {
  state: TaskOnboardingParityState;
  sampleCount: number;
  technicalEvidence: string;
  copy: string;
};

export type TaskOnboardingParitySemantics = {
  taskActivity: TaskOnboardingParityDimension;
  onboardingActivity: TaskOnboardingParityDimension;
  taskGuidance: TaskOnboardingParityDimension;
  overall: {
    state: "pass" | "partial" | "fail";
    nextAction: string;
  };
};

export function classifyTaskOnboardingParity(input: {
  taskActivitySamples: number;
  taskLifecycleEvents: number;
  onboardingSamples: number;
  guidanceSamples: number;
  guidanceImplemented: boolean;
  guidanceRequired: boolean;
}): TaskOnboardingParitySemantics {
  const taskActivitySamples = Math.max(0, input.taskActivitySamples);
  const taskLifecycleEvents = Math.max(0, input.taskLifecycleEvents);
  const onboardingSamples = Math.max(0, input.onboardingSamples);
  const guidanceSamples = Math.max(0, input.guidanceSamples);
  const guidanceMissing = input.guidanceImplemented && input.guidanceRequired && guidanceSamples === 0;

  const taskActivity: TaskOnboardingParityDimension = {
    state: taskActivitySamples > 0 || taskLifecycleEvents > 0 ? "pass" : "fail",
    sampleCount: taskActivitySamples,
    technicalEvidence: `${taskLifecycleEvents.toLocaleString()} canonical task lifecycle event(s) and ${taskActivitySamples.toLocaleString()} raw lifecycle sample(s) were observed.`,
    copy: "Task activity measures task lifecycle logs and canonical task rollups.",
  };
  const onboardingActivity: TaskOnboardingParityDimension = {
    state: onboardingSamples > 0 ? "pass" : "fail",
    sampleCount: onboardingSamples,
    technicalEvidence: `${onboardingSamples.toLocaleString()} onboarding start/completion sample(s) were observed in range.`,
    copy: "Onboarding activity measures onboarding starts and completions only.",
  };
  const taskGuidance: TaskOnboardingParityDimension = {
    state: !input.guidanceImplemented
      ? "unavailable"
      : guidanceMissing
        ? "fail"
        : guidanceSamples > 0
          ? "pass"
          : "partial",
    sampleCount: guidanceSamples,
    technicalEvidence: guidanceSamples > 0
      ? `${guidanceSamples.toLocaleString()} task guidance UI event(s) were observed.`
      : "0 task guidance UI events were observed. Expected guidance view/tap/dismiss/complete/card/help events remain required.",
    copy: guidanceMissing
      ? "Lifecycle and onboarding are active, but guidance UI telemetry is missing."
      : "Task guidance measures UI exposure, task-help opens, taps, dismissals, and guided completions.",
  };
  const overallState = taskGuidance.state === "fail"
    ? "partial"
    : taskActivity.state === "pass" && onboardingActivity.state === "pass" && taskGuidance.state === "pass"
      ? "pass"
      : "fail";

  return {
    taskActivity,
    onboardingActivity,
    taskGuidance,
    overall: {
      state: overallState,
      nextAction: taskGuidance.state === "fail"
        ? "Keep task activity and onboarding activity separate; fix or wait for required task guidance UI telemetry before promoting onboarding/task parity."
        : overallState === "pass"
          ? "No action required."
          : "Review missing task/onboarding samples before promoting parity.",
    },
  };
}
