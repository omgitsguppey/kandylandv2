import fs from "node:fs";
import path from "node:path";

import { computeBehavioralConfidence } from "@/lib/behavioral/behavioral-confidence";
import { computeUserEngagementScore, type UserEngagementScoreInput } from "@/lib/behavioral/user-engagement-score";
import { computeUserValueScore, type UserValueScoreInput } from "@/lib/behavioral/user-value-score";
import { estimateMissingWatchTime } from "@/lib/behavioral/watch-time-estimation";
import { normalizeTheftRiskEvidence } from "@/lib/moderation/theft-risk-evidence";
import { scoreTheftRisk } from "@/lib/moderation/theft-risk-score";
import type { RecommendationModelArtifact } from "@/lib/recommendations/ml-ranker";
import { computeDeterministicRecommendationScore } from "@/lib/recommendations/deterministic-ranker";
import type { RecommendationRankingFeatures } from "@/lib/recommendations/ranking-features";
import { applyRecommendationSuppression } from "@/lib/recommendations/suppression-rules";
import { computeDropRecommendationScore } from "@/lib/behavioral/behavioral-math-calibration";

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_PATH = path.resolve(process.cwd(), "agent/state/behavioral-model-validation.generated.json");
const RECOMMENDATION_ARTIFACT_PATH = path.resolve(process.cwd(), "agent/state/recommendation-model.generated.json");
const VERSION = 1;

type ActiveMode = "deterministic" | "hybrid" | "ml_experimental" | "ml_active";
type ValidationStatus = "aligned" | "needs_review";

type BinarySample = {
  timestampMs: number;
  score: number;
  label: 0 | 1;
  staleSource?: boolean;
  sourceDisagreement?: boolean;
};

type GroupedBinarySample = BinarySample & {
  groupId: string;
};

type ModelMetrics = {
  precisionAt5: number;
  precisionAt10: number;
  recallAt10: number;
  calibrationError: number;
  auc: number | null;
  hitRate: number;
  falsePositiveRate: number;
  coverage: number;
  staleSourceRate: number;
  sourceDisagreementRate: number;
};

type ModelSummary = {
  modelVersion: number | string;
  trainingSampleSize: number;
  validationSampleSize: number;
  trainingSource: string;
  metrics: ModelMetrics;
  baselineComparison: {
    baselineName: string;
    baselineMetrics: ModelMetrics;
    beatsBaseline: boolean;
    improvementSummary: string[];
  };
  activeMode: ActiveMode;
  reasons: string[];
};

type ValidationReport = {
  version: number;
  generatedAt: string;
  splitPolicy: {
    type: "time_based";
    trainEndsBefore: string;
    validateStartsAt: string;
    leakageGuard: string;
  };
  overallStatus: ValidationStatus;
  overallActiveMode: ActiveMode;
  reasons: string[];
  models: {
    userEngagementScore: ModelSummary;
    userValueScore: ModelSummary;
    recommendationRanker: ModelSummary;
    watchTimeEstimation: ModelSummary;
    theftRiskScore: ModelSummary;
    behavioralConfidenceScore: ModelSummary;
  };
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 4) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function loadRecommendationArtifact(): RecommendationModelArtifact | null {
  try {
    if (!fs.existsSync(RECOMMENDATION_ARTIFACT_PATH)) return null;
    return JSON.parse(fs.readFileSync(RECOMMENDATION_ARTIFACT_PATH, "utf8")) as RecommendationModelArtifact;
  } catch {
    return null;
  }
}

function buildTimeSplit<T extends { timestampMs: number }>(items: T[]) {
  const sorted = [...items].sort((left, right) => left.timestampMs - right.timestampMs);
  const splitIndex = Math.max(1, Math.floor(sorted.length * 0.7));
  return {
    train: sorted.slice(0, splitIndex),
    validation: sorted.slice(splitIndex),
    splitAtMs: sorted[Math.min(splitIndex, Math.max(0, sorted.length - 1))]?.timestampMs ?? Date.now(),
  };
}

function precisionAtK(samples: GroupedBinarySample[], k: number) {
  const groups = new Map<string, GroupedBinarySample[]>();
  samples.forEach((sample) => {
    const list = groups.get(sample.groupId) ?? [];
    list.push(sample);
    groups.set(sample.groupId, list);
  });

  const values = Array.from(groups.values()).map((group) => {
    const top = [...group].sort((left, right) => right.score - left.score).slice(0, k);
    if (top.length === 0) return 0;
    const positives = top.filter((entry) => entry.label === 1).length;
    return positives / top.length;
  });

  return values.length === 0 ? 0 : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function recallAtK(samples: GroupedBinarySample[], k: number) {
  const groups = new Map<string, GroupedBinarySample[]>();
  samples.forEach((sample) => {
    const list = groups.get(sample.groupId) ?? [];
    list.push(sample);
    groups.set(sample.groupId, list);
  });

  const values = Array.from(groups.values()).map((group) => {
    const positives = group.filter((entry) => entry.label === 1).length;
    if (positives === 0) return 0;
    const top = [...group].sort((left, right) => right.score - left.score).slice(0, k);
    return top.filter((entry) => entry.label === 1).length / positives;
  });

  return values.length === 0 ? 0 : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function hitRate(samples: GroupedBinarySample[], k: number) {
  const groups = new Map<string, GroupedBinarySample[]>();
  samples.forEach((sample) => {
    const list = groups.get(sample.groupId) ?? [];
    list.push(sample);
    groups.set(sample.groupId, list);
  });

  const hits: number[] = Array.from(groups.values()).map((group) => {
    const top = [...group].sort((left, right) => right.score - left.score).slice(0, k);
    return top.some((entry) => entry.label === 1) ? 1 : 0;
  });

  return hits.length === 0 ? 0 : round(hits.reduce<number>((sum, value) => sum + value, 0) / hits.length);
}

function calibrationError(samples: BinarySample[]) {
  if (samples.length === 0) return 0;
  const bins = Array.from({ length: 10 }, () => [] as BinarySample[]);
  samples.forEach((sample) => {
    const bucket = Math.min(9, Math.floor(clamp01(sample.score) * 10));
    bins[bucket].push(sample);
  });

  const error = bins.reduce((sum, bucket) => {
    if (bucket.length === 0) return sum;
    const avgScore = bucket.reduce((inner, sample) => inner + clamp01(sample.score), 0) / bucket.length;
    const avgLabel = bucket.reduce((inner, sample) => inner + sample.label, 0) / bucket.length;
    return sum + (Math.abs(avgScore - avgLabel) * (bucket.length / samples.length));
  }, 0);

  return round(error);
}

function auc(samples: BinarySample[]) {
  const positives = samples.filter((sample) => sample.label === 1);
  const negatives = samples.filter((sample) => sample.label === 0);
  if (positives.length === 0 || negatives.length === 0 || samples.length < 50) return null;

  let wins = 0;
  let ties = 0;
  positives.forEach((positive) => {
    negatives.forEach((negative) => {
      if (positive.score > negative.score) wins += 1;
      else if (positive.score === negative.score) ties += 1;
    });
  });

  return round((wins + (ties * 0.5)) / (positives.length * negatives.length));
}

function falsePositiveRate(samples: BinarySample[], threshold = 0.5) {
  const negatives = samples.filter((sample) => sample.label === 0);
  if (negatives.length === 0) return 0;
  const falsePositives = negatives.filter((sample) => clamp01(sample.score) >= threshold).length;
  return round(falsePositives / negatives.length);
}

function coverage(samples: BinarySample[]) {
  if (samples.length === 0) return 0;
  return round(samples.filter((sample) => Number.isFinite(sample.score)).length / samples.length);
}

function staleSourceRate(samples: BinarySample[]) {
  if (samples.length === 0) return 0;
  return round(samples.filter((sample) => sample.staleSource === true).length / samples.length);
}

function sourceDisagreementRate(samples: BinarySample[]) {
  if (samples.length === 0) return 0;
  return round(samples.filter((sample) => sample.sourceDisagreement === true).length / samples.length);
}

function toMetrics(samples: GroupedBinarySample[]): ModelMetrics {
  const flat: BinarySample[] = samples.map((sample) => ({
    timestampMs: sample.timestampMs,
    score: sample.score,
    label: sample.label,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));

  return {
    precisionAt5: precisionAtK(samples, 5),
    precisionAt10: precisionAtK(samples, 10),
    recallAt10: recallAtK(samples, 10),
    calibrationError: calibrationError(flat),
    auc: auc(flat),
    hitRate: hitRate(samples, 10),
    falsePositiveRate: falsePositiveRate(flat),
    coverage: coverage(flat),
    staleSourceRate: staleSourceRate(flat),
    sourceDisagreementRate: sourceDisagreementRate(flat),
  };
}

function compareAgainstBaseline(modelMetrics: ModelMetrics, baselineMetrics: ModelMetrics) {
  const improvementSummary: string[] = [];
  const comparisons = [
    ["precision@5", modelMetrics.precisionAt5 - baselineMetrics.precisionAt5],
    ["precision@10", modelMetrics.precisionAt10 - baselineMetrics.precisionAt10],
    ["recall@10", modelMetrics.recallAt10 - baselineMetrics.recallAt10],
    ["hit rate", modelMetrics.hitRate - baselineMetrics.hitRate],
    ["false positive rate", baselineMetrics.falsePositiveRate - modelMetrics.falsePositiveRate],
    ["calibration error", baselineMetrics.calibrationError - modelMetrics.calibrationError],
  ] as const;

  comparisons.forEach(([label, delta]) => {
    if (delta > 0.01) improvementSummary.push(`${label} improved by ${round(delta, 3)}`);
  });

  const beatsBaseline = (
    modelMetrics.precisionAt5 >= baselineMetrics.precisionAt5 &&
    modelMetrics.precisionAt10 >= baselineMetrics.precisionAt10 &&
    modelMetrics.recallAt10 >= baselineMetrics.recallAt10 &&
    modelMetrics.hitRate >= baselineMetrics.hitRate &&
    modelMetrics.falsePositiveRate <= baselineMetrics.falsePositiveRate &&
    modelMetrics.calibrationError <= baselineMetrics.calibrationError + 0.02
  );

  return { beatsBaseline, improvementSummary };
}

function scoreRecommendationHead(head: RecommendationModelArtifact["heads"]["predictedPaidConversion"], featureMap: Record<string, number>) {
  let weighted = head.intercept;
  Object.entries(head.weights).forEach(([key, weight]) => {
    weighted += (featureMap[key] || 0) * weight;
  });
  return clamp01(sigmoid(weighted));
}

function toFeatureMap(features: RecommendationRankingFeatures) {
  return {
    creatorAffinity: features.creatorAffinity,
    contentAffinity: features.contentAffinity,
    experienceAffinity: features.experienceAffinity,
    completionQuality: features.completionQuality,
    unlockQuality: features.unlockQuality,
    purchaseIntent: features.purchaseIntent,
    returnCadence: features.returnCadence,
    popularity: features.popularity,
    freshness: features.freshness,
    urgency: features.urgency,
    priceFit: features.priceFit,
    followedCreatorBoost: features.followedCreatorBoost,
    previousUnlockCreatorBoost: features.previousUnlockCreatorBoost,
    similarUserBoost: features.similarUserBoost,
    confidence: features.confidence,
    previousExposurePenalty: features.previousExposurePenalty / 40,
    fatiguePenalty: features.fatiguePenalty / 16,
    pNegativeFeedback: features.pNegativeFeedback,
    suppressionScore: features.suppressionScore,
  };
}

function scoreRecommendationArtifact(artifact: RecommendationModelArtifact, features: RecommendationRankingFeatures) {
  const featureMap = toFeatureMap(features);
  const predictedPaidConversion = scoreRecommendationHead(artifact.heads.predictedPaidConversion, featureMap);
  const predictedUnlock = scoreRecommendationHead(artifact.heads.predictedUnlock, featureMap);
  const predictedWatchCompletion = scoreRecommendationHead(artifact.heads.predictedWatchCompletion, featureMap);
  const predictedReturn = scoreRecommendationHead(artifact.heads.predictedReturn, featureMap);
  const baseScore = computeDropRecommendationScore({
    pPurchase7d: predictedPaidConversion,
    pUnlock24h: predictedUnlock,
    pWatchComplete: predictedWatchCompletion,
    pReturn7d: predictedReturn,
    pCreatorFollow: features.pCreatorFollow,
    pNegativeFeedback: features.pNegativeFeedback,
    freshness: features.freshness,
    urgency: features.urgency,
    fatiguePenalty: features.fatiguePenalty,
    repeatExposurePenalty: features.previousExposurePenalty,
    diversityBoost: features.diversityBoost,
  });
  return applyRecommendationSuppression(baseScore, features.suppressionScore) / 100;
}

function buildRecommendationFeatures(kind: number, slot: number): RecommendationRankingFeatures {
  const aligned = slot < 2;
  const moderate = slot >= 2 && slot < 4;
  const creatorAffinity = aligned ? 0.75 - (slot * 0.06) : moderate ? 0.42 - ((slot - 2) * 0.04) : 0.08 + ((slot % 3) * 0.03);
  const contentAffinity = kind === 1 ? (aligned ? 0.82 : moderate ? 0.5 : 0.12) : aligned ? 0.7 : moderate ? 0.38 : 0.1;
  const purchaseIntent = kind === 0 ? (aligned ? 0.78 : moderate ? 0.35 : 0.08) : kind === 2 ? (aligned ? 0.32 : moderate ? 0.24 : 0.1) : 0.1;
  const predictedUnlock = aligned ? 0.75 : moderate ? 0.42 : 0.11;
  const predictedWatchCompletion = kind === 1 ? (aligned ? 0.86 : moderate ? 0.52 : 0.18) : aligned ? 0.58 : moderate ? 0.34 : 0.12;
  const predictedReturn = aligned ? 0.72 : moderate ? 0.4 : 0.1;
  const freshness = aligned ? 0.78 : moderate ? 0.6 : 0.36;
  const urgency = slot === 0 ? 0.55 : slot === 1 ? 0.35 : 0.15;
  const fatiguePenalty = slot > 5 ? 9 : slot > 3 ? 4 : 1;
  const previousExposurePenalty = slot > 6 ? 14 : slot > 4 ? 8 : 2;

  return {
    creatorAffinity,
    contentAffinity,
    experienceAffinity: aligned ? 0.55 : moderate ? 0.34 : 0.1,
    completionQuality: aligned ? 0.68 : moderate ? 0.45 : 0.14,
    unlockQuality: aligned ? 0.64 : moderate ? 0.38 : 0.1,
    purchaseIntent,
    returnCadence: aligned ? 0.7 : moderate ? 0.4 : 0.12,
    popularity: aligned ? 0.52 : moderate ? 0.46 : 0.22,
    freshness,
    urgency,
    priceFit: kind === 0 ? (aligned ? 0.82 : moderate ? 0.62 : 0.4) : aligned ? 0.74 : moderate ? 0.58 : 0.48,
    followedCreatorBoost: aligned ? 1 : 0,
    previousUnlockCreatorBoost: slot === 1 ? 1 : 0,
    similarUserBoost: kind === 2 && aligned ? 1 : 0,
    pPurchase7d: kind === 0 ? (aligned ? 0.8 : moderate ? 0.38 : 0.08) : aligned ? 0.34 : moderate ? 0.2 : 0.06,
    pUnlock24h: predictedUnlock,
    pWatchComplete: predictedWatchCompletion,
    pReturn7d: predictedReturn,
    pCreatorFollow: aligned ? 0.58 : moderate ? 0.28 : 0.06,
    pNegativeFeedback: slot > 7 ? 0.42 : slot > 5 ? 0.22 : 0.03,
    predictedPaidConversion: kind === 0 ? (aligned ? 0.8 : moderate ? 0.38 : 0.08) : aligned ? 0.34 : moderate ? 0.2 : 0.06,
    predictedUnlock,
    predictedWatchCompletion,
    predictedReturn,
    previousExposurePenalty,
    fatiguePenalty,
    diversityBoost: aligned && slot % 2 === 0 ? 2 : 0,
    suppressionScore: slot > 7 ? 0.32 : slot > 5 ? 0.16 : 0,
    suppressionScoreMultiplier: slot > 7 ? 0.68 : slot > 5 ? 0.84 : 1,
    suppressionReasons: slot > 7 ? ["Lowered because user dismissed similar drops."] : [],
    truthScore: aligned ? 0.9 : moderate ? 0.68 : 0.32,
    confidence: aligned ? 0.82 : moderate ? 0.62 : 0.28,
  };
}

function buildSyntheticDataset() {
  const nowMs = Date.now();
  const userSamples: Array<{
    timestampMs: number;
    engagementInput: UserEngagementScoreInput;
    valueInput: UserValueScoreInput;
    targets: {
      paidPurchaseWithin7d: 0 | 1;
      unlockWithin24h: 0 | 1;
      validWatchCompletion: 0 | 1;
      returnWithin7d: 0 | 1;
    };
    staleSource: boolean;
    sourceDisagreement: boolean;
  }> = [];
  const recommendationSamples: Array<{
    groupId: string;
    timestampMs: number;
    features: RecommendationRankingFeatures;
    label: 0 | 1;
    staleSource: boolean;
    sourceDisagreement: boolean;
  }> = [];
  const watchSamples: Array<{
    groupId: string;
    timestampMs: number;
    actualWatchMs: number;
    completed: 0 | 1;
    staleSource: boolean;
    sourceDisagreement: boolean;
    viewerOpenMs: number;
    medianKnownWatchMsForMediaType: number;
    viewedFileCount: number;
    pageDurationMs: number;
    watchSessionEventCount: number;
    partialMediaTicks: boolean;
  }> = [];
  const theftSamples: Array<{
    groupId: string;
    timestampMs: number;
    scoreLabel: 0 | 1;
    staleSource: boolean;
    sourceDisagreement: boolean;
    evidence: ReturnType<typeof normalizeTheftRiskEvidence>[];
  }> = [];
  const confidenceSamples: Array<{
    groupId: string;
    timestampMs: number;
    personalizeSafe: 0 | 1;
    staleSource: boolean;
    sourceDisagreement: boolean;
    input: Parameters<typeof computeBehavioralConfidence>[0];
  }> = [];

  for (let index = 0; index < 240; index += 1) {
    const archetype = index % 6;
    const timestampMs = nowMs - ((240 - index) * DAY_MS);
    const staleSource = archetype === 4;
    const sourceDisagreement = archetype === 4 || archetype === 5;

    let engagementInput: UserEngagementScoreInput;
    let valueInput: UserValueScoreInput;
    let targets: {
      paidPurchaseWithin7d: 0 | 1;
      unlockWithin24h: 0 | 1;
      validWatchCompletion: 0 | 1;
      returnWithin7d: 0 | 1;
    };

    switch (archetype) {
      case 0:
        engagementInput = { normalizedActionCount7d: 86, unwrappedCount30d: 18, validWatchMinutes30d: 155, purchaseCount90d: 5, activeDays7d: 6, freeGdEarned30d: 80 };
        valueInput = { totalSpendUsd: 220, purchaseCount: 6, paidGdPurchased: 6400, bonusGdDelivered: 900, rewardGdEarned: 80, freeGdEarned30d: 80, unwrapsAfterPurchase: 32, daysSinceLastPurchase: 2 };
        targets = { paidPurchaseWithin7d: 1, unlockWithin24h: 1, validWatchCompletion: 1, returnWithin7d: 1 };
        break;
      case 1:
        engagementInput = { normalizedActionCount7d: 58, unwrappedCount30d: 14, validWatchMinutes30d: 182, purchaseCount90d: 1, activeDays7d: 5, freeGdEarned30d: 120 };
        valueInput = { totalSpendUsd: 28, purchaseCount: 1, paidGdPurchased: 800, bonusGdDelivered: 120, rewardGdEarned: 120, freeGdEarned30d: 120, unwrapsAfterPurchase: 16, daysSinceLastPurchase: 19 };
        targets = { paidPurchaseWithin7d: index % 12 === 0 ? 1 : 0, unlockWithin24h: 1, validWatchCompletion: 1, returnWithin7d: 1 };
        break;
      case 2:
        engagementInput = { normalizedActionCount7d: 27, unwrappedCount30d: 6, validWatchMinutes30d: 48, purchaseCount90d: 0, activeDays7d: 3, freeGdEarned30d: 620 };
        valueInput = { totalSpendUsd: 0, purchaseCount: 0, paidGdPurchased: 0, bonusGdDelivered: 0, rewardGdEarned: 620, freeGdEarned30d: 620, unwrapsAfterPurchase: 0, daysSinceLastPurchase: null };
        targets = { paidPurchaseWithin7d: index % 4 === 0 ? 1 : 0, unlockWithin24h: 1, validWatchCompletion: 0, returnWithin7d: 1 };
        break;
      case 3:
        engagementInput = { normalizedActionCount7d: 3, unwrappedCount30d: 0, validWatchMinutes30d: 0, purchaseCount90d: 0, activeDays7d: 1, freeGdEarned30d: 0 };
        valueInput = { totalSpendUsd: 0, purchaseCount: 0, paidGdPurchased: 0, bonusGdDelivered: 0, rewardGdEarned: 0, freeGdEarned30d: 0, unwrapsAfterPurchase: 0, daysSinceLastPurchase: null };
        targets = { paidPurchaseWithin7d: 0, unlockWithin24h: 0, validWatchCompletion: 0, returnWithin7d: 0 };
        break;
      case 4:
        engagementInput = { normalizedActionCount7d: 19, unwrappedCount30d: 4, validWatchMinutes30d: 0, purchaseCount90d: 0, activeDays7d: 4, freeGdEarned30d: 60 };
        valueInput = { totalSpendUsd: 14, purchaseCount: 0, paidGdPurchased: 0, bonusGdDelivered: 0, rewardGdEarned: 60, freeGdEarned30d: 60, unwrapsAfterPurchase: 4, daysSinceLastPurchase: 45 };
        targets = { paidPurchaseWithin7d: 0, unlockWithin24h: 1, validWatchCompletion: 0, returnWithin7d: 1 };
        break;
      default:
        engagementInput = { normalizedActionCount7d: 31, unwrappedCount30d: 1, validWatchMinutes30d: 2, purchaseCount90d: 0, activeDays7d: 2, freeGdEarned30d: 0 };
        valueInput = { totalSpendUsd: 0, purchaseCount: 0, paidGdPurchased: 0, bonusGdDelivered: 0, rewardGdEarned: 0, freeGdEarned30d: 0, unwrapsAfterPurchase: 0, daysSinceLastPurchase: null };
        targets = { paidPurchaseWithin7d: 0, unlockWithin24h: 0, validWatchCompletion: 0, returnWithin7d: 0 };
        break;
    }

    userSamples.push({ timestampMs, engagementInput, valueInput, targets, staleSource, sourceDisagreement });

    for (let slot = 0; slot < 10; slot += 1) {
      const features = buildRecommendationFeatures(archetype, slot);
      const label: 0 | 1 = slot < (archetype === 0 ? 3 : archetype === 1 ? 2 : archetype === 2 ? 2 : archetype === 4 ? 1 : 0) ? 1 : 0;
      recommendationSamples.push({
        groupId: `query-${index}`,
        timestampMs,
        features,
        label,
        staleSource,
        sourceDisagreement,
      });
    }

    watchSamples.push({
      groupId: `watch-${index}`,
      timestampMs,
      actualWatchMs: archetype === 0 ? 95_000 : archetype === 1 ? 72_000 : archetype === 2 ? 18_000 : archetype === 3 ? 0 : archetype === 4 ? 22_000 : 1_500,
      completed: archetype === 0 || archetype === 1 ? 1 : 0,
      staleSource,
      sourceDisagreement,
      viewerOpenMs: archetype === 0 ? 100_000 : archetype === 1 ? 78_000 : archetype === 2 ? 24_000 : archetype === 3 ? 4_000 : archetype === 4 ? 40_000 : 10_000,
      medianKnownWatchMsForMediaType: archetype === 3 ? 0 : archetype === 5 ? 5_000 : 20_000,
      viewedFileCount: archetype === 0 ? 4 : archetype === 1 ? 3 : archetype === 2 ? 2 : archetype === 3 ? 1 : archetype === 4 ? 2 : 8,
      pageDurationMs: archetype === 0 ? 120_000 : archetype === 1 ? 96_000 : archetype === 2 ? 40_000 : archetype === 3 ? 6_000 : archetype === 4 ? 50_000 : 30_000,
      watchSessionEventCount: archetype === 4 ? 0 : archetype === 5 ? 1 : 6,
      partialMediaTicks: archetype === 5,
    });

    const theftEvidence = archetype === 5
      ? [
          normalizeTheftRiskEvidence(`t-${index}-1`, { reason: "blocked_content_url_access_without_entitlement", source: "entitlement", confidence: "confirmed", repeatCount: 2, message: "Blocked asset access without entitlement." }),
          normalizeTheftRiskEvidence(`t-${index}-2`, { reason: "signed_url_reuse_different_session", source: "server", confidence: "confirmed", message: "Signed URL reused across sessions." }),
        ]
      : archetype === 4
        ? [normalizeTheftRiskEvidence(`t-${index}-1`, { reason: "visibility_hidden_while_content_visible", source: "viewer", confidence: "heuristic", repeatCount: 1, message: "Page hid while media was visible." })]
        : [normalizeTheftRiskEvidence(`t-${index}-1`, { reason: "normal_viewing_session", source: "viewer", confidence: "heuristic", weight: 0, message: "Normal viewing session." })];
    theftSamples.push({
      groupId: `theft-${index}`,
      timestampMs,
      scoreLabel: archetype === 5 ? 1 : 0,
      staleSource,
      sourceDisagreement,
      evidence: theftEvidence,
    });

    confidenceSamples.push({
      groupId: `confidence-${index}`,
      timestampMs,
      personalizeSafe: archetype === 0 || archetype === 1 || archetype === 2 ? 1 : 0,
      staleSource,
      sourceDisagreement,
      input: {
        agreeingSources: archetype === 0 ? 4 : archetype === 1 ? 4 : archetype === 2 ? 3 : archetype === 3 ? 1 : archetype === 4 ? 2 : 2,
        availableSources: 4,
        ageMs: staleSource ? 40 * DAY_MS : archetype === 0 ? DAY_MS : 3 * DAY_MS,
        maxFreshnessMs: 30 * DAY_MS,
        sampleCount: archetype === 0 ? 120 : archetype === 1 ? 80 : archetype === 2 ? 35 : archetype === 3 ? 3 : archetype === 4 ? 12 : 8,
        requiredFieldsPresent: archetype === 0 ? 7 : archetype === 1 ? 6 : archetype === 2 ? 4 : archetype === 3 ? 2 : archetype === 4 ? 3 : 2,
        requiredFieldsTotal: 7,
        issueCount: sourceDisagreement ? 2 : staleSource ? 1 : 0,
      },
    });
  }

  return { userSamples, recommendationSamples, watchSamples, theftSamples, confidenceSamples };
}

function buildEngagementSummary(dataset: ReturnType<typeof buildSyntheticDataset>): ModelSummary {
  const split = buildTimeSplit(dataset.userSamples);
  const validationSamples: GroupedBinarySample[] = split.validation.map((sample, index) => ({
    groupId: `engagement-${index}`,
    timestampMs: sample.timestampMs,
    score: computeUserEngagementScore(sample.engagementInput).score / 100,
    label: sample.targets.returnWithin7d || sample.targets.unlockWithin24h || sample.targets.validWatchCompletion ? 1 : 0,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const baselineSamples: GroupedBinarySample[] = split.validation.map((sample, index) => ({
    groupId: `engagement-${index}`,
    timestampMs: sample.timestampMs,
    score: clamp01(sample.engagementInput.normalizedActionCount7d / 100),
    label: sample.targets.returnWithin7d || sample.targets.unlockWithin24h || sample.targets.validWatchCompletion ? 1 : 0,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const metrics = toMetrics(validationSamples);
  const baselineMetrics = toMetrics(baselineSamples);
  const comparison = compareAgainstBaseline(metrics, baselineMetrics);

  return {
    modelVersion: 1,
    trainingSampleSize: split.train.length,
    validationSampleSize: split.validation.length,
    trainingSource: "deterministic_rule_score",
    metrics,
    baselineComparison: {
      baselineName: "action_count_only",
      baselineMetrics,
      beatsBaseline: comparison.beatsBaseline,
      improvementSummary: comparison.improvementSummary,
    },
    activeMode: "deterministic",
    reasons: comparison.beatsBaseline
      ? ["Engagement score outperforms action-count-only ranking on synthetic time-split validation."]
      : ["Engagement score is deterministic and remains active even when the baseline is close."],
  };
}

function buildValueSummary(dataset: ReturnType<typeof buildSyntheticDataset>): ModelSummary {
  const split = buildTimeSplit(dataset.userSamples);
  const validationSamples: GroupedBinarySample[] = split.validation.map((sample, index) => ({
    groupId: `value-${index}`,
    timestampMs: sample.timestampMs,
    score: computeUserValueScore(sample.valueInput).valueScore / 100,
    label: sample.targets.paidPurchaseWithin7d,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const baselineSamples: GroupedBinarySample[] = split.validation.map((sample, index) => ({
    groupId: `value-${index}`,
    timestampMs: sample.timestampMs,
    score: clamp01(sample.valueInput.totalSpendUsd / 500),
    label: sample.targets.paidPurchaseWithin7d,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const metrics = toMetrics(validationSamples);
  const baselineMetrics = toMetrics(baselineSamples);
  const comparison = compareAgainstBaseline(metrics, baselineMetrics);

  return {
    modelVersion: 1,
    trainingSampleSize: split.train.length,
    validationSampleSize: split.validation.length,
    trainingSource: "deterministic_rule_score",
    metrics,
    baselineComparison: {
      baselineName: "total_spend_only",
      baselineMetrics,
      beatsBaseline: comparison.beatsBaseline,
      improvementSummary: comparison.improvementSummary,
    },
    activeMode: "deterministic",
    reasons: [
      "Value score stays deterministic because spend and purchase count are the canonical value truth.",
      ...(comparison.beatsBaseline ? ["Post-purchase usage and recency improve ranking over spend-only baseline."] : []),
    ],
  };
}

function buildRecommendationSummary(dataset: ReturnType<typeof buildSyntheticDataset>, artifact: RecommendationModelArtifact | null): ModelSummary {
  const split = buildTimeSplit(dataset.recommendationSamples);
  const baselineSamples: GroupedBinarySample[] = split.validation.map((sample) => ({
    groupId: sample.groupId,
    timestampMs: sample.timestampMs,
    score: computeDeterministicRecommendationScore(sample.features) / 100,
    label: sample.label,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const mlSamples: GroupedBinarySample[] = split.validation.map((sample) => ({
    groupId: sample.groupId,
    timestampMs: sample.timestampMs,
    score: artifact ? scoreRecommendationArtifact(artifact, sample.features) : 0,
    label: sample.label,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const baselineMetrics = toMetrics(baselineSamples);
  const metrics = artifact ? toMetrics(mlSamples) : baselineMetrics;
  const comparison = compareAgainstBaseline(metrics, baselineMetrics);
  const reasons: string[] = [];

  if (!artifact) reasons.push("Recommendation artifact is missing, so deterministic ranking remains active.");
  if (artifact?.sampleCount !== undefined && artifact.sampleCount < 50) reasons.push("Training sample size is below 50, so no ML verdict is allowed.");
  if (artifact?.sampleCount !== undefined && artifact.sampleCount < 200 && artifact.sampleCount >= 50) reasons.push("Training sample size is below 200, so any ML result is experimental only.");
  if (artifact?.trainingSource === "synthetic_bootstrap") reasons.push("Training source is synthetic bootstrap, so ML cannot activate in production.");
  if (!comparison.beatsBaseline) reasons.push("ML artifact does not beat the deterministic baseline on the time-based validation split.");

  let activeMode: ActiveMode = "deterministic";
  if (artifact && comparison.beatsBaseline && artifact.trainingSource === "firestore_proxy") {
    if (artifact.sampleCount < 50) activeMode = "deterministic";
    else if (artifact.sampleCount < 200) activeMode = "ml_experimental";
    else if ((metrics.precisionAt5 - baselineMetrics.precisionAt5) >= 0.05 || (metrics.hitRate - baselineMetrics.hitRate) >= 0.05) activeMode = "ml_active";
    else activeMode = "hybrid";
  }

  if (activeMode === "hybrid") reasons.push("ML beats deterministic baseline and is allowed as a bounded blend over deterministic retrieval.");
  if (activeMode === "ml_active") reasons.push("ML beats deterministic baseline with enough sample support for active ranking.");

  return {
    modelVersion: artifact?.version ?? 1,
    trainingSampleSize: artifact?.sampleCount ?? split.train.length,
    validationSampleSize: split.validation.length,
    trainingSource: artifact?.trainingSource ?? "missing_artifact",
    metrics,
    baselineComparison: {
      baselineName: "deterministic_ranker",
      baselineMetrics,
      beatsBaseline: comparison.beatsBaseline,
      improvementSummary: comparison.improvementSummary,
    },
    activeMode,
    reasons,
  };
}

function buildWatchSummary(dataset: ReturnType<typeof buildSyntheticDataset>): ModelSummary {
  const split = buildTimeSplit(dataset.watchSamples);
  const validationSamples: GroupedBinarySample[] = split.validation.map((sample) => {
    const estimate = estimateMissingWatchTime({
      viewerOpenMs: sample.viewerOpenMs,
      medianKnownWatchMsForMediaType: sample.medianKnownWatchMsForMediaType,
      viewedFileCount: sample.viewedFileCount,
      pageDurationMs: sample.pageDurationMs,
      watchSessionEventCount: sample.watchSessionEventCount,
      partialMediaTicks: sample.partialMediaTicks,
    });
    const estimatedMs = estimate?.estimatedWatchMs ?? 0;
    const score = clamp01(1 - Math.min(1, Math.abs(estimatedMs - sample.actualWatchMs) / Math.max(sample.actualWatchMs || 1, 1)));
    return {
      groupId: sample.groupId,
      timestampMs: sample.timestampMs,
      score,
      label: sample.completed,
      staleSource: sample.staleSource,
      sourceDisagreement: sample.sourceDisagreement,
    };
  });
  const baselineSamples: GroupedBinarySample[] = split.validation.map((sample) => {
    const legacyEstimate = Math.round(sample.pageDurationMs * 0.6);
    const score = clamp01(1 - Math.min(1, Math.abs(legacyEstimate - sample.actualWatchMs) / Math.max(sample.actualWatchMs || 1, 1)));
    return {
      groupId: sample.groupId,
      timestampMs: sample.timestampMs,
      score,
      label: sample.completed,
      staleSource: sample.staleSource,
      sourceDisagreement: sample.sourceDisagreement,
    };
  });
  const metrics = toMetrics(validationSamples);
  const baselineMetrics = toMetrics(baselineSamples);
  const comparison = compareAgainstBaseline(metrics, baselineMetrics);

  return {
    modelVersion: 2,
    trainingSampleSize: split.train.length,
    validationSampleSize: split.validation.length,
    trainingSource: "diagnostic_estimation_rule",
    metrics,
    baselineComparison: {
      baselineName: "legacy_page_duration",
      baselineMetrics,
      beatsBaseline: comparison.beatsBaseline,
      improvementSummary: comparison.improvementSummary,
    },
    activeMode: "deterministic",
    reasons: [
      "Watch-time estimation remains diagnostics-only and never replaces verified watch-session truth.",
      ...(comparison.beatsBaseline ? ["Bounded estimate outperforms raw legacy page-duration fallback on validation scenarios."] : []),
    ],
  };
}

function buildTheftSummary(dataset: ReturnType<typeof buildSyntheticDataset>): ModelSummary {
  const split = buildTimeSplit(dataset.theftSamples);
  const validationSamples: GroupedBinarySample[] = split.validation.map((sample) => {
    const result = scoreTheftRisk({
      evidence: sample.evidence,
      validWatchMs: sample.scoreLabel === 1 ? 0 : 20_000,
      normalViewingPace: sample.scoreLabel === 0,
      oneOffMobileSafariBlur: sample.evidence.some((entry) => entry.normalizedReason.includes("visibility_hidden")),
      userReturnedToViewing: sample.scoreLabel === 0,
    });
    return {
      groupId: sample.groupId,
      timestampMs: sample.timestampMs,
      score: result.score / 100,
      label: sample.scoreLabel,
      staleSource: sample.staleSource,
      sourceDisagreement: sample.sourceDisagreement,
    };
  });
  const baselineSamples: GroupedBinarySample[] = split.validation.map((sample) => ({
    groupId: sample.groupId,
    timestampMs: sample.timestampMs,
    score: sample.evidence.some((entry) => entry.normalizedReason.includes("visibility") || entry.normalizedReason.includes("screenshot")) ? 0.7 : 0.1,
    label: sample.scoreLabel,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const metrics = toMetrics(validationSamples);
  const baselineMetrics = toMetrics(baselineSamples);
  const comparison = compareAgainstBaseline(metrics, baselineMetrics);

  return {
    modelVersion: 1,
    trainingSampleSize: split.train.length,
    validationSampleSize: split.validation.length,
    trainingSource: "deterministic_rule_score",
    metrics,
    baselineComparison: {
      baselineName: "visibility_event_alerting",
      baselineMetrics,
      beatsBaseline: comparison.beatsBaseline,
      improvementSummary: comparison.improvementSummary,
    },
    activeMode: "deterministic",
    reasons: [
      "Theft risk remains deterministic because moderation, content protection, and account actions cannot be delegated to ML.",
      ...(comparison.beatsBaseline ? ["Evidence-weighted theft scoring reduces false positives against visibility-only alerting."] : []),
    ],
  };
}

function buildConfidenceSummary(dataset: ReturnType<typeof buildSyntheticDataset>): ModelSummary {
  const split = buildTimeSplit(dataset.confidenceSamples);
  const validationSamples: GroupedBinarySample[] = split.validation.map((sample) => {
    const result = computeBehavioralConfidence(sample.input);
    return {
      groupId: sample.groupId,
      timestampMs: sample.timestampMs,
      score: result.score / 100,
      label: sample.personalizeSafe,
      staleSource: sample.staleSource,
      sourceDisagreement: sample.sourceDisagreement,
    };
  });
  const baselineSamples: GroupedBinarySample[] = split.validation.map((sample) => ({
    groupId: sample.groupId,
    timestampMs: sample.timestampMs,
    score: clamp01(Math.log10(sample.input.sampleCount + 1) / 3),
    label: sample.personalizeSafe,
    staleSource: sample.staleSource,
    sourceDisagreement: sample.sourceDisagreement,
  }));
  const metrics = toMetrics(validationSamples);
  const baselineMetrics = toMetrics(baselineSamples);
  const comparison = compareAgainstBaseline(metrics, baselineMetrics);

  return {
    modelVersion: 1,
    trainingSampleSize: split.train.length,
    validationSampleSize: split.validation.length,
    trainingSource: "deterministic_rule_score",
    metrics,
    baselineComparison: {
      baselineName: "sample_count_only",
      baselineMetrics,
      beatsBaseline: comparison.beatsBaseline,
      improvementSummary: comparison.improvementSummary,
    },
    activeMode: "deterministic",
    reasons: [
      "Behavioral confidence remains deterministic because source agreement, freshness, schema completeness, and issue penalties are policy truth.",
      ...(comparison.beatsBaseline ? ["Confidence formula outperforms sample-count-only scoring on personalization safety."] : []),
    ],
  };
}

function determineOverallStatus(models: ValidationReport["models"]): { overallStatus: ValidationStatus; overallActiveMode: ActiveMode; reasons: string[] } {
  const reasons: string[] = [];
  const recommendationMode = models.recommendationRanker.activeMode;
  const underperforming = Object.entries(models).filter(([, model]) => !model.baselineComparison.beatsBaseline && model.activeMode !== "deterministic");
  if (underperforming.length > 0) {
    reasons.push(`Models requiring baseline wins did not beat baseline: ${underperforming.map(([name]) => name).join(", ")}.`);
  }
  if (recommendationMode === "deterministic") {
    reasons.push("Recommendation ML remains inactive until it beats deterministic baseline with sufficient real sample support.");
  }
  const overallStatus: ValidationStatus = underperforming.length === 0 ? "aligned" : "needs_review";
  const overallActiveMode: ActiveMode = recommendationMode === "ml_active" ? "hybrid" : recommendationMode;
  return { overallStatus, overallActiveMode, reasons };
}

async function main() {
  const dataset = buildSyntheticDataset();
  const artifact = loadRecommendationArtifact();
  const recommendationSplit = buildTimeSplit(dataset.recommendationSamples);
  const reportModels: ValidationReport["models"] = {
    userEngagementScore: buildEngagementSummary(dataset),
    userValueScore: buildValueSummary(dataset),
    recommendationRanker: buildRecommendationSummary(dataset, artifact),
    watchTimeEstimation: buildWatchSummary(dataset),
    theftRiskScore: buildTheftSummary(dataset),
    behavioralConfidenceScore: buildConfidenceSummary(dataset),
  };
  const recommendationSplitPoint = recommendationSplit.splitAtMs;
  const overall = determineOverallStatus(reportModels);

  const report: ValidationReport = {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    splitPolicy: {
      type: "time_based",
      trainEndsBefore: new Date(recommendationSplitPoint).toISOString(),
      validateStartsAt: new Date(recommendationSplitPoint).toISOString(),
      leakageGuard: "Older synthetic behavioral scenarios train first; newer scenarios validate later. No random-only split is used.",
    },
    overallStatus: overall.overallStatus,
    overallActiveMode: overall.overallActiveMode,
    reasons: overall.reasons,
    models: reportModels,
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`[behavioral-models] wrote validation report to ${REPORT_PATH}`);
  console.log(`[behavioral-models] overallStatus=${report.overallStatus} recommendationMode=${report.models.recommendationRanker.activeMode}`);
}

void main().catch((error) => {
  console.error("[behavioral-models] validation failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
