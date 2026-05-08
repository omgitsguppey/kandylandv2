import {
  ADMIN_RECOMMENDATION_CONFIDENCE_THRESHOLD,
  type UserBehaviorTruthRollup,
} from "@/lib/behavioral/user-score-contract";
import { capRecommendationConfidenceByDataAvailability } from "@/lib/behavioral/privacy-aware-scoring";
import { buildUserBehaviorRollup } from "@/lib/server/user-behavior-rollup";

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function toUserBehaviorTruthRollup(
  rollup: ReturnType<typeof buildUserBehaviorRollup>,
  recommendationConfidence = 0,
): UserBehaviorTruthRollup {
  const returnScore = clamp01(rollup.engagement.breakdown.returnComponent ?? 0);
  const watchScore = clamp01(rollup.watchTimeMs / (30 * 60_000));
  const sourceTruth = rollup.source === "legacy_fallback" || rollup.source === "live_fallback"
    ? "legacy_fallback"
    : rollup.source === "unavailable"
      ? "blocked"
      : rollup.source === "materialized_rollup"
        ? "materialized"
        : rollup.source === "event_facts" || rollup.source === "user_profile_fields"
          ? "server"
          : "canonical";
  const sourceFreshness = rollup.freshnessState === "degraded" && sourceTruth === "legacy_fallback"
    ? "legacy_fallback"
    : rollup.freshnessState;
  const cappedRecommendationConfidence = capRecommendationConfidenceByDataAvailability(
    recommendationConfidence,
    rollup.dataAvailabilityReason,
  );

  return {
    userId: rollup.userId,
    engagementScore: rollup.engagement.score,
    valueScore: rollup.value.valueScore,
    returnScore,
    watchScore,
    sourceTruthScore: rollup.truthScore,
    lastSeenAt: rollup.lastSeenAt,
    lastMeaningfulActionAt: rollup.lastSeenAt,
    purchaseCount: rollup.purchasesCount,
    totalSpendUsd: rollup.revenueUsd,
    unlockCount: rollup.unwraps,
    validWatchTimeMs: rollup.watchTimeMs,
    actionCount: rollup.totalActions,
    recommendationConfidence: cappedRecommendationConfidence,
    dataAvailabilityReason: rollup.dataAvailabilityReason,
    issues: rollup.issues,
    sourceTruth,
    sourceFreshness,
    shouldHideRecommendations: cappedRecommendationConfidence < ADMIN_RECOMMENDATION_CONFIDENCE_THRESHOLD,
  };
}

export function buildUserBehaviorTruthRollup(
  input: Parameters<typeof buildUserBehaviorRollup>[0],
  recommendationConfidence = 0,
): UserBehaviorTruthRollup {
  return toUserBehaviorTruthRollup(buildUserBehaviorRollup(input), recommendationConfidence);
}
