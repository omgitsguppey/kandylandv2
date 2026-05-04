import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import { getDrops } from "@/lib/server/drops";
import type { Drop } from "@/types/db";

const USER_PROFILE_COLLECTION = "behavioral_user_profiles";
const GUEST_PROFILE_COLLECTION = "behavioral_guest_profiles";
const DROP_INTELLIGENCE_COLLECTION = "behavioral_drop_intelligence";
const SNAPSHOT_STATUS_COLLECTION = "behavioral_intelligence_status";
const ANALYTICS_TRUTH_USER_COLLECTION = "analytics_truth_user_metrics";
const ANALYTICS_TRUTH_DROP_COLLECTION = "analytics_truth_drop_metrics";

type ScoreFactorKey =
  | "freshness"
  | "creator_affinity"
  | "content_affinity"
  | "experience_affinity"
  | "completion_quality"
  | "unlock_quality"
  | "session_context"
  | "diversity"
  | "fatigue_suppression"
  | "negative_suppression"
  | "availability"
  | "explicit_feedback";

type BehavioralProfileDoc = {
  userId: string;
  updatedAtMs?: number;
  latestSourceAtMs?: number;
  freshnessLabel?: string;
  recommendationState?: string;
  confidenceScore?: number;
  confidenceLabel?: string;
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
  positiveFeedbackCount?: number;
  negativeFeedbackCount?: number;
};

type ScoreFactor = {
  key: ScoreFactorKey;
  label: string;
  weight: number;
  raw: number;
  contribution: number;
  detail: string;
};

type RankedDropRecommendation = {
  drop: Drop;
  score: number;
  mode: "profile-driven" | "deterministic-fallback";
  labels: string[];
  profileConfidence: number;
  profileFreshness: string;
  telemetryQualityLabel: string;
  telemetryConfidenceScore: number;
  factors: ScoreFactor[];
  explanationEligible: boolean;
  fallbackReason: string;
};

export const BEHAVIORAL_PROFILE_EXPLANATION_THRESHOLD = 0.5;
export const BEHAVIORAL_PROFILE_MIN_SIGNAL_THRESHOLD = 0.35;

type AnalyticsTruthMetricDoc = {
  qualityLabel?: string;
  confidenceScore?: number;
  repairedDataRatio?: number;
};

const SCORE_WEIGHTS: Record<ScoreFactorKey, number> = {
  freshness: 18,
  creator_affinity: 16,
  content_affinity: 14,
  experience_affinity: 8,
  completion_quality: 10,
  unlock_quality: 10,
  session_context: 7,
  diversity: 6,
  fatigue_suppression: 5,
  negative_suppression: 5,
  availability: 4,
  explicit_feedback: 3,
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeTagList(drop: Drop) {
  return Array.isArray(drop.tags)
    ? drop.tags.filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
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
  const insufficientSignal = profile?.insufficientSignal === true
    || confidenceScore < BEHAVIORAL_PROFILE_MIN_SIGNAL_THRESHOLD;
  const explanationEligible = recommendationState === "profile-driven"
    && profile?.recommendationThresholdMet === true
    && confidenceScore >= BEHAVIORAL_PROFILE_EXPLANATION_THRESHOLD;

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

function buildFactor(key: ScoreFactorKey, raw: number, detail: string): ScoreFactor {
  const weight = SCORE_WEIGHTS[key];
  const contribution = round(clamp01(raw) * weight, 3);
  const label = key.replaceAll("_", " ");
  return { key, label, weight, raw: round(clamp01(raw)), contribution, detail };
}

function computeDropFactors(input: {
  drop: Drop;
  profile: BehavioralProfileDoc | null;
  intelligence: DropIntelligenceDoc | undefined;
  nowMs: number;
  currentDropId?: string | null;
}) {
  const { drop, profile, intelligence, nowMs, currentDropId } = input;
  const ageDays = drop.validFrom ? Math.max(0, (nowMs - drop.validFrom) / (24 * 60 * 60 * 1000)) : 365;
  const creatorId = drop.creatorId || "";
  const categoryKey = drop.type || "";
  const creatorAffinity = clamp01((creatorId ? (profile?.creatorAffinity?.[creatorId] || 0) : 0) / 6);
  const categoryAffinity = clamp01((categoryKey ? (profile?.categoryAffinity?.[categoryKey] || 0) : 0) / 5);
  const tagAffinity = clamp01(average(normalizeTagList(drop).map((tag) => (profile?.themeAffinity?.[tag] || 0) / 4)));
  const contentAffinity = Math.max(categoryAffinity, tagAffinity);
  const experienceKey = currentDropId ? "viewer" : "drops";
  const experienceAffinity = clamp01((profile?.experiencePreferenceScores?.[experienceKey] || 0) / 4);
  const completionQuality = clamp01(intelligence?.completionRate || 0);
  const unlockQuality = clamp01(intelligence?.viewerToUnlockRate || 0);
  const recentMatch = profile?.recentDropIds?.includes(drop.id) ? 0.15 : 0;
  const recentCreatorMatch = creatorId && profile?.recentCreatorIds?.includes(creatorId) ? 0.25 : 0;
  const sessionContext = currentDropId ? Math.min(1, 0.45 + recentMatch + recentCreatorMatch) : 0.45;
  const diversity = creatorId && profile?.recentCreatorIds?.includes(creatorId) ? 0.35 : 0.9;
  const fatigue = 1 - clamp01(profile?.fatigueScore || 0);
  const negativeSuppression = 1 - clamp01(intelligence?.negativeSignalRate || 0);
  const availability = drop.status === "active" ? 1 : 0;
  const explicitFeedback = profile?.positiveDropIds?.includes(drop.id) ? 1 : profile?.negativeDropIds?.includes(drop.id) ? 0 : 0.5;
  const freshness = clamp01((intelligence?.freshnessDecayScore ?? (1 - (ageDays / 30))));

  return [
    buildFactor("freshness", freshness, ageDays <= 2 ? "Recent live drop." : "Older live drop."),
    buildFactor("creator_affinity", creatorAffinity, creatorAffinity > 0 ? "Viewer has creator affinity." : "No stored creator affinity yet."),
    buildFactor("content_affinity", contentAffinity, contentAffinity > 0 ? "Viewer has matching category/theme behavior." : "No matching category/theme signal."),
    buildFactor("experience_affinity", experienceAffinity, experienceAffinity > 0 ? `Viewer frequently engages on the ${experienceKey} surface.` : `No strong ${experienceKey} surface preference recorded.`),
    buildFactor("completion_quality", completionQuality, "Drop completion quality from behavioral snapshots."),
    buildFactor("unlock_quality", unlockQuality, "Viewer-to-unlock conversion quality."),
    buildFactor("session_context", sessionContext, currentDropId ? "Context-aware follow-up recommendation." : "General feed context."),
    buildFactor("diversity", diversity, diversity > 0.6 ? "Exploration preserved." : "Suppressed to reduce creator repetition."),
    buildFactor("fatigue_suppression", fatigue, fatigue > 0.5 ? "No heavy fatigue detected." : "Viewer is in a fatigue band."),
    buildFactor("negative_suppression", negativeSuppression, negativeSuppression < 0.5 ? "Negative signals present." : "No strong negative signals."),
    buildFactor("availability", availability, availability > 0 ? "Drop is currently available." : "Drop is not currently available."),
    buildFactor("explicit_feedback", explicitFeedback, explicitFeedback === 1 ? "Positive explicit feedback exists." : explicitFeedback === 0 ? "Negative explicit feedback exists." : "No explicit feedback recorded."),
  ];
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

  const ranked = drops
    .filter((drop) => drop.status === "active")
    .filter((drop) => !candidateIdSet || candidateIdSet.has(drop.id))
    .filter((drop) => drop.id !== input.currentDropId)
    .map((drop) => {
      const factors = computeDropFactors({
        drop,
        profile,
        intelligence: intelligenceMap.get(drop.id),
        nowMs,
        currentDropId: input.currentDropId,
      });
      const score = round(factors.reduce((sum, factor) => sum + factor.contribution, 0), 3);
      const dropTruth = truthDropMap.get(drop.id);
      const telemetryQualityLabel = dropTruth?.qualityLabel || truthUser?.qualityLabel || "unknown";
      const telemetryConfidenceScore = round(Math.min(
        typeof dropTruth?.confidenceScore === "number" ? dropTruth.confidenceScore : 1,
        typeof truthUser?.confidenceScore === "number" ? truthUser.confidenceScore : 1,
      ), 3);
      const labels = Array.from(new Set([
        intelligenceMap.get(drop.id)?.freshnessLabel || "unknown",
        mode,
        telemetryQualityLabel,
      ]));
      return {
        drop,
        score,
        mode,
        labels,
        profileConfidence,
        profileFreshness,
        telemetryQualityLabel,
        telemetryConfidenceScore,
        factors,
        explanationEligible: recommendationState.explanationEligible,
        fallbackReason: recommendationState.fallbackReason,
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
