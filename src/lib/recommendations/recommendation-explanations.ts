import type {
  RecommendationCandidateSource,
  RecommendationRankingFeatures,
} from "@/lib/recommendations/ranking-features";

export type RecommendationExplanation = {
  summary: string;
  reasons: string[];
  diagnostics: Array<{
    label: string;
    value: number;
  }>;
};

function addIfMissing(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

export function buildRecommendationExplanation(input: {
  sources: RecommendationCandidateSource[];
  features: RecommendationRankingFeatures;
  fallbackReason?: string;
}) : RecommendationExplanation {
  const reasons: string[] = [];
  const { sources, features } = input;

  if (features.creatorAffinity >= 0.55) {
    addIfMissing(reasons, "This creator matches the viewer's strongest creator history.");
  }
  if (features.contentAffinity >= 0.45) {
    addIfMissing(reasons, "The content theme lines up with recent watch and unwrap behavior.");
  }
  if (features.pWatchComplete >= 0.45) {
    addIfMissing(reasons, "Viewer behavior suggests a meaningful chance of watch completion.");
  }
  if (features.pPurchase7d >= 0.4) {
    addIfMissing(reasons, "Purchase likelihood is stronger than a generic fallback pick.");
  }
  if (sources.includes("ending_soon") && features.urgency > 0) {
    addIfMissing(reasons, "It is close to ending, so urgency legitimately boosts ranking.");
  }
  if (sources.includes("similar_users")) {
    addIfMissing(reasons, "Similar-user taste overlap contributed a bounded retrieval boost.");
  }
  if (sources.includes("popular") && features.popularity >= 0.35) {
    addIfMissing(reasons, "Recent viewer demand makes this a reasonable popularity fallback.");
  }
  if (sources.includes("fresh") && features.freshness >= 0.55) {
    addIfMissing(reasons, "Freshness helped because the drop is still early in its live window.");
  }

  if (reasons.length === 0 && input.fallbackReason) {
    reasons.push(input.fallbackReason);
  }

  return {
    summary: reasons[0] || "This recommendation is fallback-only because no creator or content affinity has formed yet.",
    reasons: reasons.slice(0, 3),
    diagnostics: [
      { label: "Predicted paid conversion", value: features.predictedPaidConversion },
      { label: "pPurchase7d", value: features.pPurchase7d },
      { label: "pUnlock24h", value: features.pUnlock24h },
      { label: "pWatchComplete", value: features.pWatchComplete },
      { label: "pReturn7d", value: features.pReturn7d },
      { label: "pCreatorFollow", value: features.pCreatorFollow },
      { label: "pNegativeFeedback", value: features.pNegativeFeedback },
      { label: "Predicted unlock", value: features.predictedUnlock },
      { label: "Predicted watch completion", value: features.predictedWatchCompletion },
      { label: "Creator affinity", value: features.creatorAffinity },
      { label: "Content affinity", value: features.contentAffinity },
      { label: "Freshness", value: features.freshness },
      { label: "Urgency", value: features.urgency },
      { label: "Truth score", value: features.truthScore },
      { label: "Confidence", value: features.confidence },
      { label: "Fatigue penalty", value: features.fatiguePenalty / 100 },
      { label: "Previous exposure penalty", value: features.previousExposurePenalty / 100 },
    ],
  };
}
