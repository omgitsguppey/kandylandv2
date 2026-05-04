import type { Drop } from "@/types/db";

import {
  buildRecommendationRankingFeatures,
  type RecommendationBehavioralProfileLike,
  type RecommendationCandidate,
  type RecommendationDropIntelligenceLike,
  type RecommendationRankingFeatures,
} from "@/lib/recommendations/ranking-features";

export type DeterministicRecommendationRanking = {
  drop: Drop;
  score: number;
  mode: "deterministic";
  features: RecommendationRankingFeatures;
  candidateSources: RecommendationCandidate["sources"];
  sourceReasons: string[];
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

export function computeDeterministicRecommendationScore(features: RecommendationRankingFeatures) {
  const baseScore = 100 * (
    (0.35 * features.predictedPaidConversion) +
    (0.20 * features.predictedWatchCompletion) +
    (0.15 * features.predictedUnlock) +
    (0.10 * features.creatorAffinity) +
    (0.08 * features.contentAffinity) +
    (0.07 * features.freshness) +
    (0.05 * features.urgency)
  );

  return clamp(baseScore - features.fatiguePenalty - features.previousExposurePenalty, 0, 100);
}

export function rankDeterministicRecommendations(input: {
  candidates: RecommendationCandidate[];
  profile?: RecommendationBehavioralProfileLike | null;
  dropIntelligence?: Map<string, RecommendationDropIntelligenceLike>;
  surface?: "viewer" | "drops";
  nowMs?: number;
}) : DeterministicRecommendationRanking[] {
  return input.candidates
    .map((candidate) => {
      const features = buildRecommendationRankingFeatures({
        drop: candidate.drop,
        profile: input.profile,
        intelligence: input.dropIntelligence?.get(candidate.drop.id),
        candidate,
        nowMs: input.nowMs,
        surface: input.surface,
      });

      return {
        drop: candidate.drop,
        score: computeDeterministicRecommendationScore(features),
        mode: "deterministic" as const,
        features,
        candidateSources: candidate.sources,
        sourceReasons: candidate.sourceReasons,
      };
    })
    .sort((left, right) => right.score - left.score || right.drop.validFrom - left.drop.validFrom);
}
