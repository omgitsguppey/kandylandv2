export const BEHAVIORAL_EXPERIMENT_METRICS = [
  "purchase_7d",
  "unlock_24h",
  "watch_completion",
  "return_7d",
  "negative_feedback",
  "support_complaints",
] as const;

export type BehavioralExperimentMetric = typeof BEHAVIORAL_EXPERIMENT_METRICS[number];

export type BehavioralExperimentStatus =
  | "draft"
  | "running"
  | "holdout_active"
  | "ready_to_activate"
  | "rolled_back"
  | "stopped";

export type BehavioralExperimentVariant = "control" | "variant";

export type BehavioralExperimentConfigInput = {
  experimentId: string;
  name: string;
  owner: string;
  riskyRankingChange?: boolean;
  variantTrafficPercent?: number;
  successMetric?: BehavioralExperimentMetric;
  guardrailMetrics?: BehavioralExperimentMetric[];
  rollbackRule?: string;
  minimumSampleSize?: number;
  minimumLift?: number;
  epsilon?: number;
  startedAtMs?: number;
  endedAtMs?: number;
  status?: BehavioralExperimentStatus;
};

export type BehavioralExperimentConfig = {
  experimentId: string;
  name: string;
  owner: string;
  riskyRankingChange: boolean;
  variantTrafficPercent: number;
  controlTrafficPercent: number;
  successMetric?: BehavioralExperimentMetric;
  guardrailMetrics: BehavioralExperimentMetric[];
  rollbackRule?: string;
  minimumSampleSize: number;
  minimumLift: number;
  epsilon: number;
  startedAtMs?: number;
  endedAtMs?: number;
  status: BehavioralExperimentStatus;
};

export type BehavioralExperimentMetricSnapshot = {
  sampleSize: number;
  rates: Partial<Record<BehavioralExperimentMetric, number>>;
  observedUntilMs?: number;
};

export type BehavioralExperimentConfidenceInterval = {
  metric: BehavioralExperimentMetric;
  lower: number;
  upper: number;
};

export type BehavioralExperimentEvaluationInput = {
  config: BehavioralExperimentConfigInput;
  control: BehavioralExperimentMetricSnapshot;
  variant: BehavioralExperimentMetricSnapshot;
  confidenceInterval?: BehavioralExperimentConfidenceInterval;
  trainingCutoffMs?: number;
  trainingEventTimestampsMs?: number[];
};

export type BehavioralExperimentGuardrailResult = {
  metric: BehavioralExperimentMetric;
  controlRate: number;
  variantRate: number;
  lift: number;
  worsened: boolean;
};

export type BehavioralExperimentEvaluationResult = {
  experimentId: string;
  successMetric?: BehavioralExperimentMetric;
  controlSampleSize: number;
  variantSampleSize: number;
  totalSampleSize: number;
  lift: number;
  canActivate: boolean;
  status: "invalid_config" | "needs_more_sample" | "guardrail_failed" | "future_leakage" | "ci_crosses_zero" | "insufficient_lift" | "ready_to_activate";
  guardrails: BehavioralExperimentGuardrailResult[];
  futureLeakage: FutureEventLeakageResult;
  confidenceIntervalCrossesZero: boolean;
  reasons: string[];
};

export type FutureEventLeakageResult = {
  valid: boolean;
  cutoffMs?: number;
  futureEventCount: number;
  latestFutureEventMs?: number;
};

export const DEFAULT_RISKY_RANKING_VARIANT_TRAFFIC_PERCENT = 10;
export const DEFAULT_RISKY_RANKING_CONTROL_TRAFFIC_PERCENT = 90;
export const DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_SAMPLE_SIZE = 200;
export const DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_LIFT = 0.02;
export const DEFAULT_BEHAVIORAL_EXPERIMENT_EPSILON = 0.000001;

export const BEHAVIORAL_EXPERIMENT_GUARDRAIL_METRICS = [
  "negative_feedback",
  "support_complaints",
] as const satisfies readonly BehavioralExperimentMetric[];

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function isBehavioralExperimentMetric(value: string | undefined): value is BehavioralExperimentMetric {
  return BEHAVIORAL_EXPERIMENT_METRICS.includes(value as BehavioralExperimentMetric);
}

export function resolveBehavioralExperimentTraffic(input: {
  riskyRankingChange?: boolean;
  variantTrafficPercent?: number;
}) {
  const variantTrafficPercent = clampPercent(
    input.variantTrafficPercent ?? (
      input.riskyRankingChange
        ? DEFAULT_RISKY_RANKING_VARIANT_TRAFFIC_PERCENT
        : 50
    ),
  );

  return {
    variantTrafficPercent,
    controlTrafficPercent: 100 - variantTrafficPercent,
  };
}

export function normalizeBehavioralExperimentConfig(input: BehavioralExperimentConfigInput): BehavioralExperimentConfig {
  const riskyRankingChange = input.riskyRankingChange ?? true;
  const traffic = resolveBehavioralExperimentTraffic({
    riskyRankingChange,
    variantTrafficPercent: input.variantTrafficPercent,
  });
  const guardrailMetrics = input.guardrailMetrics?.filter((metric) => isBehavioralExperimentMetric(metric)) ?? [
    ...BEHAVIORAL_EXPERIMENT_GUARDRAIL_METRICS,
  ];

  return {
    experimentId: input.experimentId,
    name: input.name,
    owner: input.owner,
    riskyRankingChange,
    variantTrafficPercent: traffic.variantTrafficPercent,
    controlTrafficPercent: traffic.controlTrafficPercent,
    successMetric: input.successMetric,
    guardrailMetrics,
    rollbackRule: input.rollbackRule,
    minimumSampleSize: Math.max(0, Math.round(input.minimumSampleSize ?? DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_SAMPLE_SIZE)),
    minimumLift: input.minimumLift ?? DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_LIFT,
    epsilon: input.epsilon ?? DEFAULT_BEHAVIORAL_EXPERIMENT_EPSILON,
    startedAtMs: input.startedAtMs,
    endedAtMs: input.endedAtMs,
    status: input.status ?? "draft",
  };
}

export function validateBehavioralExperimentConfig(input: BehavioralExperimentConfigInput) {
  const config = normalizeBehavioralExperimentConfig(input);
  const errors: string[] = [];

  if (!config.experimentId.trim()) {
    errors.push("Experiment must define experimentId.");
  }

  if (!config.name.trim()) {
    errors.push("Experiment must define a human-readable name.");
  }

  if (!config.owner.trim()) {
    errors.push("Experiment must define an owner.");
  }

  if (!config.successMetric || !isBehavioralExperimentMetric(config.successMetric)) {
    errors.push("Experiment must define a valid successMetric.");
  }

  if (!config.rollbackRule?.trim()) {
    errors.push("Experiment must define a rollbackRule.");
  }

  if (config.minimumSampleSize < DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_SAMPLE_SIZE) {
    errors.push(`Experiment minimumSampleSize must be at least ${DEFAULT_BEHAVIORAL_EXPERIMENT_MIN_SAMPLE_SIZE}.`);
  }

  return {
    valid: errors.length === 0,
    config,
    errors,
  };
}

export function computeBehavioralExperimentLift(metricVariant: number, metricControl: number, epsilon = DEFAULT_BEHAVIORAL_EXPERIMENT_EPSILON) {
  const safeVariant = Number.isFinite(metricVariant) ? metricVariant : 0;
  const safeControl = Number.isFinite(metricControl) ? metricControl : 0;

  return (safeVariant - safeControl) / Math.max(safeControl, epsilon);
}

export function validateNoFutureEventsInTraining(input: {
  trainingCutoffMs?: number;
  trainingEventTimestampsMs?: number[];
}): FutureEventLeakageResult {
  if (!Number.isFinite(input.trainingCutoffMs)) {
    return {
      valid: true,
      cutoffMs: input.trainingCutoffMs,
      futureEventCount: 0,
    };
  }

  const cutoffMs = Number(input.trainingCutoffMs);
  const futureEvents = (input.trainingEventTimestampsMs ?? [])
    .filter((timestampMs) => Number.isFinite(timestampMs) && timestampMs > cutoffMs);

  return {
    valid: futureEvents.length === 0,
    cutoffMs,
    futureEventCount: futureEvents.length,
    latestFutureEventMs: futureEvents.length > 0 ? Math.max(...futureEvents) : undefined,
  };
}

export function confidenceIntervalCrossesZero(confidenceInterval: BehavioralExperimentConfidenceInterval | undefined) {
  if (!confidenceInterval) {
    return false;
  }

  return confidenceInterval.lower <= 0 && confidenceInterval.upper >= 0;
}

export function evaluateBehavioralExperiment(input: BehavioralExperimentEvaluationInput): BehavioralExperimentEvaluationResult {
  const validation = validateBehavioralExperimentConfig(input.config);
  const config = validation.config;
  const successMetric = config.successMetric;
  const controlSampleSize = Math.max(0, Math.round(input.control.sampleSize || 0));
  const variantSampleSize = Math.max(0, Math.round(input.variant.sampleSize || 0));
  const totalSampleSize = controlSampleSize + variantSampleSize;
  const controlSuccessRate = successMetric ? clamp01(input.control.rates[successMetric] ?? 0) : 0;
  const variantSuccessRate = successMetric ? clamp01(input.variant.rates[successMetric] ?? 0) : 0;
  const lift = computeBehavioralExperimentLift(variantSuccessRate, controlSuccessRate, config.epsilon);
  const futureLeakage = validateNoFutureEventsInTraining({
    trainingCutoffMs: input.trainingCutoffMs,
    trainingEventTimestampsMs: input.trainingEventTimestampsMs,
  });
  const ciCrossesZero = confidenceIntervalCrossesZero(input.confidenceInterval);
  const guardrails = config.guardrailMetrics.map((metric) => {
    const controlRate = clamp01(input.control.rates[metric] ?? 0);
    const variantRate = clamp01(input.variant.rates[metric] ?? 0);
    const guardrailLift = computeBehavioralExperimentLift(variantRate, controlRate, config.epsilon);

    return {
      metric,
      controlRate,
      variantRate,
      lift: guardrailLift,
      worsened: variantRate > controlRate,
    };
  });
  const worsenedGuardrails = guardrails.filter((guardrail) => guardrail.worsened);
  const reasons = [...validation.errors];

  if (totalSampleSize < config.minimumSampleSize) {
    reasons.push(`Sample size ${totalSampleSize} is below ${config.minimumSampleSize}.`);
  }

  if (worsenedGuardrails.length > 0) {
    reasons.push(`Guardrail metrics worsened: ${worsenedGuardrails.map((guardrail) => guardrail.metric).join(", ")}.`);
  }

  if (!futureLeakage.valid) {
    reasons.push(`Training validation includes ${futureLeakage.futureEventCount} future event(s).`);
  }

  if (ciCrossesZero) {
    reasons.push("Confidence interval crosses zero.");
  }

  if (lift <= config.minimumLift) {
    reasons.push(`Lift ${lift.toFixed(4)} is not above threshold ${config.minimumLift}.`);
  }

  const status: BehavioralExperimentEvaluationResult["status"] = !validation.valid
    ? "invalid_config"
    : totalSampleSize < config.minimumSampleSize
      ? "needs_more_sample"
      : worsenedGuardrails.length > 0
        ? "guardrail_failed"
        : !futureLeakage.valid
          ? "future_leakage"
          : ciCrossesZero
            ? "ci_crosses_zero"
            : lift <= config.minimumLift
              ? "insufficient_lift"
              : "ready_to_activate";

  return {
    experimentId: config.experimentId,
    successMetric,
    controlSampleSize,
    variantSampleSize,
    totalSampleSize,
    lift,
    canActivate: status === "ready_to_activate",
    status,
    guardrails,
    futureLeakage,
    confidenceIntervalCrossesZero: ciCrossesZero,
    reasons,
  };
}
