export const SATISFACTION_SCORE_VERSION = "2026.05.satisfaction.1";

export const SATISFACTION_PROMPT_MIN_COMPLETION_QUALITY = 0.55;
export const SATISFACTION_PROMPT_COOLDOWN_DAYS = 14;
export const SATISFACTION_SIGNAL_HALF_LIFE_DAYS = 30;

export const SATISFACTION_EVENT_NAMES = [
  "content_satisfaction_positive",
  "content_satisfaction_negative",
  "content_satisfaction_skipped",
  "recommendation_reason_helpful",
  "recommendation_reason_not_helpful",
] as const;

export type SatisfactionEventName = typeof SATISFACTION_EVENT_NAMES[number];

export type SatisfactionEntityRecord = {
  entityId: string;
  latestAtMs?: number;
  positiveCount?: number;
  negativeCount?: number;
  skippedCount?: number;
  helpfulReasonCount?: number;
  notHelpfulReasonCount?: number;
  satisfactionScore?: number;
  eventNames?: string[];
};

export type SatisfactionProfile = {
  version: 1;
  latestAtMs?: number;
  halfLifeDays?: number;
  drops?: Record<string, SatisfactionEntityRecord>;
  creators?: Record<string, SatisfactionEntityRecord>;
  categories?: Record<string, SatisfactionEntityRecord>;
  recommendationReasons?: Record<string, SatisfactionEntityRecord>;
};

export type SatisfactionScoreInput = {
  explicitRating: number;
  completionQuality: number;
  repeatCreatorInterest: number;
  feedbackRecency: number;
  lowRefundRisk: number;
};

export type SatisfactionScoreResult = {
  version: typeof SATISFACTION_SCORE_VERSION;
  satisfactionScore: number;
  label: "satisfied" | "neutral" | "unsatisfied";
  recommendationBoost: number;
  suppressionScore: number;
  components: SatisfactionScoreInput;
  reasons: string[];
};

export function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** digits;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function decayByHalfLife(input: {
  latestAtMs?: number;
  nowMs: number;
  halfLifeDays?: number;
}) {
  if (!input.latestAtMs || input.latestAtMs <= 0 || input.latestAtMs > input.nowMs) {
    return 0;
  }

  const halfLifeMs = (input.halfLifeDays || SATISFACTION_SIGNAL_HALF_LIFE_DAYS) * 24 * 60 * 60 * 1000;
  const ageMs = Math.max(0, input.nowMs - input.latestAtMs);
  return clamp01(0.5 ** (ageMs / halfLifeMs));
}

function normalizeRecordRating(record?: SatisfactionEntityRecord) {
  if (!record) {
    return null;
  }

  if (typeof record.satisfactionScore === "number") {
    return clamp01(record.satisfactionScore);
  }

  const positive = Math.max(0, record.positiveCount || 0);
  const negative = Math.max(0, record.negativeCount || 0);
  const skipped = Math.max(0, record.skippedCount || 0);
  const helpful = Math.max(0, record.helpfulReasonCount || 0);
  const notHelpful = Math.max(0, record.notHelpfulReasonCount || 0);
  const total = positive + negative + skipped + helpful + notHelpful;

  if (total <= 0) {
    return null;
  }

  return clamp01(((positive + helpful) + (skipped * 0.5)) / total);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeSatisfactionScore(input: SatisfactionScoreInput): SatisfactionScoreResult {
  const explicitRating = clamp01(input.explicitRating);
  const completionQuality = clamp01(input.completionQuality);
  const repeatCreatorInterest = clamp01(input.repeatCreatorInterest);
  const feedbackRecency = clamp01(input.feedbackRecency);
  const lowRefundRisk = clamp01(input.lowRefundRisk);
  const satisfactionScore = clamp01(
    (0.35 * explicitRating) +
    (0.25 * completionQuality) +
    (0.20 * repeatCreatorInterest) +
    (0.10 * feedbackRecency) +
    (0.10 * lowRefundRisk),
  );
  const label = satisfactionScore >= 0.62
    ? "satisfied"
    : satisfactionScore <= 0.42
      ? "unsatisfied"
      : "neutral";
  const recommendationBoost = round((satisfactionScore - 0.5) * 12, 2);
  const suppressionScore = label === "unsatisfied"
    ? clamp01((0.42 - satisfactionScore) / 0.42)
    : 0;
  const reasons: string[] = [];

  if (label === "satisfied") {
    reasons.push("Boosted because similar Drops earned satisfaction feedback.");
  }
  if (label === "unsatisfied") {
    reasons.push("Lowered because recent satisfaction feedback was negative.");
  }
  if (feedbackRecency > 0.65) {
    reasons.push("Recent satisfaction feedback is active for this recommendation.");
  }

  return {
    version: SATISFACTION_SCORE_VERSION,
    satisfactionScore: round(satisfactionScore),
    label,
    recommendationBoost,
    suppressionScore: round(suppressionScore),
    components: {
      explicitRating,
      completionQuality,
      repeatCreatorInterest,
      feedbackRecency,
      lowRefundRisk,
    },
    reasons,
  };
}

export function shouldPromptForContentSatisfaction(input: {
  meaningfulConsumption: boolean;
  completionQuality: number;
  lastPromptAtMs?: number;
  nowMs?: number;
  cooldownDays?: number;
}) {
  if (!input.meaningfulConsumption || clamp01(input.completionQuality) < SATISFACTION_PROMPT_MIN_COMPLETION_QUALITY) {
    return false;
  }

  const nowMs = input.nowMs ?? Date.now();
  const cooldownMs = (input.cooldownDays || SATISFACTION_PROMPT_COOLDOWN_DAYS) * 24 * 60 * 60 * 1000;
  return !input.lastPromptAtMs || nowMs - input.lastPromptAtMs >= cooldownMs;
}

export function isSatisfactionEventName(eventName: string): eventName is SatisfactionEventName {
  return (SATISFACTION_EVENT_NAMES as readonly string[]).includes(eventName);
}

export function buildRecommendationSatisfactionSignal(input: {
  dropId: string;
  creatorId?: string;
  category?: string;
  profile?: SatisfactionProfile | null;
  dropSatisfactionScore?: number;
  completionQuality?: number;
  repeatCreatorInterest?: number;
  lowRefundRisk?: number;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const profile = input.profile ?? null;
  const dropRecord = input.dropId ? profile?.drops?.[input.dropId] : undefined;
  const creatorRecord = input.creatorId ? profile?.creators?.[input.creatorId] : undefined;
  const categoryRecord = input.category ? profile?.categories?.[input.category] : undefined;
  const ratings = [
    normalizeRecordRating(dropRecord),
    normalizeRecordRating(creatorRecord),
    normalizeRecordRating(categoryRecord),
    typeof input.dropSatisfactionScore === "number" ? clamp01(input.dropSatisfactionScore) : null,
  ].filter((value): value is number => value !== null);
  const latestAtMs = Math.max(
    0,
    profile?.latestAtMs || 0,
    dropRecord?.latestAtMs || 0,
    creatorRecord?.latestAtMs || 0,
    categoryRecord?.latestAtMs || 0,
  );
  const explicitRating = ratings.length > 0 ? average(ratings) : 0.5;
  const result = computeSatisfactionScore({
    explicitRating,
    completionQuality: input.completionQuality ?? 0.5,
    repeatCreatorInterest: input.repeatCreatorInterest ?? 0,
    feedbackRecency: decayByHalfLife({
      latestAtMs,
      nowMs,
      halfLifeDays: profile?.halfLifeDays,
    }),
    lowRefundRisk: input.lowRefundRisk ?? 1,
  });

  return {
    ...result,
    latestAtMs,
    hasExplicitSatisfactionSignal: ratings.length > 0,
  };
}
