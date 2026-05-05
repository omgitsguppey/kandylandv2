import type { Drop } from "@/types/db";
import { clamp01, clampScore, roundScore } from "@/lib/behavioral/behavioral-math-calibration";

export type RecommendationDiversityProfile = {
  categoryAffinity?: Record<string, number>;
  recentDropIds?: string[];
  recentCreatorIds?: string[];
};

export type DiversityCandidateSource = string;

export type DiversityRerankableRecommendation = {
  drop: Drop;
  score: number;
  candidateSources?: DiversityCandidateSource[];
};

export type RecommendationPriceTier = "free" | "low" | "mid" | "premium";

export type RecommendationDiversityDiagnostics = {
  predictedScore: number;
  rerankedScore: number;
  diversityPenalty: number;
  explorationBoost: number;
  sameCreatorPenalty: number;
  sameCategoryPenalty: number;
  sameMediaTypePenalty: number;
  recentExposurePenalty: number;
  priceTier: RecommendationPriceTier;
  mediaType: string;
  movedLower: boolean;
  reasons: string[];
};

export const DIVERSITY_CREATOR_LIMIT_TOP_6 = 2;
export const DIVERSITY_CATEGORY_LIMIT_TOP_8 = 3;
export const DIVERSITY_HIGH_CATEGORY_AFFINITY = 0.85;
export const DIVERSITY_ADMIN_REASON = "Moved lower to keep creator/category diversity.";

type CandidateWithIndex<T extends DiversityRerankableRecommendation> = {
  entry: T;
  originalIndex: number;
};

function normalizeKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function includesNormalized(values: string[] | undefined, key: string) {
  return key.length > 0 && Array.isArray(values) && values.some((value) => normalizeKey(value) === key);
}

export function resolveRecommendationPriceTier(drop: Drop): RecommendationPriceTier {
  const cost = Math.max(0, Number(drop.unlockCost || 0));
  if (cost <= 0) {
    return "free";
  }
  if (cost <= 250) {
    return "low";
  }
  if (cost <= 1000) {
    return "mid";
  }
  return "premium";
}

export function resolveRecommendationMediaType(drop: Drop) {
  const mediaCounts = drop.mediaCounts;
  if ((mediaCounts?.videos || 0) > 0 && (mediaCounts?.images || 0) > 0) {
    return "mixed";
  }
  if ((mediaCounts?.videos || 0) > 0) {
    return "video";
  }
  if ((mediaCounts?.images || 0) > 0) {
    return "image";
  }

  const fileType = normalizeKey(drop.fileMetadata?.type);
  if (fileType.includes("video")) {
    return "video";
  }
  if (fileType.includes("image")) {
    return "image";
  }

  return normalizeKey(drop.type) || "unknown";
}

function getCategoryAffinity(profile: RecommendationDiversityProfile | null, categoryKey: string) {
  if (!profile || !categoryKey) {
    return 0;
  }

  return clamp01((profile.categoryAffinity?.[categoryKey] || 0) / 5);
}

function countSelected<T extends DiversityRerankableRecommendation>(
  selected: Array<T & { diversity?: RecommendationDiversityDiagnostics }>,
  resolver: (entry: T) => string,
  key: string,
) {
  return selected.filter((entry) => key.length > 0 && resolver(entry) === key).length;
}

function hasAlternative<T extends DiversityRerankableRecommendation>(
  remaining: Array<CandidateWithIndex<T>>,
  candidate: T,
  resolver: (entry: T) => string,
) {
  const candidateKey = resolver(candidate);
  return remaining.some(({ entry }) => entry.drop.id !== candidate.drop.id && resolver(entry) !== candidateKey);
}

function resolveCandidateMixSegment(sources: DiversityCandidateSource[] | undefined) {
  if (sources?.includes("ending_soon")) {
    return "urgent";
  }
  if (sources?.includes("fresh")) {
    return "fresh";
  }
  if (
    sources?.includes("followed_creator")
    || sources?.includes("previously_unlocked_creator")
    || sources?.includes("theme_affinity")
    || sources?.includes("similar_users")
  ) {
    return "personalized";
  }
  return "fallback";
}

function buildDiversityDiagnostics<T extends DiversityRerankableRecommendation>(input: {
  candidate: T;
  selected: Array<T & { diversity?: RecommendationDiversityDiagnostics }>;
  remaining: Array<CandidateWithIndex<T>>;
  profile: RecommendationDiversityProfile | null;
  positionIndex: number;
}) : RecommendationDiversityDiagnostics {
  const { candidate, selected, remaining, profile, positionIndex } = input;
  const drop = candidate.drop;
  const creatorKey = normalizeKey(drop.creatorId);
  const categoryKey = normalizeKey(drop.type);
  const mediaType = resolveRecommendationMediaType(drop);
  const priceTier = resolveRecommendationPriceTier(drop);
  const creatorCount = countSelected(selected, (entry) => normalizeKey(entry.drop.creatorId), creatorKey);
  const categoryCount = countSelected(selected, (entry) => normalizeKey(entry.drop.type), categoryKey);
  const mediaTypeCount = countSelected(selected, (entry) => resolveRecommendationMediaType(entry.drop), mediaType);
  const sameCreatorCanBeAvoided = hasAlternative(remaining, candidate, (entry) => normalizeKey(entry.drop.creatorId));
  const sameCategoryCanBeAvoided = hasAlternative(remaining, candidate, (entry) => normalizeKey(entry.drop.type));
  const sameMediaTypeCanBeAvoided = hasAlternative(remaining, candidate, (entry) => resolveRecommendationMediaType(entry.drop));
  const categoryAffinity = getCategoryAffinity(profile, categoryKey);
  const highCategoryAffinity = categoryAffinity >= DIVERSITY_HIGH_CATEGORY_AFFINITY;
  const reasons: string[] = [];
  let sameCreatorPenalty = 0;
  let sameCategoryPenalty = 0;
  let sameMediaTypePenalty = 0;
  let recentExposurePenalty = 0;
  let explorationBoost = 0;

  if (creatorCount >= DIVERSITY_CREATOR_LIMIT_TOP_6 && positionIndex < 6 && sameCreatorCanBeAvoided) {
    sameCreatorPenalty = 32 + ((creatorCount - DIVERSITY_CREATOR_LIMIT_TOP_6) * 8);
    reasons.push(DIVERSITY_ADMIN_REASON);
  } else if (creatorCount >= 2) {
    sameCreatorPenalty = 4;
  } else if (creatorCount === 1) {
    sameCreatorPenalty = 1.25;
  }

  if (categoryCount >= DIVERSITY_CATEGORY_LIMIT_TOP_8 && positionIndex < 8 && sameCategoryCanBeAvoided && !highCategoryAffinity) {
    sameCategoryPenalty = 32 + ((categoryCount - DIVERSITY_CATEGORY_LIMIT_TOP_8) * 5);
    reasons.push(DIVERSITY_ADMIN_REASON);
  } else if (categoryCount >= 2 && !highCategoryAffinity) {
    sameCategoryPenalty = 3;
  }

  if (mediaTypeCount >= 3 && sameMediaTypeCanBeAvoided) {
    sameMediaTypePenalty = 5;
  } else if (mediaTypeCount >= 2) {
    sameMediaTypePenalty = 1.5;
  }

  if (includesNormalized(profile?.recentDropIds, normalizeKey(drop.id))) {
    recentExposurePenalty += 24;
    reasons.push("Moved lower because this drop appeared in a recent session.");
  }
  if (includesNormalized(profile?.recentCreatorIds, creatorKey)) {
    recentExposurePenalty += 4;
  }

  const selectedPriceTiers = new Set(selected.map((entry) => entry.diversity?.priceTier || resolveRecommendationPriceTier(entry.drop)));
  const remainingPriceTiers = new Set(remaining.map(({ entry }) => resolveRecommendationPriceTier(entry.drop)));
  if (selected.length > 0 && !selectedPriceTiers.has(priceTier) && remainingPriceTiers.size > 1) {
    explorationBoost += 3;
  }

  const selectedMixSegments = new Set(selected.map((entry) => resolveCandidateMixSegment(entry.candidateSources)));
  const candidateMixSegment = resolveCandidateMixSegment(candidate.candidateSources);
  if (selected.length > 0 && !selectedMixSegments.has(candidateMixSegment)) {
    explorationBoost += 2;
  }

  if (sameMediaTypeCanBeAvoided && mediaTypeCount === 0 && selected.length > 0) {
    explorationBoost += 1;
  }

  const diversityPenalty = sameCreatorPenalty + sameCategoryPenalty + sameMediaTypePenalty + recentExposurePenalty;
  const rerankedScore = clampScore(candidate.score - diversityPenalty + explorationBoost);

  return {
    predictedScore: roundScore(candidate.score),
    rerankedScore: roundScore(rerankedScore),
    diversityPenalty: roundScore(diversityPenalty),
    explorationBoost: roundScore(explorationBoost),
    sameCreatorPenalty: roundScore(sameCreatorPenalty),
    sameCategoryPenalty: roundScore(sameCategoryPenalty),
    sameMediaTypePenalty: roundScore(sameMediaTypePenalty),
    recentExposurePenalty: roundScore(recentExposurePenalty),
    priceTier,
    mediaType,
    movedLower: rerankedScore < candidate.score,
    reasons: Array.from(new Set(reasons)),
  };
}

export function rerankRecommendationsForDiversity<T extends DiversityRerankableRecommendation>(input: {
  entries: T[];
  profile?: RecommendationDiversityProfile | null;
}) : Array<T & { diversity: RecommendationDiversityDiagnostics }> {
  const profile = input.profile ?? null;
  const remaining = input.entries.map((entry, originalIndex) => ({ entry, originalIndex }));
  const selected: Array<T & { diversity: RecommendationDiversityDiagnostics }> = [];

  while (remaining.length > 0) {
    const positionIndex = selected.length;
    let bestIndex = 0;
    let bestDiagnostics = buildDiversityDiagnostics({
      candidate: remaining[0].entry,
      selected,
      remaining,
      profile,
      positionIndex,
    });

    for (let index = 1; index < remaining.length; index += 1) {
      const diagnostics = buildDiversityDiagnostics({
        candidate: remaining[index].entry,
        selected,
        remaining,
        profile,
        positionIndex,
      });
      const bestCandidate = remaining[bestIndex];
      const currentCandidate = remaining[index];
      const wins = diagnostics.rerankedScore > bestDiagnostics.rerankedScore
        || (
          diagnostics.rerankedScore === bestDiagnostics.rerankedScore
          && (
            currentCandidate.entry.score > bestCandidate.entry.score
            || (
              currentCandidate.entry.score === bestCandidate.entry.score
              && currentCandidate.originalIndex < bestCandidate.originalIndex
            )
          )
        );

      if (wins) {
        bestIndex = index;
        bestDiagnostics = diagnostics;
      }
    }

    const [picked] = remaining.splice(bestIndex, 1);
    selected.push({
      ...picked.entry,
      score: bestDiagnostics.rerankedScore,
      diversity: bestDiagnostics,
    });
  }

  return selected;
}
