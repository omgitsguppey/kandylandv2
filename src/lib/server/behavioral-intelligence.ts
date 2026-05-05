import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import { getDrops } from "@/lib/server/drops";
import { generateRecommendationCandidates } from "@/lib/recommendations/candidate-generation";
import { rankDeterministicRecommendations } from "@/lib/recommendations/deterministic-ranker";
import { scoreRecommendationWithArtifact } from "@/lib/recommendations/ml-ranker";
import { buildRecommendationExplanation } from "@/lib/recommendations/recommendation-explanations";
import type { NegativePreferenceProfile } from "@/lib/behavioral/negative-preference-score";
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

function buildProfileConfidence(profile: Partial<BehavioralProfileDoc> | null) {
  if (!profile) return 0;
  if (typeof profile.confidenceScore === "number") {
    return clamp01(profile.confidenceScore);
  }
  return clamp01(((profile.eventCount || 0) + ((profile.watchSessionCount || 0) * 2)) / 60);
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
  return new Map(snapshot.docs.map((doc) => [doc.id, { ...(doc.data() as DropIntelligenceDoc), dropId: doc.id }]));
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
  const deterministicRanked = rankDeterministicRecommendations({
    candidates,
    profile,
    dropIntelligence: intelligenceMap,
    surface: input.currentDropId ? "viewer" : "drops",
    nowMs,
  });

  const ranked = deterministicRanked
    .map((entry) => {
      const artifactScore = scoreRecommendationWithArtifact({
        features: entry.features,
        nowMs,
      });
      const dropTruth = truthDropMap.get(entry.drop.id);
      const telemetryQualityLabel = dropTruth?.qualityLabel || truthUser?.qualityLabel || "unknown";
      const telemetryConfidenceScore = round(Math.min(
        typeof dropTruth?.confidenceScore === "number" ? dropTruth.confidenceScore : 1,
        typeof truthUser?.confidenceScore === "number" ? truthUser.confidenceScore : 1,
      ), 3);
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
          reasons: explanation.adminReasons,
        },
        explanationEligible: recommendationState.explanationEligible,
        fallbackReason: recommendationState.fallbackReason,
        explanationSummary: explanation.summary,
        explanationReasons: explanation.reasons,
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
      } satisfies RankedDropRecommendation;
    })
    .sort((left, right) => right.score - left.score || right.drop.validFrom - left.drop.validFrom)
    .slice(0, recommendationState.explanationEligible ? limit : Math.min(limit, 3));

  if (recommendationState.insufficientSignal) {
    return [];
  }

  if (mode === "deterministic-fallback") {
    return ranked.map((entry, index) => ({
      ...entry,
      score: round(entry.score + Math.max(0, 0.25 - (index * 0.01)), 3),
      labels: Array.from(new Set([...entry.labels, "fallback"])),
      factors: [],
    }));
  }

  return ranked.map((entry) => ({
    ...entry,
    factors: entry.explanationEligible ? entry.factors : [],
  }));
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
