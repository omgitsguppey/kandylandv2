import type { BehavioralDataAvailabilityReason } from "@/lib/behavioral/behavioral-truth-source";

export const PRIVACY_LIMITED_ENGAGEMENT_SCORE_FLOOR = 24;
export const PRIVACY_LIMITED_VALUE_SCORE_FLOOR = 22;
export const PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP = 0.34;

export function isPrivacyLimitedDataAvailabilityReason(
  dataAvailabilityReason: BehavioralDataAvailabilityReason,
) {
  return dataAvailabilityReason !== "full_signal";
}

export function applyPrivacyAwareEngagementFloor(
  score: number,
  dataAvailabilityReason: BehavioralDataAvailabilityReason,
  hasVerifiedSignal: boolean,
) {
  if (!isPrivacyLimitedDataAvailabilityReason(dataAvailabilityReason) || hasVerifiedSignal) {
    return score;
  }

  return Math.max(score, PRIVACY_LIMITED_ENGAGEMENT_SCORE_FLOOR);
}

export function applyPrivacyAwareValueFloor(
  score: number,
  dataAvailabilityReason: BehavioralDataAvailabilityReason,
  hasVerifiedSignal: boolean,
) {
  if (!isPrivacyLimitedDataAvailabilityReason(dataAvailabilityReason) || hasVerifiedSignal) {
    return score;
  }

  return Math.max(score, PRIVACY_LIMITED_VALUE_SCORE_FLOOR);
}

export function capRecommendationConfidenceByDataAvailability(
  recommendationConfidence: number,
  dataAvailabilityReason: BehavioralDataAvailabilityReason,
) {
  if (!Number.isFinite(recommendationConfidence)) {
    return 0;
  }

  const normalized = Math.max(0, Math.min(1, recommendationConfidence));
  if (!isPrivacyLimitedDataAvailabilityReason(dataAvailabilityReason)) {
    return normalized;
  }

  return Math.min(normalized, PRIVACY_LIMITED_RECOMMENDATION_CONFIDENCE_CAP);
}
