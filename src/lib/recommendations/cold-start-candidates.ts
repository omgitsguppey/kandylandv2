import type { Drop } from "@/types/db";

import { isExplorationEligibleDrop } from "@/lib/recommendations/exploration-policy";
import type {
  RecommendationBehavioralProfileLike,
  RecommendationCandidate,
  RecommendationCandidateSource,
  RecommendationDropIntelligenceLike,
} from "@/lib/recommendations/ranking-features";

export type ColdStartPreferenceHints = {
  onboardingInterests: string[];
  firstClickCategories: string[];
  firstClickCreatorIds: string[];
  searchIntentCategories: string[];
  searchIntentCreatorIds: string[];
  searchIntentTokens: string[];
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function topKeys(record: Record<string, number> | undefined, limit: number) {
  return Object.entries(record || {})
    .filter(([, value]) => typeof value === "number" && value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key]) => normalize(key))
    .filter(Boolean);
}

function normalizeTagList(drop: Drop) {
  return Array.isArray(drop.tags)
    ? drop.tags.map((tag) => normalize(tag)).filter(Boolean)
    : [];
}

function addSource(entry: RecommendationCandidate, source: RecommendationCandidateSource, reason: string, priority: number) {
  if (!entry.sources.includes(source)) {
    entry.sources.push(source);
  }

  if (!entry.sourceReasons.includes(reason)) {
    entry.sourceReasons.push(reason);
  }

  entry.sourcePriority = Math.max(entry.sourcePriority, priority);
}

function buildFreshPopularityScore(intelligence: RecommendationDropIntelligenceLike | undefined) {
  if (!intelligence) {
    return 0;
  }

  const viewerOpens = Math.max(0, intelligence.viewerOpens || 0);
  const previewOpens = Math.max(0, intelligence.previewOpens || 0);
  return Math.min(1, (Math.log10(viewerOpens + 1) / 3) * 0.7 + Math.min(1, previewOpens / 40) * 0.3);
}

function getDropSampleCount(intelligence: RecommendationDropIntelligenceLike | undefined) {
  if (!intelligence) {
    return 0;
  }

  return Math.max(0,
    (intelligence.viewerOpens || 0) +
    (intelligence.previewOpens || 0) +
    (intelligence.positiveFeedbackCount || 0) +
    (intelligence.negativeFeedbackCount || 0),
  );
}

function isFresh(drop: Drop, nowMs: number) {
  return drop.validFrom > 0 && nowMs - drop.validFrom <= 7 * 24 * 60 * 60 * 1000;
}

export function buildColdStartPreferenceHints(
  profile: RecommendationBehavioralProfileLike | null | undefined,
): ColdStartPreferenceHints {
  const profileWithOptionalHints = profile as RecommendationBehavioralProfileLike & {
    onboardingInterests?: string[];
    firstClickCategories?: string[];
    firstClickCreatorIds?: string[];
  } | null | undefined;

  return {
    onboardingInterests: [
      ...(profileWithOptionalHints?.onboardingInterests || []),
      ...topKeys(profile?.experiencePreferenceScores, 4),
    ].map(normalize).filter(Boolean),
    firstClickCategories: [
      ...(profileWithOptionalHints?.firstClickCategories || []),
      ...topKeys(profile?.categoryAffinity, 6),
    ].map(normalize).filter(Boolean),
    firstClickCreatorIds: [
      ...(profileWithOptionalHints?.firstClickCreatorIds || []),
      ...topKeys(profile?.creatorAffinity, 6),
    ].map(normalize).filter(Boolean),
    searchIntentCategories: topKeys(profile?.searchIntentProfile?.categories, 6),
    searchIntentCreatorIds: topKeys(profile?.searchIntentProfile?.creatorIds, 6),
    searchIntentTokens: topKeys(profile?.searchIntentProfile?.tokens, 8),
  };
}

export function generateColdStartCandidates(input: {
  drops: Drop[];
  profile?: RecommendationBehavioralProfileLike | null;
  hints?: Partial<ColdStartPreferenceHints>;
  dropIntelligence?: Map<string, RecommendationDropIntelligenceLike>;
  currentDropId?: string | null;
  nowMs?: number;
  limit?: number;
}) : RecommendationCandidate[] {
  const nowMs = input.nowMs ?? Date.now();
  const limit = Math.max(3, Math.min(input.limit ?? 24, 72));
  const profileHints = buildColdStartPreferenceHints(input.profile);
  const hints: ColdStartPreferenceHints = {
    onboardingInterests: input.hints?.onboardingInterests?.map(normalize).filter(Boolean) || profileHints.onboardingInterests,
    firstClickCategories: input.hints?.firstClickCategories?.map(normalize).filter(Boolean) || profileHints.firstClickCategories,
    firstClickCreatorIds: input.hints?.firstClickCreatorIds?.map(normalize).filter(Boolean) || profileHints.firstClickCreatorIds,
    searchIntentCategories: input.hints?.searchIntentCategories?.map(normalize).filter(Boolean) || profileHints.searchIntentCategories,
    searchIntentCreatorIds: input.hints?.searchIntentCreatorIds?.map(normalize).filter(Boolean) || profileHints.searchIntentCreatorIds,
    searchIntentTokens: input.hints?.searchIntentTokens?.map(normalize).filter(Boolean) || profileHints.searchIntentTokens,
  };
  const categoryHints = new Set([...hints.onboardingInterests, ...hints.firstClickCategories, ...hints.searchIntentCategories]);
  const creatorHints = new Set([...hints.firstClickCreatorIds, ...hints.searchIntentCreatorIds]);
  const tokenHints = new Set([...hints.onboardingInterests, ...hints.searchIntentTokens]);
  const recentCreatorIds = new Set((input.profile?.recentCreatorIds || []).map(normalize));

  return input.drops
    .filter((drop) => isExplorationEligibleDrop(drop, nowMs))
    .filter((drop) => drop.id !== input.currentDropId)
    .map((drop) => {
      const intelligence = input.dropIntelligence?.get(drop.id);
      const candidate: RecommendationCandidate = {
        drop,
        sources: [],
        sourceReasons: [],
        sourcePriority: 0,
      };
      const creatorId = normalize(drop.creatorId);
      const category = normalize(drop.type);
      const tagList = normalizeTagList(drop);
      const matchesCategoryHint = categoryHints.has(category) || tagList.some((tag) => categoryHints.has(tag));
      const matchesTokenHint = tagList.some((tag) => tokenHints.has(tag));
      const matchesCreatorHint = creatorId.length > 0 && creatorHints.has(creatorId);
      const fresh = isFresh(drop, nowMs);
      const popularity = buildFreshPopularityScore(intelligence);
      const sampleCount = getDropSampleCount(intelligence);

      if (matchesCategoryHint || matchesTokenHint) {
        addSource(candidate, "cold_start_interest", "Matched onboarding, first-click, or search intent hint; personalization remains weak.", 7);
        addSource(candidate, "adjacent_category", "Adjacent category exploration from early user intent.", 6);
      }

      if (matchesCreatorHint) {
        addSource(candidate, "cold_start_interest", "Matched early creator intent; personalization remains weak.", 7);
        addSource(candidate, "adjacent_creator", "Adjacent creator exploration from first clicks or search intent.", 6);
      } else if (creatorId && !recentCreatorIds.has(creatorId) && fresh) {
        addSource(candidate, "new_creator", "New creator exploration is bounded while signal builds.", 4);
      }

      if (fresh) {
        addSource(candidate, "fresh", "Popular fresh drop for cold start.", 4);
      }

      if (popularity >= 0.25) {
        addSource(candidate, "popular", "Popular fresh drop for cold start.", 5);
      }

      if (fresh && sampleCount < 20) {
        addSource(candidate, "new_low_sample_drop", "Low-sample drop receives a capped exploration slot.", 3);
      }

      return candidate;
    })
    .filter((candidate) => candidate.sources.length > 0)
    .sort((left, right) => {
      if (right.sourcePriority !== left.sourcePriority) {
        return right.sourcePriority - left.sourcePriority;
      }

      const rightPopularity = buildFreshPopularityScore(input.dropIntelligence?.get(right.drop.id));
      const leftPopularity = buildFreshPopularityScore(input.dropIntelligence?.get(left.drop.id));
      if (rightPopularity !== leftPopularity) {
        return rightPopularity - leftPopularity;
      }

      return right.drop.validFrom - left.drop.validFrom;
    })
    .slice(0, limit);
}
