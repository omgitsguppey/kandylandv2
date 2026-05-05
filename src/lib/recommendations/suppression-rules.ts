import type { Drop } from "@/types/db";
import {
  computeNegativePreferenceScore,
  type NegativePreferenceEntityRecord,
  type NegativePreferenceProfile,
} from "@/lib/behavioral/negative-preference-score";
import { clamp01, roundScore } from "@/lib/behavioral/behavioral-math-calibration";

export type RecommendationSuppressionProfile = {
  negativeDropIds?: string[];
  negativeCreatorIds?: string[];
  mutedCreatorIds?: string[];
  negativeCategoryIds?: string[];
  categoryNegativeAffinity?: Record<string, number>;
  repeatedSkipDropIds?: Record<string, number>;
  lowWatchAfterRecommendationDropIds?: Record<string, number>;
  negativePreferenceProfile?: NegativePreferenceProfile;
};

export type RecommendationSuppressionResult = {
  suppressionScore: number;
  scoreMultiplier: number;
  reasons: string[];
  signals: {
    explicitNegativeFeedback: number;
    repeatedSkips: number;
    lowWatchAfterRecommendation: number;
    negativeFeedbackRecency: number;
    creatorMuteStrength: number;
  };
  decayMultiplier: number;
  creatorMuted: boolean;
};

function maxRecordLatest(records: Array<NegativePreferenceEntityRecord | undefined>) {
  return Math.max(0, ...records.map((record) => Math.max(0, record?.latestAtMs || 0)));
}

function recordHasEvent(record: NegativePreferenceEntityRecord | undefined, eventName: string) {
  return record?.eventNames?.includes(eventName) === true;
}

function readCategoryScore(profile: RecommendationSuppressionProfile | null | undefined, categoryKey: string) {
  if (!profile || !categoryKey) {
    return 0;
  }

  return Math.max(
    profile.categoryNegativeAffinity?.[categoryKey] || 0,
    profile.negativePreferenceProfile?.categoryScores?.[categoryKey] || 0,
  );
}

function buildSuppressionReasons(input: {
  explicitNegativeFeedback: number;
  repeatedSkips: number;
  lowWatchAfterRecommendation: number;
  categoryExplicit: boolean;
  creatorMuted: boolean;
}) {
  const reasons: string[] = [];

  if (input.creatorMuted) {
    reasons.push("Lowered because user muted this creator.");
  }
  if (input.explicitNegativeFeedback > 0) {
    reasons.push("Lowered because user asked for fewer recommendations like this.");
  }
  if (input.repeatedSkips > 0) {
    reasons.push("Lowered because user dismissed similar drops.");
  }
  if (input.lowWatchAfterRecommendation > 0) {
    reasons.push("Lowered because similar recommended drops had low watch time.");
  }
  if (input.categoryExplicit) {
    reasons.push("Lowered because user asked for less of this category.");
  }

  return Array.from(new Set(reasons));
}

export function buildRecommendationSuppression(input: {
  drop: Drop;
  profile?: RecommendationSuppressionProfile | null;
  nowMs?: number;
}) : RecommendationSuppressionResult {
  const profile = input.profile ?? null;
  const preferenceProfile = profile?.negativePreferenceProfile;
  const drop = input.drop;
  const dropId = drop.id || "";
  const creatorId = drop.creatorId || "";
  const categoryKey = drop.type || "";
  const dropRecord = dropId ? preferenceProfile?.drops?.[dropId] : undefined;
  const creatorRecord = creatorId ? preferenceProfile?.creators?.[creatorId] : undefined;
  const categoryRecord = categoryKey ? preferenceProfile?.categories?.[categoryKey] : undefined;
  const creatorMuted = Boolean(
    creatorId
    && (
      profile?.mutedCreatorIds?.includes(creatorId)
      || preferenceProfile?.mutedCreatorIds?.includes(creatorId)
      || recordHasEvent(creatorRecord, "creator_muted")
    ),
  );
  const dropExplicit = Boolean(
    dropId
    && (
      profile?.negativeDropIds?.includes(dropId)
      || (dropRecord?.explicitNegativeFeedback || 0) > 0
      || recordHasEvent(dropRecord, "drop_not_interested")
    ),
  );
  const creatorExplicit = Boolean(
    creatorId
    && (
      profile?.negativeCreatorIds?.includes(creatorId)
      || (creatorRecord?.explicitNegativeFeedback || 0) > 0
      || recordHasEvent(creatorRecord, "creator_not_interested")
      || creatorMuted
    ),
  );
  const categoryScore = readCategoryScore(profile, categoryKey);
  const categoryExplicit = Boolean(
    categoryKey
    && (
      profile?.negativeCategoryIds?.includes(categoryKey)
      || recordHasEvent(categoryRecord, "category_not_interested")
      || (categoryRecord?.explicitNegativeFeedback || 0) >= 1
    ),
  );
  const weakCategoryRepeatedSkips = categoryScore >= 2 ? categoryScore : 0;
  const repeatedSkipCount = Math.max(
    dropRecord?.repeatedSkips || 0,
    dropId ? (profile?.repeatedSkipDropIds?.[dropId] || preferenceProfile?.repeatedSkipDropIds?.[dropId] || 0) : 0,
    weakCategoryRepeatedSkips,
  );
  const lowWatchCount = Math.max(
    dropRecord?.lowWatchAfterRecommendation || 0,
    dropId ? (profile?.lowWatchAfterRecommendationDropIds?.[dropId] || preferenceProfile?.lowWatchAfterRecommendationDropIds?.[dropId] || 0) : 0,
  );
  const explicitNegativeFeedback = Math.max(
    dropExplicit ? 1 : 0,
    creatorExplicit ? 1 : 0,
    categoryExplicit ? 1 : 0,
  );
  const repeatedSkips = creatorMuted ? 1 : clamp01(repeatedSkipCount / 3);
  const lowWatchAfterRecommendation = clamp01(lowWatchCount / 3);
  const rawLatestNegativeAtMs = Math.max(
    preferenceProfile?.latestAtMs || 0,
    maxRecordLatest([dropRecord, creatorRecord, categoryRecord]),
  );
  const hasSuppressionSignal = explicitNegativeFeedback > 0
    || repeatedSkips > 0
    || lowWatchAfterRecommendation > 0
    || creatorMuted;
  const latestNegativeAtMs = hasSuppressionSignal ? rawLatestNegativeAtMs : 0;
  const score = computeNegativePreferenceScore({
    explicitNegativeFeedback,
    repeatedSkips,
    lowWatchAfterRecommendation,
    negativeFeedbackRecency: latestNegativeAtMs > 0 || creatorMuted ? 1 : 0,
    creatorMuteStrength: creatorMuted ? 1 : 0,
    latestNegativeAtMs,
    nowMs: input.nowMs,
    creatorMuted,
  });
  const reasons = buildSuppressionReasons({
    explicitNegativeFeedback,
    repeatedSkips,
    lowWatchAfterRecommendation,
    categoryExplicit,
    creatorMuted,
  });

  return {
    suppressionScore: score.suppressionScore,
    scoreMultiplier: roundScore(1 - score.suppressionScore),
    reasons,
    signals: score.signals,
    decayMultiplier: score.decayMultiplier,
    creatorMuted,
  };
}

export function applyRecommendationSuppression(baseScore: number, suppressionScore: number) {
  return Math.max(0, Math.min(100, baseScore * (1 - clamp01(suppressionScore))));
}
