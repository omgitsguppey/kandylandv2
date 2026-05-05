import type { Drop } from "@/types/db";
import {
  computeQueryIntentScore,
  computeSearchIntentDecay,
  normalizeSearchIntentToken,
  type SearchIntentProfile,
} from "@/lib/behavioral/search-intent-profile";
import { roundScore } from "@/lib/behavioral/behavioral-math-calibration";

export type QueryIntentRankingResult = {
  queryIntentScore: number;
  queryIntentBoost: number;
  reasons: string[];
  signals: {
    exactCategoryMatch: number;
    creatorNameMatch: number;
    recentSearchRecency: number;
    repeatedQueryCluster: number;
    filterMatch: number;
  };
};

function hasPositiveRecord(records: Record<string, number> | undefined, key: string) {
  return key.length > 0 && (records?.[key] || 0) > 0;
}

function maxRecordScore(records: Record<string, number> | undefined) {
  return Math.max(0, ...Object.values(records || {}).filter((value) => Number.isFinite(value)));
}

export function buildQueryIntentRanking(input: {
  drop: Drop;
  searchIntentProfile?: SearchIntentProfile | null;
  nowMs?: number;
}): QueryIntentRankingResult {
  const profile = input.searchIntentProfile ?? null;
  const nowMs = input.nowMs ?? Date.now();
  const drop = input.drop;
  const categoryKey = normalizeSearchIntentToken(String(drop.type || ""));
  const creatorKey = normalizeSearchIntentToken(String(drop.creatorId || ""));
  const tagKeys = Array.isArray(drop.tags)
    ? drop.tags.map((tag) => normalizeSearchIntentToken(String(tag))).filter(Boolean)
    : [];

  if (!profile || profile.activeUntilMs <= nowMs) {
    return {
      queryIntentScore: 0,
      queryIntentBoost: 0,
      reasons: [],
      signals: {
        exactCategoryMatch: 0,
        creatorNameMatch: 0,
        recentSearchRecency: 0,
        repeatedQueryCluster: 0,
        filterMatch: 0,
      },
    };
  }

  const decay = computeSearchIntentDecay({
    latestAtMs: profile.latestAtMs,
    nowMs,
    halfLifeHours: profile.halfLifeHours,
  });
  const exactCategoryMatch = hasPositiveRecord(profile.categories, categoryKey)
    || tagKeys.some((tag) => hasPositiveRecord(profile.categories, tag) || hasPositiveRecord(profile.tokens, tag))
    ? decay
    : 0;
  const creatorNameMatch = hasPositiveRecord(profile.creatorIds, creatorKey) ? decay : 0;
  const repeatedQueryCluster = Math.min(1, maxRecordScore(profile.queryClusters) / 3) * decay;
  const filterMatch = (
    hasPositiveRecord(profile.filters, categoryKey)
    || tagKeys.some((tag) => hasPositiveRecord(profile.filters, tag))
    || hasPositiveRecord(profile.sorts, "fresh")
    || hasPositiveRecord(profile.sorts, "new")
  ) ? decay : 0;
  const recentSearchRecency = decay;
  const queryIntentScore = computeQueryIntentScore({
    exactCategoryMatch,
    creatorNameMatch,
    recentSearchRecency,
    repeatedQueryCluster,
    filterMatch,
  });
  const reasons: string[] = [];

  if (queryIntentScore > 0) {
    reasons.push("Boosted by recent search intent.");
  }
  if (exactCategoryMatch > 0) {
    reasons.push("Boosted because the drop category matches a recent search or filter.");
  }
  if (creatorNameMatch > 0) {
    reasons.push("Boosted because the creator matches a recent creator search.");
  }

  return {
    queryIntentScore,
    queryIntentBoost: roundScore(queryIntentScore * 15),
    reasons,
    signals: {
      exactCategoryMatch: roundScore(exactCategoryMatch),
      creatorNameMatch: roundScore(creatorNameMatch),
      recentSearchRecency: roundScore(recentSearchRecency),
      repeatedQueryCluster: roundScore(repeatedQueryCluster),
      filterMatch: roundScore(filterMatch),
    },
  };
}
