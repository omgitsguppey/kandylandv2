import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import { getDrops } from "@/lib/server/drops";
import { generateRecommendationCandidates } from "@/lib/recommendations/candidate-generation";
import { generateColdStartCandidates } from "@/lib/recommendations/cold-start-candidates";
import { rankDeterministicRecommendations } from "@/lib/recommendations/deterministic-ranker";
import { scoreRecommendationWithArtifact } from "@/lib/recommendations/ml-ranker";
import { buildRecommendationExplanation } from "@/lib/recommendations/recommendation-explanations";
import {
  applyExplorationBudget,
  EXPLORATION_ADMIN_REASON,
  type RecommendationExplorationDiagnostics,
} from "@/lib/recommendations/exploration-policy";
import { buildCreatorSupplyQualityMap } from "@/lib/recommendations/creator-quality-adjustment";
import { buildIntegrityRiskMap } from "@/lib/moderation/integrity-risk-map";
import {
  applyIntegrityDemotions,
  type IntegrityDemotionDiagnostics,
} from "@/lib/recommendations/integrity-demotions";
import {
  rerankRecommendationsForDiversity,
  type RecommendationDiversityDiagnostics,
} from "@/lib/recommendations/diversity-reranker";
import type { CreatorSupplyQualityScoreResult } from "@/lib/creator/creator-supply-quality-score";
import type { RecommendationCandidate } from "@/lib/recommendations/ranking-features";
import type { NegativePreferenceProfile } from "@/lib/behavioral/negative-preference-score";
import type { SearchIntentProfile } from "@/lib/behavioral/search-intent-profile";
import type { Drop } from "@/types/db";

const USER_PROFILE_COLLECTION = "behavioral_user_profiles";
const GUEST_PROFILE_COLLECTION = "behavioral_guest_profiles";
const DROP_INTELLIGENCE_COLLECTION = "behavioral_drop_intelligence";
const SNAPSHOT_STATUS_COLLECTION = "behavioral_intelligence_status";
const ANALYTICS_TRUTH_USER_COLLECTION = "analytics_truth_user_metrics";
const ANALYTICS_TRUTH_DROP_COLLECTION = "analytics_truth_drop_metrics";

type BehavioralProfileDoc = {
  userId: string;
  updatedAtMs?: number;
  latestSourceAtMs?: number;
  freshnessLabel?: string;
  recommendationState?: string;
  confidenceScore?: number;
  truthScore?: number;
  confidenceLabel?: string;
  predictionOutputs?: {
    pPurchase7d?: number;
    pUnlock24h?: number;
    pWatchComplete?: number;
    pReturn7d?: number;
    pCreatorFollow?: number;
    pNegativeFeedback?: number;
  };
  mathCalibration?: {
    activeMode?: string;
    verdict?: string;
    reason?: string;
    sampleSize?: number;
  };
  recommendationThresholdMet?: boolean;
  insufficientSignal?: boolean;
  insufficientSignalReason?: string;
  profilingEligibility?: {
    anonymousAnalyticsEnabled?: boolean;
    identifiedAnalyticsEnabled?: boolean;
    allowRecommendations?: boolean;
    gpcBlocked?: boolean;
    eligible?: boolean;
  };
  creatorAffinity?: Record<string, number>;
  categoryAffinity?: Record<string, number>;
  themeAffinity?: Record<string, number>;
  experiencePreferenceScores?: Record<string, number>;
  positiveDropIds?: string[];
  negativeDropIds?: string[];
  negativeCreatorIds?: string[];
  mutedCreatorIds?: string[];
  negativeCategoryIds?: string[];
  categoryNegativeAffinity?: Record<string, number>;
  repeatedSkipDropIds?: Record<string, number>;
  lowWatchAfterRecommendationDropIds?: Record<string, number>;
  negativePreferenceProfile?: NegativePreferenceProfile;
  searchIntentProfile?: SearchIntentProfile;
  recentDropIds?: string[];
  recentCreatorIds?: string[];
  fatigueScore?: number;
  eventCount?: number;
  watchSessionCount?: number;
  purchaseCount?: number;
  signalSummary?: {
    watchSessions?: number;
    completedUnwraps?: number;
    repeatedCreators?: number;
    categorySignals?: number;
    themeSignals?: number;
    purchases?: number;
    returnCadence30d?: number;
    consentAvailability?: number;
    evidenceCount?: number;
  };
  lookalikeCreatorIds?: string[];
  lookalikeSourceUserCount?: number;
};

type DropIntelligenceDoc = {
  dropId: string;
  creatorId?: string;
  dropCategory?: string;
  updatedAtMs?: number;
  latestSourceAtMs?: number;
  freshnessLabel?: string;
  previewOpens?: number;
  viewerOpens?: number;
  completionRate?: number;
  viewerToUnlockRate?: number;
  negativeSignalRate?: number;
  freshnessDecayScore?: number;
  confidenceScore?: number;
  truthScore?: number;
  sourceReliability?: number;
  schemaCompleteness?: number;
  positiveFeedbackCount?: number;
  negativeFeedbackCount?: number;
  satisfactionScore?: number;
  satisfactionSampleCount?: number;
  satisfactionLatestAtMs?: number;
  creatorBaselineMomentumScore?: number;
  earlyMomentum?: {
    momentumScore?: number;
    [key: string]: unknown;
  };
  dropRecommendationScore?: number;
};

type RankedDropRecommendation = {
  drop: Drop;
  score: number;
  mode: "deterministic" | "ml_artifact" | "deterministic-fallback";
  labels: string[];
  profileConfidence: number;
  profileFreshness: string;
  telemetryQualityLabel: string;
  telemetryConfidenceScore: number;
  factors: Array<{
    label: string;
    value: number;
  }>;
  predictions: {
    pPurchase7d: number;
    pUnlock24h: number;
    pWatchComplete: number;
    pReturn7d: number;
    pCreatorFollow: number;
    pNegativeFeedback: number;
  };
  truthScore: number;
  suppression: {
    score: number;
    multiplier: number;
    reasons: string[];
  };
  queryIntent: {
    score: number;
    boost: number;
    reasons: string[];
  };
  momentum: {
    score: number;
    boost: number;
    label: string;
    reasons: string[];
  };
  creatorSupplyQuality: CreatorSupplyQualityScoreResult | null;
  integrity: IntegrityDemotionDiagnostics;
  exploration: RecommendationExplorationDiagnostics;
  diversity: RecommendationDiversityDiagnostics;
  explanationEligible: boolean;
  fallbackReason: string;
  explanationSummary: string;
  explanationReasons: string[];
  candidateSources: string[];
  rankingMode: "deterministic" | "ml_artifact";
  mlDiagnostics?: {
    predictedPaidConversion: number;
    predictedUnlock: number;
    predictedWatchCompletion: number;
    predictedReturn: number;
    pPurchase7d: number;
    pUnlock24h: number;
    pWatchComplete: number;
    pReturn7d: number;
    blendWeight: number;
    modelSource: string;
    modelFreshness: string;
  };
};

export const BEHAVIORAL_PROFILE_EXPLANATION_THRESHOLD = 0.5;
export const BEHAVIORAL_PROFILE_MIN_SIGNAL_THRESHOLD = 0.35;

type AnalyticsTruthMetricDoc = {
  qualityLabel?: string;
  confidenceScore?: number;
  repairedDataRatio?: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 3) {
  if (!Number.isFinite(value)) return 0;
  const multiplier = 10 ** digits;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function withDiversityDiagnostics(entry: RankedDropRecommendation) {
  const factors = [
    ...entry.factors,
    { label: "Diversity penalty", value: round(entry.diversity.diversityPenalty / 100, 4) },
    { label: "Exploration boost", value: round(entry.diversity.explorationBoost / 100, 4) },
    { label: "Explore budget boost", value: round(entry.exploration.scoreBoost / 100, 4) },
    { label: "Creator supply score", value: round((entry.creatorSupplyQuality?.creatorSupplyScore || 0) / 100, 4) },
    { label: "Integrity multiplier", value: entry.integrity.integrityMultiplier },
  ];
  const explanationReasons = Array.from(new Set([
    ...entry.explanationReasons,
    ...entry.integrity.reasons,
    ...entry.exploration.reasons,
    ...entry.diversity.reasons,
  ]));

  return {
    ...entry,
    factors,
    explanationReasons,
  };
}

function mergeRecommendationCandidates(candidates: RecommendationCandidate[]) {
  const candidateMap = new Map<string, RecommendationCandidate>();

  candidates.forEach((candidate) => {
    const existing = candidateMap.get(candidate.drop.id);
    if (!existing) {
      candidateMap.set(candidate.drop.id, {
        drop: candidate.drop,
        sources: [...candidate.sources],
        sourceReasons: [...candidate.sourceReasons],
        sourcePriority: candidate.sourcePriority,
      });
      return;
    }

    candidate.sources.forEach((source) => {
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
    });
    candidate.sourceReasons.forEach((reason) => {
      if (!existing.sourceReasons.includes(reason)) {
        existing.sourceReasons.push(reason);
      }
    });
    existing.sourcePriority = Math.max(existing.sourcePriority, candidate.sourcePriority);
  });

  return Array.from(candidateMap.values())
    .sort((left, right) => right.sourcePriority - left.sourcePriority || right.drop.validFrom - left.drop.validFrom);
}

function buildProfileConfidence(profile: Partial<BehavioralProfileDoc> | null) {
  if (!profile) return 0;
  if (typeof profile.confidenceScore === "number") {
    return clamp01(profile.confidenceScore);
  }
  return 0;
}

function buildProfileMode(profile: BehavioralProfileDoc | null) {
  if (!profile) {
    return "deterministic-fallback";
  }
  if (profile.recommendationState === "profile-driven" && profile.recommendationThresholdMet === true) {
    return "profile-driven";
  }
  return "deterministic-fallback";
}

export function buildBehavioralRecommendationState(profile: Partial<BehavioralProfileDoc> | null) {
  const confidenceScore = buildProfileConfidence(profile);
  const recommendationState = profile?.recommendationState || "deterministic-fallback";
  const hasMeaningfulAffinity = [
    ...Object.values(profile?.creatorAffinity || {}),
    ...Object.values(profile?.categoryAffinity || {}),
    ...Object.values(profile?.themeAffinity || {}),
  ].some((value) => typeof value === "number" && value > 0);
  const insufficientSignal = profile?.insufficientSignal === true
    || confidenceScore < BEHAVIORAL_PROFILE_MIN_SIGNAL_THRESHOLD
    || !hasMeaningfulAffinity;
  const explanationEligible = recommendationState === "profile-driven"
    && profile?.recommendationThresholdMet === true
    && confidenceScore >= BEHAVIORAL_PROFILE_EXPLANATION_THRESHOLD
    && hasMeaningfulAffinity;

  return {
    recommendationState,
    confidenceScore,
    insufficientSignal,
    explanationEligible,
    fallbackReason: profile?.insufficientSignalReason || "Not enough verified behavior signal yet.",
  };
}

export async function getBehavioralSnapshotStatus() {
  if (!adminDb) return null;
  const snapshot = await adminDb.collection(SNAPSHOT_STATUS_COLLECTION).doc("summary").get();
  return snapshot.exists ? snapshot.data() as Record<string, unknown> : null;
}

export async function getBehavioralUserProfile(userId: string) {
  if (!adminDb || !userId) return null;
  const snapshot = await adminDb.collection(USER_PROFILE_COLLECTION).doc(userId).get();
  return snapshot.exists ? snapshot.data() as BehavioralProfileDoc : null;
}

export async function getBehavioralGuestProfile(sessionKey: string) {
  if (!adminDb || !sessionKey) return null;
  const snapshot = await adminDb.collection(GUEST_PROFILE_COLLECTION).doc(sessionKey).get();
  return snapshot.exists ? snapshot.data() as Record<string, unknown> : null;
}

export async function listDropIntelligence(limit = 20) {
  if (!adminDb) return [];
  const snapshot = await adminDb.collection(DROP_INTELLIGENCE_COLLECTION)
    .orderBy("viewerOpens", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => ({ dropId: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

async function readDropIntelligenceMap() {
  if (!adminDb) return new Map<string, DropIntelligenceDoc>();
  const snapshot = await adminDb.collection(DROP_INTELLIGENCE_COLLECTION).get();
  const docs = snapshot.docs.map((doc) => ({ ...(doc.data() as DropIntelligenceDoc), dropId: doc.id }));
  const creatorScores = new Map<string, Array<{ dropId: string; score: number }>>();

  docs.forEach((doc) => {
    if (!doc.creatorId) {
      return;
    }

    const score = typeof doc.earlyMomentum?.momentumScore === "number"
      ? doc.earlyMomentum.momentumScore
      : typeof doc.dropRecommendationScore === "number"
        ? doc.dropRecommendationScore
        : 0;
    if (score > 0) {
      creatorScores.set(doc.creatorId, [...(creatorScores.get(doc.creatorId) || []), { dropId: doc.dropId, score }]);
    }
  });

  return new Map<string, DropIntelligenceDoc>(docs.map((doc) => [doc.dropId, {
    ...doc,
    creatorBaselineMomentumScore: doc.creatorBaselineMomentumScore ?? (() => {
      const creatorDropScores = creatorScores.get(doc.creatorId || "") || [];
      const peerScores = creatorDropScores.filter((entry) => entry.dropId !== doc.dropId).map((entry) => entry.score);
      return peerScores.reduce((sum, score) => sum + score, 0) / Math.max(1, peerScores.length);
    })(),
  }]));
}

async function readAnalyticsTruthDropMap() {
  if (!adminDb) return new Map<string, AnalyticsTruthMetricDoc>();
  const snapshot = await adminDb.collection(ANALYTICS_TRUTH_DROP_COLLECTION).get();
  return new Map(snapshot.docs.map((doc) => [doc.id, doc.data() as AnalyticsTruthMetricDoc]));
}

async function readAnalyticsTruthUser(userId?: string | null) {
  if (!adminDb || !userId) return null;
  const snapshot = await adminDb.collection(ANALYTICS_TRUTH_USER_COLLECTION).doc(userId).get();
  return snapshot.exists ? snapshot.data() as AnalyticsTruthMetricDoc : null;
}

export async function buildDeterministicDropRecommendations(input: {
  userId?: string | null;
  limit?: number;
  currentDropId?: string | null;
  candidateDropIds?: string[] | null;
}) {
  const nowMs = Date.now();
  const limit = Math.max(1, Math.min(input.limit ?? 8, 24));
  const [drops, profile, intelligenceMap, truthDropMap, truthUser] = await Promise.all([
    getDrops(),
    input.userId ? getBehavioralUserProfile(input.userId) : Promise.resolve(null),
    readDropIntelligenceMap(),
    readAnalyticsTruthDropMap(),
    readAnalyticsTruthUser(input.userId),
  ]);

  const candidateIdSet = input.candidateDropIds ? new Set(input.candidateDropIds) : null;
  const recommendationState = buildBehavioralRecommendationState(profile);
  const mode = buildProfileMode(profile);
  const profileConfidence = recommendationState.confidenceScore;
  const profileFreshness = profile?.freshnessLabel || "unknown";
  const candidates = generateRecommendationCandidates({
    drops: drops
      .filter((drop) => drop.status === "active")
      .filter((drop) => !candidateIdSet || candidateIdSet.has(drop.id))
      .filter((drop) => drop.id !== input.currentDropId),
    profile,
    dropIntelligence: intelligenceMap,
    currentDropId: input.currentDropId,
    nowMs,
    limit: Math.max(limit * 3, 24),
  });
  const creatorSupplyQualityMap = buildCreatorSupplyQualityMap({
    drops,
    dropIntelligence: intelligenceMap,
    nowMs,
  });
  const integrityRiskMap = buildIntegrityRiskMap({
    drops,
    dropIntelligence: intelligenceMap,
    nowMs,
  });
  const coldStartCandidates = generateColdStartCandidates({
    drops: drops
      .filter((drop) => drop.status === "active")
      .filter((drop) => !candidateIdSet || candidateIdSet.has(drop.id))
      .filter((drop) => drop.id !== input.currentDropId),
    profile,
    dropIntelligence: intelligenceMap,
    currentDropId: input.currentDropId,
    nowMs,
    limit: Math.max(limit * 3, 24),
  });
  const deterministicRanked = rankDeterministicRecommendations({
    candidates: mergeRecommendationCandidates([...candidates, ...coldStartCandidates]),
    profile,
    dropIntelligence: intelligenceMap,
    creatorSupplyQuality: creatorSupplyQualityMap,
    surface: input.currentDropId ? "viewer" : "drops",
    nowMs,
  });

  const scored = deterministicRanked
    .map((entry) => {
      const artifactScore = scoreRecommendationWithArtifact({
        features: entry.features,
        nowMs,
      });
      const dropTruth = truthDropMap.get(entry.drop.id);
      const telemetryQualityLabel = dropTruth?.qualityLabel || truthUser?.qualityLabel || "unknown";
      const telemetryConfidenceSources = [
        typeof dropTruth?.confidenceScore === "number" ? clamp01(dropTruth.confidenceScore) : null,
        typeof truthUser?.confidenceScore === "number" ? clamp01(truthUser.confidenceScore) : null,
      ].filter((value): value is number => value !== null);
      const telemetryConfidenceScore = round(
        telemetryConfidenceSources.length > 0 ? Math.min(...telemetryConfidenceSources) : 0,
        3,
      );
      const effectiveMode = artifactScore ? "ml_artifact" : "deterministic";
      const effectiveScore = artifactScore
        ? round((entry.score * (1 - artifactScore.blendWeight)) + (artifactScore.score * artifactScore.blendWeight), 3)
        : round(entry.score, 3);
      const explanation = buildRecommendationExplanation({
        sources: entry.candidateSources,
        features: entry.features,
        fallbackReason: recommendationState.fallbackReason,
      });
      const labels = Array.from(new Set([
        intelligenceMap.get(entry.drop.id)?.freshnessLabel || "unknown",
        mode,
        telemetryQualityLabel,
        effectiveMode,
      ]));

      return {
        drop: entry.drop,
        score: effectiveScore,
        mode: mode === "deterministic-fallback" ? "deterministic-fallback" : effectiveMode,
        labels,
        profileConfidence,
        profileFreshness,
        telemetryQualityLabel,
        telemetryConfidenceScore,
        factors: explanation.diagnostics,
        predictions: {
          pPurchase7d: artifactScore?.pPurchase7d ?? entry.features.pPurchase7d,
          pUnlock24h: artifactScore?.pUnlock24h ?? entry.features.pUnlock24h,
          pWatchComplete: artifactScore?.pWatchComplete ?? entry.features.pWatchComplete,
          pReturn7d: artifactScore?.pReturn7d ?? entry.features.pReturn7d,
          pCreatorFollow: entry.features.pCreatorFollow,
          pNegativeFeedback: entry.features.pNegativeFeedback,
        },
        truthScore: entry.features.truthScore,
        suppression: {
          score: entry.features.suppressionScore,
          multiplier: entry.features.suppressionScoreMultiplier,
          reasons: entry.features.suppressionReasons,
        },
        queryIntent: {
          score: entry.features.queryIntentScore,
          boost: entry.features.queryIntentBoost,
          reasons: entry.features.queryIntentReasons,
        },
        momentum: {
          score: entry.features.dropMomentumScore,
          boost: entry.features.dropMomentumBoost,
          label: entry.features.dropMomentumLabel,
          reasons: entry.features.dropMomentumReasons,
        },
        creatorSupplyQuality: entry.features.creatorSupplyQuality,
        explanationEligible: recommendationState.explanationEligible,
        fallbackReason: recommendationState.fallbackReason,
        explanationSummary: explanation.summary,
        explanationReasons: Array.from(new Set([...explanation.reasons, ...explanation.adminReasons])),
        candidateSources: entry.candidateSources,
        rankingMode: effectiveMode,
        mlDiagnostics: artifactScore ? {
          predictedPaidConversion: artifactScore.predictedPaidConversion,
          predictedUnlock: artifactScore.predictedUnlock,
          predictedWatchCompletion: artifactScore.predictedWatchCompletion,
          predictedReturn: artifactScore.predictedReturn,
          pPurchase7d: artifactScore.pPurchase7d,
          pUnlock24h: artifactScore.pUnlock24h,
          pWatchComplete: artifactScore.pWatchComplete,
          pReturn7d: artifactScore.pReturn7d,
          blendWeight: artifactScore.blendWeight,
          modelSource: artifactScore.modelSource,
          modelFreshness: artifactScore.modelFreshness,
        } : undefined,
      } satisfies Omit<RankedDropRecommendation, "diversity" | "exploration" | "integrity">;
    })
    .sort((left, right) => right.score - left.score || right.drop.validFrom - left.drop.validFrom);
  const recommendationLimit = recommendationState.explanationEligible ? limit : Math.min(limit, 3);
  const integrityAdjusted = applyIntegrityDemotions({
    entries: scored,
    integrityRiskMap,
  });
  const explored = applyExplorationBudget({
    entries: integrityAdjusted,
    limit: recommendationLimit,
    nowMs,
  });
  const ranked = rerankRecommendationsForDiversity({
    entries: explored,
    profile,
  })
    .slice(0, recommendationLimit);

  if (recommendationState.insufficientSignal) {
    return ranked.map((entry) => {
      const annotated = withDiversityDiagnostics(entry);

      return {
        ...annotated,
        labels: Array.from(new Set([...annotated.labels, "cold-start", "weak-personalization"])),
        factors: [],
        explanationEligible: false,
        explanationSummary: "Cold-start recommendations explore safe fresh Drops while signal builds.",
        explanationReasons: Array.from(new Set([
          EXPLORATION_ADMIN_REASON,
          "Personalization is not strong yet.",
          ...annotated.explanationReasons,
        ])).slice(0, 5),
      };
    });
  }

  if (mode === "deterministic-fallback") {
    return ranked.map((entry, index) => {
      const annotated = withDiversityDiagnostics(entry);

      return {
        ...annotated,
        score: round(annotated.score + Math.max(0, 0.25 - (index * 0.01)), 3),
        labels: Array.from(new Set([...annotated.labels, "fallback"])),
        factors: [],
      };
    });
  }

  return ranked.map((entry) => {
    const annotated = withDiversityDiagnostics(entry);
    return {
      ...annotated,
      factors: annotated.explanationEligible ? annotated.factors : [],
    };
  });
}

export async function buildDeterministicCreatorRecommendations(input: {
  userId?: string | null;
  creatorIds: string[];
  activeDropCounts?: Record<string, number>;
  limit?: number;
}) {
  const profile = input.userId ? await getBehavioralUserProfile(input.userId) : null;
  const mode = buildProfileMode(profile);
  const limit = Math.max(1, Math.min(input.limit ?? 12, 20));

  return input.creatorIds
    .map((creatorId) => {
      const affinity = clamp01((profile?.creatorAffinity?.[creatorId] || 0) / 6);
      const activeBoost = clamp01((input.activeDropCounts?.[creatorId] || 0) / 6);
      const recentPenalty = profile?.recentCreatorIds?.includes(creatorId) ? 0.1 : 0;
      const score = round((affinity * 0.7) + (activeBoost * 0.3) - recentPenalty, 4);
      return { creatorId, score, mode };
    })
    .sort((left, right) => right.score - left.score || left.creatorId.localeCompare(right.creatorId))
    .slice(0, limit);
}
