import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { Drop } from "@/types/db";

import type {
  RecommendationRankingFeatures,
} from "@/lib/recommendations/ranking-features";

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
  predictedPaidConversion: number;
  predictedUnlock: number;
  predictedWatchCompletion: number;
  predictedReturn: number;
  score: number;
};

const MODEL_ARTIFACT_PATH = path.resolve(process.cwd(), "agent/state/recommendation-model.generated.json");
let cachedArtifact: RecommendationModelArtifact | null | undefined;

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

export function resetRecommendationModelArtifactCache() {
  cachedArtifact = undefined;
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
  const mlBaseScore = 100 * (
    (0.35 * predictedPaidConversion) +
    (0.20 * predictedWatchCompletion) +
    (0.15 * predictedUnlock) +
    (0.10 * input.features.creatorAffinity) +
    (0.08 * input.features.contentAffinity) +
    (0.07 * input.features.freshness) +
    (0.05 * input.features.urgency)
  );
  const score = Math.max(
    0,
    Math.min(100, mlBaseScore - input.features.previousExposurePenalty - input.features.fatiguePenalty),
  );

  return {
    mode: "ml_artifact",
    modelSource: artifact.trainingSource,
    modelFreshness,
    blendWeight: clamp01(artifact.blendWeight),
    predictedPaidConversion,
    predictedUnlock,
    predictedWatchCompletion,
    predictedReturn,
    score,
  };
}
