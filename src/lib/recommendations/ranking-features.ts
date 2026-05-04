import type { Drop } from "@/types/db";

export type RecommendationMode = "deterministic" | "ml_artifact";

export type RecommendationCandidateSource =
  | "live_drop"
  | "ending_soon"
  | "followed_creator"
  | "previously_unlocked_creator"
  | "theme_affinity"
  | "similar_users"
  | "popular"
  | "fresh";

export type RecommendationBehavioralProfileLike = {
  confidenceScore?: number;
  freshnessLabel?: string;
  recommendationState?: string;
  creatorAffinity?: Record<string, number>;
  categoryAffinity?: Record<string, number>;
  themeAffinity?: Record<string, number>;
  experiencePreferenceScores?: Record<string, number>;
  positiveDropIds?: string[];
  negativeDropIds?: string[];
  recentDropIds?: string[];
  recentCreatorIds?: string[];
  lookalikeCreatorIds?: string[];
  fatigueScore?: number;
  purchaseCount?: number;
  completionPropensity?: number;
  unlockPropensity?: number;
  viewerToUnlockConversion?: number;
  walletOpenPropensity?: number;
  sessionFrequency30d?: number;
  watchSessionCount?: number;
  signalSummary?: {
    evidenceCount?: number;
    purchases?: number;
    watchSessions?: number;
    repeatedCreators?: number;
    categorySignals?: number;
    themeSignals?: number;
    returnCadence30d?: number;
    consentAvailability?: number;
  };
};

export type RecommendationDropIntelligenceLike = {
  dropId: string;
  creatorId?: string;
  dropCategory?: string;
  freshnessLabel?: string;
  previewOpens?: number;
  viewerOpens?: number;
  completionRate?: number;
  viewerToUnlockRate?: number;
  negativeSignalRate?: number;
  freshnessDecayScore?: number;
  confidenceScore?: number;
  positiveFeedbackCount?: number;
  negativeFeedbackCount?: number;
};

export type RecommendationCandidate = {
  drop: Drop;
  sources: RecommendationCandidateSource[];
  sourceReasons: string[];
  sourcePriority: number;
};

export type RecommendationPrimitiveSignals = {
  creatorAffinity: number;
  contentAffinity: number;
  experienceAffinity: number;
  completionQuality: number;
  unlockQuality: number;
  purchaseIntent: number;
  returnCadence: number;
  popularity: number;
  freshness: number;
  urgency: number;
  priceFit: number;
  followedCreatorBoost: number;
  previousUnlockCreatorBoost: number;
  similarUserBoost: number;
};

export type RecommendationRankingFeatures = RecommendationPrimitiveSignals & {
  predictedPaidConversion: number;
  predictedUnlock: number;
  predictedWatchCompletion: number;
  predictedReturn: number;
  previousExposurePenalty: number;
  fatiguePenalty: number;
  confidence: number;
};

export type RecommendationDiagnostics = {
  telemetryFreshness: string;
  profileConfidence: number;
  negativeSignalRate: number;
  sourceReasons: string[];
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeTagList(drop: Drop) {
  return Array.isArray(drop.tags)
    ? drop.tags.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
}

function normalizeCreatorAffinity(profile: RecommendationBehavioralProfileLike | null | undefined, creatorId: string) {
  if (!profile || !creatorId) {
    return 0;
  }

  return clamp01((profile.creatorAffinity?.[creatorId] || 0) / 6);
}

function normalizeCategoryAffinity(profile: RecommendationBehavioralProfileLike | null | undefined, categoryKey: string) {
  if (!profile || !categoryKey) {
    return 0;
  }

  return clamp01((profile.categoryAffinity?.[categoryKey] || 0) / 5);
}

function normalizeThemeAffinity(profile: RecommendationBehavioralProfileLike | null | undefined, drop: Drop) {
  if (!profile) {
    return 0;
  }

  const affinities = normalizeTagList(drop).map((tag) => clamp01((profile.themeAffinity?.[tag] || 0) / 4));
  return average(affinities);
}

function normalizeUrgency(validUntil: number | undefined, nowMs: number) {
  if (!validUntil || validUntil <= nowMs) {
    return 0;
  }

  const hoursRemaining = (validUntil - nowMs) / (60 * 60 * 1000);
  if (hoursRemaining >= 72) {
    return 0;
  }

  return clamp01(1 - (hoursRemaining / 72));
}

function normalizeFreshness(drop: Drop, intelligence: RecommendationDropIntelligenceLike | undefined, nowMs: number) {
  if (typeof intelligence?.freshnessDecayScore === "number") {
    return clamp01(intelligence.freshnessDecayScore);
  }

  const ageDays = drop.validFrom > 0
    ? Math.max(0, (nowMs - drop.validFrom) / (24 * 60 * 60 * 1000))
    : 30;
  return clamp01(1 - (ageDays / 30));
}

function normalizePopularity(intelligence: RecommendationDropIntelligenceLike | undefined) {
  if (!intelligence) {
    return 0;
  }

  const viewerOpens = Math.max(0, intelligence.viewerOpens || 0);
  const previewOpens = Math.max(0, intelligence.previewOpens || 0);
  const unlocks = Math.max(0, intelligence.viewerToUnlockRate || 0);
  return clamp01((Math.log10(viewerOpens + 1) / 3) * 0.65 + clamp01(previewOpens / 50) * 0.2 + unlocks * 0.15);
}

function normalizePriceFit(drop: Drop, profile: RecommendationBehavioralProfileLike | null | undefined) {
  const unlockCost = Math.max(0, Number(drop.unlockCost || 0));
  const priceNormalized = clamp01(unlockCost / 2_000);
  const buyerReadiness = clamp01(
    ((profile?.purchaseCount || 0) / 4) * 0.35 +
    (profile?.walletOpenPropensity || 0) * 0.35 +
    (profile?.unlockPropensity || 0) * 0.3,
  );

  return clamp01(1 - (priceNormalized * (1 - buyerReadiness)));
}

function normalizeExperienceAffinity(profile: RecommendationBehavioralProfileLike | null | undefined, surface: "viewer" | "drops") {
  if (!profile) {
    return 0;
  }

  return clamp01((profile.experiencePreferenceScores?.[surface] || 0) / 4);
}

function normalizeConfidence(profile: RecommendationBehavioralProfileLike | null | undefined, intelligence: RecommendationDropIntelligenceLike | undefined) {
  const profileConfidence = clamp01(profile?.confidenceScore || 0);
  const dropConfidence = clamp01(intelligence?.confidenceScore || 0);

  if (dropConfidence === 0) {
    return profileConfidence;
  }

  if (profileConfidence === 0) {
    return dropConfidence;
  }

  return clamp01(Math.min(profileConfidence, dropConfidence));
}

function computePreviousExposurePenalty(input: {
  drop: Drop;
  profile: RecommendationBehavioralProfileLike | null | undefined;
}) {
  const { drop, profile } = input;
  const creatorId = drop.creatorId || "";

  let penalty = 0;
  if (profile?.negativeDropIds?.includes(drop.id)) {
    penalty += 30;
  }
  if (profile?.recentDropIds?.includes(drop.id)) {
    penalty += 18;
  }
  if (creatorId && profile?.recentCreatorIds?.includes(creatorId)) {
    penalty += 6;
  }

  return Math.max(0, Math.min(40, penalty));
}

function computeFatiguePenalty(input: {
  drop: Drop;
  profile: RecommendationBehavioralProfileLike | null | undefined;
}) {
  const creatorRepeatPenalty = input.drop.creatorId && input.profile?.recentCreatorIds?.includes(input.drop.creatorId) ? 4 : 0;
  return Math.max(0, Math.min(16, ((input.profile?.fatigueScore || 0) * 12) + creatorRepeatPenalty));
}

export function buildRecommendationRankingFeatures(input: {
  drop: Drop;
  profile?: RecommendationBehavioralProfileLike | null;
  intelligence?: RecommendationDropIntelligenceLike;
  candidate?: RecommendationCandidate | null;
  nowMs?: number;
  surface?: "viewer" | "drops";
}) : RecommendationRankingFeatures & { diagnostics: RecommendationDiagnostics } {
  const nowMs = input.nowMs ?? Date.now();
  const profile = input.profile ?? null;
  const intelligence = input.intelligence;
  const drop = input.drop;
  const creatorId = drop.creatorId || "";
  const categoryKey = drop.type || "";
  const surface = input.surface ?? "drops";
  const themeAffinity = normalizeThemeAffinity(profile, drop);
  const contentAffinity = Math.max(
    normalizeCategoryAffinity(profile, categoryKey),
    themeAffinity,
  );
  const creatorAffinity = normalizeCreatorAffinity(profile, creatorId);
  const completionQuality = clamp01(intelligence?.completionRate || 0);
  const unlockQuality = clamp01(intelligence?.viewerToUnlockRate || 0);
  const purchaseIntent = clamp01(
    (profile?.walletOpenPropensity || 0) * 0.45 +
    (profile?.viewerToUnlockConversion || 0) * 0.35 +
    clamp01((profile?.purchaseCount || 0) / 4) * 0.2,
  );
  const returnCadence = clamp01((profile?.sessionFrequency30d || 0) / 12);
  const freshness = normalizeFreshness(drop, intelligence, nowMs);
  const urgency = normalizeUrgency(drop.validUntil, nowMs);
  const priceFit = normalizePriceFit(drop, profile);
  const experienceAffinity = normalizeExperienceAffinity(profile, surface);
  const popularity = normalizePopularity(intelligence);
  const followedCreatorBoost = input.candidate?.sources.includes("followed_creator") ? 1 : 0;
  const previousUnlockCreatorBoost = input.candidate?.sources.includes("previously_unlocked_creator") ? 1 : 0;
  const similarUserBoost = input.candidate?.sources.includes("similar_users") ? 1 : 0;
  const confidence = normalizeConfidence(profile, intelligence);
  const previousExposurePenalty = computePreviousExposurePenalty({ drop, profile });
  const fatiguePenalty = computeFatiguePenalty({ drop, profile });

  const predictedPaidConversion = clamp01(
    (creatorAffinity * 0.22) +
    (contentAffinity * 0.12) +
    (unlockQuality * 0.18) +
    (purchaseIntent * 0.2) +
    (priceFit * 0.14) +
    (followedCreatorBoost * 0.07) +
    (similarUserBoost * 0.04) +
    (confidence * 0.03),
  );
  const predictedUnlock = clamp01(
    (contentAffinity * 0.18) +
    (creatorAffinity * 0.14) +
    (unlockQuality * 0.22) +
    (priceFit * 0.12) +
    (freshness * 0.08) +
    (previousUnlockCreatorBoost * 0.1) +
    (similarUserBoost * 0.08) +
    (confidence * 0.08),
  );
  const predictedWatchCompletion = clamp01(
    (contentAffinity * 0.16) +
    (creatorAffinity * 0.1) +
    (completionQuality * 0.26) +
    (experienceAffinity * 0.08) +
    (freshness * 0.1) +
    (popularity * 0.1) +
    (returnCadence * 0.08) +
    (confidence * 0.12),
  );
  const predictedReturn = clamp01(
    (creatorAffinity * 0.18) +
    (contentAffinity * 0.16) +
    (experienceAffinity * 0.12) +
    (freshness * 0.08) +
    (urgency * 0.08) +
    (returnCadence * 0.18) +
    (popularity * 0.08) +
    (confidence * 0.12),
  );

  return {
    creatorAffinity,
    contentAffinity,
    experienceAffinity,
    completionQuality,
    unlockQuality,
    purchaseIntent,
    returnCadence,
    popularity,
    freshness,
    urgency,
    priceFit,
    followedCreatorBoost,
    previousUnlockCreatorBoost,
    similarUserBoost,
    predictedPaidConversion,
    predictedUnlock,
    predictedWatchCompletion,
    predictedReturn,
    previousExposurePenalty,
    fatiguePenalty,
    confidence,
    diagnostics: {
      telemetryFreshness: intelligence?.freshnessLabel || profile?.freshnessLabel || "unknown",
      profileConfidence: clamp01(profile?.confidenceScore || 0),
      negativeSignalRate: clamp01(intelligence?.negativeSignalRate || 0),
      sourceReasons: input.candidate?.sourceReasons ?? [],
    },
  };
}
