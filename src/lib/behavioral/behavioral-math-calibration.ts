export const BEHAVIORAL_SOURCE_RELIABILITY_WEIGHTS = {
  server_transaction: 1,
  server_entitlement_unlock: 1,
  watch_session_rollup: 0.95,
  server_creator_relationship: 0.9,
  identified_event_fact: 0.75,
  client_ui_event: 0.6,
  guest_batch: 0.45,
  legacy_page_duration: 0.2,
} as const;

export type BehavioralSourceReliabilityKey = keyof typeof BEHAVIORAL_SOURCE_RELIABILITY_WEIGHTS;

export type BehavioralPredictionOutputs = {
  pPurchase7d: number;
  pUnlock24h: number;
  pWatchComplete: number;
  pReturn7d: number;
  pCreatorFollow: number;
  pNegativeFeedback: number;
  pFanPass?: number;
  pBooking?: number;
  pTaskCompletion?: number;
};

export type BehavioralTruthScoreInput = {
  sourceReliability: number;
  freshnessScore: number;
  sampleScore: number;
  schemaCompleteness: number;
  sourceDisagreementPenalty: number;
};

export type BehavioralEngagementScoreSignals = {
  purchaseSignal: number;
  unwrapSignal: number;
  validWatchSignal: number;
  return7dSignal: number;
  meaningfulActionSignal: number;
  freeIntentSignal: number;
};

export type BehavioralValueScoreSignals = {
  verifiedSpendSignal: number;
  purchaseCountSignal: number;
  purchaseRecencySignal: number;
  postPurchaseUsageSignal: number;
  freeToPaidIntentSignal: number;
};

export type DropRecommendationScoreInput = BehavioralPredictionOutputs & {
  freshness: number;
  urgency: number;
  fatiguePenalty?: number;
  repeatExposurePenalty?: number;
  diversityBoost?: number;
};

export type BehavioralModelActivationInput = {
  sampleSize: number;
  mlPrecisionAt5?: number;
  deterministicPrecisionAt5?: number;
  mlHitRate?: number;
  deterministicHitRate?: number;
  mlCalibrationError?: number;
  deterministicCalibrationError?: number;
};

export type BehavioralModelActivationResult = {
  activeMode: "deterministic" | "hybrid" | "ml_active";
  verdict: "deterministic_active" | "ml_inactive_sample_too_small" | "ml_underperforms_baseline" | "ml_validated";
  reasons: string[];
};

export const BEHAVIORAL_PREDICTION_KEYS = [
  "pPurchase7d",
  "pUnlock24h",
  "pWatchComplete",
  "pReturn7d",
  "pCreatorFollow",
  "pNegativeFeedback",
] as const;

export const RECOMMENDATION_CANDIDATE_SOURCES = [
  "recent_live_drops",
  "creator_affinity",
  "category_theme_affinity",
  "followed_creators",
  "previous_unlock_creators",
  "fresh_urgent_drops",
  "popular_with_similar_users",
  "fallback_popular_fresh",
] as const;

export const RECOMMENDATION_FILTERS = [
  "expired_drops_removed",
  "locked_content_entitlement_respected",
  "unavailable_creators_removed",
  "unsafe_moderation_blocked_removed",
  "overexposed_content_penalized",
] as const;

export const BEHAVIORAL_SURFACE_OBJECTIVES = {
  user_drops_page: ["pUnlock24h", "pPurchase7d", "freshness"],
  preview_page: ["pPurchase7d", "pUnlock24h", "urgency"],
  creator_profile: ["pCreatorFollow", "pFanPass", "pBooking"],
  dashboard: ["pReturn7d", "pTaskCompletion", "pUnlock24h"],
  admin_users: ["valueScore", "engagementScore", "truthScore"],
  moderation: ["server_backed_risk_score"],
} as const;

export function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

export function roundScore(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** digits;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function logNorm(value: number, cap: number) {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  const safeCap = Math.max(1, Number.isFinite(cap) ? cap : 1);
  return Math.min(1, Math.log10(safeValue + 1) / Math.log10(safeCap + 1));
}

export function computeBehavioralTruthScore(input: BehavioralTruthScoreInput) {
  return clamp01(
    (0.4 * clamp01(input.sourceReliability)) +
    (0.25 * clamp01(input.freshnessScore)) +
    (0.2 * clamp01(input.sampleScore)) +
    (0.1 * clamp01(input.schemaCompleteness)) -
    (0.05 * clamp01(input.sourceDisagreementPenalty)),
  );
}

export function computeEngagementScoreFromSignals(input: BehavioralEngagementScoreSignals) {
  return Math.round(100 * (
    (0.24 * clamp01(input.purchaseSignal)) +
    (0.23 * clamp01(input.unwrapSignal)) +
    (0.23 * clamp01(input.validWatchSignal)) +
    (0.13 * clamp01(input.return7dSignal)) +
    (0.1 * clamp01(input.meaningfulActionSignal)) +
    (0.07 * clamp01(input.freeIntentSignal))
  ));
}

export function computeValueScoreFromSignals(input: BehavioralValueScoreSignals) {
  return Math.round(100 * (
    (0.45 * clamp01(input.verifiedSpendSignal)) +
    (0.25 * clamp01(input.purchaseCountSignal)) +
    (0.12 * clamp01(input.purchaseRecencySignal)) +
    (0.1 * clamp01(input.postPurchaseUsageSignal)) +
    (0.08 * clamp01(input.freeToPaidIntentSignal))
  ));
}

export function computeDropRecommendationScore(input: DropRecommendationScoreInput) {
  const baseScore = 100 * (
    (0.35 * clamp01(input.pPurchase7d)) +
    (0.25 * clamp01(input.pUnlock24h)) +
    (0.2 * clamp01(input.pWatchComplete)) +
    (0.1 * clamp01(input.pReturn7d)) +
    (0.05 * clamp01(input.freshness)) +
    (0.05 * clamp01(input.urgency))
  );

  return clampScore(
    baseScore -
    Math.max(0, input.fatiguePenalty ?? 0) -
    Math.max(0, input.repeatExposurePenalty ?? 0) +
    Math.max(0, input.diversityBoost ?? 0),
  );
}

export function getBehavioralSourceReliability(source: BehavioralSourceReliabilityKey | string | null | undefined) {
  if (!source) {
    return 0;
  }

  return BEHAVIORAL_SOURCE_RELIABILITY_WEIGHTS[source as BehavioralSourceReliabilityKey] ?? 0;
}

export function resolveBehavioralModelActivation(input: BehavioralModelActivationInput): BehavioralModelActivationResult {
  const reasons: string[] = [];
  const sampleSize = Math.max(0, Math.round(input.sampleSize || 0));

  if (sampleSize < 50) {
    return {
      activeMode: "deterministic",
      verdict: "ml_inactive_sample_too_small",
      reasons: [`Sample size ${sampleSize} is below 50, so no ML verdict is active.`],
    };
  }

  const mlPrecisionAt5 = clamp01(input.mlPrecisionAt5 ?? 0);
  const deterministicPrecisionAt5 = clamp01(input.deterministicPrecisionAt5 ?? 0);
  const mlHitRate = clamp01(input.mlHitRate ?? 0);
  const deterministicHitRate = clamp01(input.deterministicHitRate ?? 0);
  const mlCalibrationError = clamp01(input.mlCalibrationError ?? 1);
  const deterministicCalibrationError = clamp01(input.deterministicCalibrationError ?? 1);
  const underperformsBaseline = mlPrecisionAt5 < deterministicPrecisionAt5
    || mlHitRate < deterministicHitRate
    || mlCalibrationError > deterministicCalibrationError + 0.02;

  if (underperformsBaseline) {
    return {
      activeMode: "deterministic",
      verdict: "ml_underperforms_baseline",
      reasons: ["ML underperforms deterministic baseline, so deterministic ranking remains active."],
    };
  }

  if (mlPrecisionAt5 - deterministicPrecisionAt5 >= 0.05 || mlHitRate - deterministicHitRate >= 0.05) {
    reasons.push("ML beats deterministic baseline by at least five points on precision@5 or hit rate.");
    return {
      activeMode: "ml_active",
      verdict: "ml_validated",
      reasons,
    };
  }

  reasons.push("ML is validated but only as a bounded blend because baseline lift is small.");
  return {
    activeMode: "hybrid",
    verdict: "ml_validated",
    reasons,
  };
}
