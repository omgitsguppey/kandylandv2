import type { Drop } from "@/types/db";

import type {
  RecommendationBehavioralProfileLike,
  RecommendationCandidate,
  RecommendationCandidateSource,
  RecommendationDropIntelligenceLike,
} from "@/lib/recommendations/ranking-features";
import { isExplorationEligibleDrop } from "@/lib/recommendations/exploration-policy";

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeTagList(drop: Drop) {
  return Array.isArray(drop.tags)
    ? drop.tags.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
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
  return clamp01((Math.log10(viewerOpens + 1) / 3) * 0.7 + clamp01(previewOpens / 40) * 0.3);
}

export function generateRecommendationCandidates(input: {
  drops: Drop[];
  profile?: RecommendationBehavioralProfileLike | null;
  dropIntelligence?: Map<string, RecommendationDropIntelligenceLike>;
  currentDropId?: string | null;
  nowMs?: number;
  limit?: number;
}) : RecommendationCandidate[] {
  const nowMs = input.nowMs ?? Date.now();
  const limit = Math.max(6, Math.min(input.limit ?? 36, 96));
  const profile = input.profile ?? null;
  const candidateMap = new Map<string, RecommendationCandidate>();
  const lookalikeCreatorIds = new Set(profile?.lookalikeCreatorIds ?? []);

  input.drops
    .filter((drop) => isExplorationEligibleDrop(drop, nowMs))
    .filter((drop) => drop.id !== input.currentDropId)
    .forEach((drop) => {
      const candidate: RecommendationCandidate = {
        drop,
        sources: [],
        sourceReasons: [],
        sourcePriority: 0,
      };

      addSource(candidate, "live_drop", "Live drop currently available.", 1);

      const intelligence = input.dropIntelligence?.get(drop.id);
      const creatorId = drop.creatorId || "";
      const hoursRemaining = drop.validUntil && drop.validUntil > nowMs
        ? (drop.validUntil - nowMs) / (60 * 60 * 1000)
        : Number.POSITIVE_INFINITY;

      if (hoursRemaining <= 72) {
        addSource(candidate, "ending_soon", "Ending soon and still available.", 7);
      }

      if (creatorId && (profile?.creatorAffinity?.[creatorId] || 0) >= 2.5) {
        addSource(candidate, "followed_creator", "Strong creator affinity from past creator engagement.", 9);
      } else if (creatorId && (profile?.creatorAffinity?.[creatorId] || 0) > 0) {
        addSource(candidate, "adjacent_creator", "Adjacent creator exploration from weaker creator signal.", 5);
      }

      if (creatorId && profile?.recentCreatorIds?.includes(creatorId)) {
        addSource(candidate, "previously_unlocked_creator", "Same creator as recent unlocked or watched content.", 8);
      }

      const categoryAffinity = drop.type ? (profile?.categoryAffinity?.[drop.type] || 0) : 0;
      const matchingTheme = normalizeTagList(drop).some((tag) => (profile?.themeAffinity?.[tag] || 0) >= 0.6);
      if (categoryAffinity >= 0.75 || matchingTheme) {
        addSource(candidate, "theme_affinity", "Theme or category matches recent content taste.", 8);
      } else if (categoryAffinity > 0) {
        addSource(candidate, "adjacent_category", "Adjacent category exploration from weaker category signal.", 5);
      }

      if (creatorId && lookalikeCreatorIds.has(creatorId)) {
        addSource(candidate, "similar_users", "Creators adjacent to similar-user behavior clusters.", 6);
      }

      const popularity = buildFreshPopularityScore(intelligence);
      if (popularity >= 0.35) {
        addSource(candidate, "popular", "High live interest in recent viewer data.", 4);
      }

      if ((intelligence?.freshnessDecayScore ?? 0) >= 0.7 || (drop.validFrom > 0 && nowMs - drop.validFrom <= 3 * 24 * 60 * 60 * 1000)) {
        addSource(candidate, "fresh", "Fresh content with recent recency signal.", 4);
      }

      const sampleCount = Math.max(0,
        (intelligence?.viewerOpens || 0) +
        (intelligence?.previewOpens || 0) +
        (intelligence?.positiveFeedbackCount || 0) +
        (intelligence?.negativeFeedbackCount || 0),
      );
      if (drop.validFrom > 0 && nowMs - drop.validFrom <= 7 * 24 * 60 * 60 * 1000 && sampleCount < 20) {
        addSource(candidate, "new_low_sample_drop", "Low-sample drop receives a capped exploration slot.", 3);
      }

      if (candidate.sources.length > 0) {
        candidateMap.set(drop.id, candidate);
      }
    });

  return Array.from(candidateMap.values())
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
