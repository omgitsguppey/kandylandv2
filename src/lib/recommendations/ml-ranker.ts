import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { Drop } from "@/types/db";
import { computeDropRecommendationScore } from "@/lib/behavioral/behavioral-math-calibration";

import type {
  RecommendationRankingFeatures,
} from "@/lib/recommendations/ranking-features";
import { applyRecommendationSuppression } from "@/lib/recommendations/suppression-rules";

export type RecommendationModelHead = {
  intercept: number;
  weights: Record<string, number>;
  trainingAccuracy: number;
};

export type RecommendationModelArtifact = {
  version: 1;
  generatedAt: string;
  staleAfterMs: number;
  trainingSource: "firestore_proxy" | "synthetic_bootstrap";
  sampleCount: number;
  holdoutSampleCount: number;
  featureNames: string[];
  blendWeight: number;
  evaluation: {
    meanAccuracy: number;
    meanPositiveRate: number;
  };
  heads: {
    predictedPaidConversion: RecommendationModelHead;
    predictedUnlock: RecommendationModelHead;
    predictedWatchCompletion: RecommendationModelHead;
    predictedReturn: RecommendationModelHead;
  };
};

export type MlRecommendationScore = {
  mode: "ml_artifact";
  modelSource: RecommendationModelArtifact["trainingSource"];
  modelFreshness: "fresh" | "stale" | "missing";
  blendWeight: number;
  pPurchase7d: number;
  pUnlock24h: number;
  pWatchComplete: number;
  pReturn7d: number;
  predictedPaidConversion: number;
  predictedUnlock: number;
  predictedWatchCompletion: number;
  predictedReturn: number;
  score: number;
};

type BehavioralModelValidationReport = {
  generatedAt: string;
  models?: {
    recommendationRanker?: {
      activeMode?: "deterministic" | "hybrid" | "ml_experimental" | "ml_active";
    };
  };
};

const MODEL_ARTIFACT_PATH = path.resolve(process.cwd(), "agent/state/recommendation-model.generated.json");
const VALIDATION_REPORT_PATH = path.resolve(process.cwd(), "agent/state/behavioral-model-validation.generated.json");
let cachedArtifact: RecommendationModelArtifact | null | undefined;
let cachedValidationReport: BehavioralModelValidationReport | null | undefined;

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
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
    queryIntentScore: features.queryIntentScore,
    dropMomentumScore: features.dropMomentumScore / 100,
    satisfactionScore: features.satisfactionScore,
  };
}

function scoreHead(head: RecommendationModelHead, featureMap: Record<string, number>) {
  let weighted = head.intercept;
  Object.entries(head.weights).forEach(([key, weight]) => {
    weighted += (featureMap[key] || 0) * weight;
  });
  return clamp01(sigmoid(weighted));
}

export function loadRecommendationModelArtifact() {
  if (cachedArtifact !== undefined) {
    return cachedArtifact;
  }

  try {
    if (!fs.existsSync(MODEL_ARTIFACT_PATH)) {
      cachedArtifact = null;
      return cachedArtifact;
    }

    const raw = fs.readFileSync(MODEL_ARTIFACT_PATH, "utf8");
    cachedArtifact = JSON.parse(raw) as RecommendationModelArtifact;
    return cachedArtifact;
  } catch {
    cachedArtifact = null;
    return cachedArtifact;
  }
}

export function loadBehavioralModelValidationReport() {
  if (cachedValidationReport !== undefined) {
    return cachedValidationReport;
  }

  try {
    if (!fs.existsSync(VALIDATION_REPORT_PATH)) {
      cachedValidationReport = null;
      return cachedValidationReport;
    }

    const raw = fs.readFileSync(VALIDATION_REPORT_PATH, "utf8");
    cachedValidationReport = JSON.parse(raw) as BehavioralModelValidationReport;
    return cachedValidationReport;
  } catch {
    cachedValidationReport = null;
    return cachedValidationReport;
  }
}

export function resetRecommendationModelArtifactCache() {
  cachedArtifact = undefined;
  cachedValidationReport = undefined;
}

export function getRecommendationModelFreshness(artifact: RecommendationModelArtifact | null | undefined, nowMs = Date.now()) {
  if (!artifact) {
    return "missing" as const;
  }

  const generatedAtMs = Date.parse(artifact.generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    return "stale" as const;
  }

  return nowMs - generatedAtMs <= artifact.staleAfterMs ? "fresh" : "stale";
}

export function scoreRecommendationWithArtifact(input: {
  features: RecommendationRankingFeatures;
  artifact?: RecommendationModelArtifact | null;
  nowMs?: number;
}) : MlRecommendationScore | null {
  const validationReport = loadBehavioralModelValidationReport();
  const activeMode = validationReport?.models?.recommendationRanker?.activeMode || "deterministic";
  if (activeMode !== "hybrid" && activeMode !== "ml_active") {
    return null;
  }

  const artifact = input.artifact ?? loadRecommendationModelArtifact();
  const modelFreshness = getRecommendationModelFreshness(artifact, input.nowMs);
  if (!artifact || modelFreshness !== "fresh") {
    return null;
  }

  const featureMap = toFeatureMap(input.features);
  const predictedPaidConversion = scoreHead(artifact.heads.predictedPaidConversion, featureMap);
  const predictedUnlock = scoreHead(artifact.heads.predictedUnlock, featureMap);
  const predictedWatchCompletion = scoreHead(artifact.heads.predictedWatchCompletion, featureMap);
  const predictedReturn = scoreHead(artifact.heads.predictedReturn, featureMap);
  const baseScore = computeDropRecommendationScore({
    pPurchase7d: predictedPaidConversion,
    pUnlock24h: predictedUnlock,
    pWatchComplete: predictedWatchCompletion,
    pReturn7d: predictedReturn,
    pCreatorFollow: input.features.pCreatorFollow,
    pNegativeFeedback: input.features.pNegativeFeedback,
    freshness: input.features.freshness,
    urgency: input.features.urgency,
    fatiguePenalty: input.features.fatiguePenalty,
    repeatExposurePenalty: input.features.previousExposurePenalty,
    diversityBoost: input.features.diversityBoost,
  });
  const score = Math.min(
    100,
    applyRecommendationSuppression(baseScore, input.features.suppressionScore)
      + input.features.queryIntentBoost
      + input.features.dropMomentumBoost
      + input.features.satisfactionBoost,
  );

  return {
    mode: "ml_artifact",
    modelSource: artifact.trainingSource,
    modelFreshness,
    blendWeight: clamp01(artifact.blendWeight),
    pPurchase7d: predictedPaidConversion,
    pUnlock24h: predictedUnlock,
    pWatchComplete: predictedWatchCompletion,
    pReturn7d: predictedReturn,
    predictedPaidConversion,
    predictedUnlock,
    predictedWatchCompletion,
    predictedReturn,
    score,
  };
}
