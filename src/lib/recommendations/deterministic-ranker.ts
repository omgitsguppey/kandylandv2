import type { Drop } from "@/types/db";
import { computeDropRecommendationScore } from "@/lib/behavioral/behavioral-math-calibration";
import { applyRecommendationSuppression } from "@/lib/recommendations/suppression-rules";

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
  const baseScore = computeDropRecommendationScore({
    pPurchase7d: features.pPurchase7d,
    pUnlock24h: features.pUnlock24h,
    pWatchComplete: features.pWatchComplete,
    pReturn7d: features.pReturn7d,
    pCreatorFollow: features.pCreatorFollow,
    pNegativeFeedback: features.pNegativeFeedback,
    freshness: features.freshness,
    urgency: features.urgency,
    fatiguePenalty: features.fatiguePenalty,
    repeatExposurePenalty: features.previousExposurePenalty,
    diversityBoost: features.diversityBoost,
  });

  return clamp(applyRecommendationSuppression(baseScore, features.suppressionScore), 0, 100);
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
