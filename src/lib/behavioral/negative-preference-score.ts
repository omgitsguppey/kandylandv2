import { clamp01, roundScore } from "@/lib/behavioral/behavioral-math-calibration";

export const NEGATIVE_PREFERENCE_EVENT_NAMES = [
  "drop_not_interested",
  "creator_not_interested",
  "category_not_interested",
  "creator_muted",
  "recommendation_dismissed",
] as const;

export type NegativePreferenceEventName = typeof NEGATIVE_PREFERENCE_EVENT_NAMES[number];

export const NEGATIVE_PREFERENCE_HALF_LIFE_DAYS = 30;

export type NegativePreferenceEntityRecord = {
  entityId: string;
  explicitNegativeFeedback?: number;
  repeatedSkips?: number;
  lowWatchAfterRecommendation?: number;
  latestAtMs?: number;
  eventNames?: string[];
};

export type NegativePreferenceProfile = {
  version: 1;
  halfLifeDays: typeof NEGATIVE_PREFERENCE_HALF_LIFE_DAYS;
  latestAtMs?: number;
  dropIds?: string[];
  creatorIds?: string[];
  mutedCreatorIds?: string[];
  categoryScores?: Record<string, number>;
  repeatedSkipDropIds?: Record<string, number>;
  lowWatchAfterRecommendationDropIds?: Record<string, number>;
  drops?: Record<string, NegativePreferenceEntityRecord>;
  creators?: Record<string, NegativePreferenceEntityRecord>;
  categories?: Record<string, NegativePreferenceEntityRecord>;
};

export type NegativePreferenceScoreInput = {
  explicitNegativeFeedback: number;
  repeatedSkips: number;
  lowWatchAfterRecommendation: number;
  negativeFeedbackRecency: number;
  creatorMuteStrength: number;
  latestNegativeAtMs?: number;
  nowMs?: number;
  creatorMuted?: boolean;
};

export type NegativePreferenceScoreResult = {
  suppressionScore: number;
  decayMultiplier: number;
  signals: {
    explicitNegativeFeedback: number;
    repeatedSkips: number;
    lowWatchAfterRecommendation: number;
    negativeFeedbackRecency: number;
    creatorMuteStrength: number;
  };
};

export function isNegativePreferenceEventName(eventName: string): eventName is NegativePreferenceEventName {
  return (NEGATIVE_PREFERENCE_EVENT_NAMES as readonly string[]).includes(eventName);
}

export function computeNegativePreferenceDecay(input: {
  latestNegativeAtMs?: number;
  nowMs?: number;
  creatorMuted?: boolean;
  halfLifeDays?: number;
}) {
  if (input.creatorMuted) {
    return 1;
  }

  const latestNegativeAtMs = Math.max(0, input.latestNegativeAtMs || 0);
  if (latestNegativeAtMs <= 0) {
    return 0;
  }

  const nowMs = input.nowMs ?? Date.now();
  const halfLifeDays = Math.max(1, input.halfLifeDays ?? NEGATIVE_PREFERENCE_HALF_LIFE_DAYS);
  const ageDays = Math.max(0, (nowMs - latestNegativeAtMs) / (24 * 60 * 60 * 1000));
  return clamp01(0.5 ** (ageDays / halfLifeDays));
}

export function computeNegativePreferenceScore(input: NegativePreferenceScoreInput): NegativePreferenceScoreResult {
  const decayMultiplier = computeNegativePreferenceDecay({
    latestNegativeAtMs: input.latestNegativeAtMs,
    nowMs: input.nowMs,
    creatorMuted: input.creatorMuted,
  });
  const applyDecay = (value: number) => clamp01(value) * decayMultiplier;
  const explicitNegativeFeedback = applyDecay(input.explicitNegativeFeedback);
  const repeatedSkips = applyDecay(input.repeatedSkips);
  const lowWatchAfterRecommendation = applyDecay(input.lowWatchAfterRecommendation);
  const negativeFeedbackRecency = input.creatorMuted
    ? clamp01(input.negativeFeedbackRecency)
    : applyDecay(input.negativeFeedbackRecency);
  const creatorMuteStrength = input.creatorMuted
    ? clamp01(input.creatorMuteStrength)
    : applyDecay(input.creatorMuteStrength);
  const suppressionScore = clamp01(
    (0.45 * explicitNegativeFeedback) +
    (0.25 * repeatedSkips) +
    (0.15 * lowWatchAfterRecommendation) +
    (0.10 * negativeFeedbackRecency) +
    (0.05 * creatorMuteStrength),
  );

  return {
    suppressionScore: roundScore(suppressionScore),
    decayMultiplier: roundScore(decayMultiplier),
    signals: {
      explicitNegativeFeedback: roundScore(explicitNegativeFeedback),
      repeatedSkips: roundScore(repeatedSkips),
      lowWatchAfterRecommendation: roundScore(lowWatchAfterRecommendation),
      negativeFeedbackRecency: roundScore(negativeFeedbackRecency),
      creatorMuteStrength: roundScore(creatorMuteStrength),
    },
  };
}

export function applyNegativePreferenceSuppression(baseScore: number, suppressionScore: number) {
  return Math.max(0, Math.min(100, baseScore * (1 - clamp01(suppressionScore))));
}
