import type { Drop } from "@/types/db";

export type ExplorationLane = "exploit" | "adjacent" | "new_low_sample";

export type ExplorationRerankableRecommendation = {
  drop: Drop;
  score: number;
  candidateSources?: string[];
};

export type RecommendationExplorationDiagnostics = {
  lane: ExplorationLane;
  adminReason: string | null;
  explorationBoost: number;
  scoreBoost: number;
  baseExploreWeight: number;
  uncertaintyBonus: number;
  freshnessBoost: number;
  safetyEligibility: number;
  slotBudgetShare: number;
  reasons: string[];
};

export const EXPLOIT_BUDGET_SHARE = 0.8;
export const ADJACENT_EXPLORE_BUDGET_SHARE = 0.15;
export const NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE = 0.05;
export const MAX_EXPLORATION_BUDGET_SHARE = ADJACENT_EXPLORE_BUDGET_SHARE + NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE;
export const MAX_EXPLORATION_BOOST_POINTS = 15;
export const EXPLORATION_ADMIN_REASON = "Exploration slot: gathering signal.";

export const EXPLORATION_POLICY_SHARES = {
  exploit: EXPLOIT_BUDGET_SHARE,
  adjacent: ADJACENT_EXPLORE_BUDGET_SHARE,
  newLowSample: NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE,
} as const;

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function round(value: number, digits = 4) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const multiplier = 10 ** digits;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function normalizeStatus(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function isExplorationEligibleDrop(drop: Drop, nowMs = Date.now()) {
  const approvalStatus = normalizeStatus((drop as { approvalStatus?: unknown }).approvalStatus || "approved");
  const moderationStatus = normalizeStatus((drop as { moderationStatus?: unknown }).moderationStatus);
  const safetyStatus = normalizeStatus((drop as { safetyStatus?: unknown }).safetyStatus);
  const blockedStatuses = new Set([
    "blocked",
    "moderation_blocked",
    "pending_review",
    "rejected",
    "unsafe",
  ]);

  if (drop.status !== "active") {
    return false;
  }

  if (drop.validUntil && drop.validUntil <= nowMs) {
    return false;
  }

  if (blockedStatuses.has(approvalStatus) || blockedStatuses.has(moderationStatus) || blockedStatuses.has(safetyStatus)) {
    return false;
  }

  return true;
}

export function computeExplorationBoost(input: {
  baseExploreWeight: number;
  uncertaintyBonus: number;
  freshnessBoost: number;
  safetyEligibility: number;
}) {
  const baseExploreWeight = clamp01(input.baseExploreWeight);
  const uncertaintyBonus = clamp01(input.uncertaintyBonus);
  const freshnessBoost = clamp01(input.freshnessBoost);
  const safetyEligibility = clamp01(input.safetyEligibility);
  const explorationBoost = clamp01(baseExploreWeight * uncertaintyBonus * freshnessBoost * safetyEligibility);

  return {
    explorationBoost: round(explorationBoost),
    scoreBoost: round(explorationBoost * MAX_EXPLORATION_BOOST_POINTS, 3),
    baseExploreWeight,
    uncertaintyBonus,
    freshnessBoost,
    safetyEligibility,
  };
}

export function classifyExplorationLane(candidateSources: string[] | undefined): ExplorationLane {
  const sources = new Set(candidateSources ?? []);

  if (sources.has("new_low_sample_drop")) {
    return "new_low_sample";
  }

  if (
    sources.has("adjacent_creator")
    || sources.has("adjacent_category")
    || sources.has("new_creator")
    || sources.has("cold_start_interest")
  ) {
    return "adjacent";
  }

  return "exploit";
}

export function calculateExplorationSlotBudget(limit: number) {
  const safeLimit = Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 1));
  const explorationSlots = Math.min(
    safeLimit,
    Math.max(0, Math.round(safeLimit * MAX_EXPLORATION_BUDGET_SHARE)),
  );
  const newLowSampleSlots = explorationSlots > 0
    ? Math.min(explorationSlots, Math.max(1, Math.round(safeLimit * NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE)))
    : 0;
  const adjacentSlots = Math.max(0, explorationSlots - newLowSampleSlots);
  const exploitSlots = Math.max(0, safeLimit - adjacentSlots - newLowSampleSlots);

  return {
    exploitSlots,
    adjacentSlots,
    newLowSampleSlots,
    maxExplorationSlots: adjacentSlots + newLowSampleSlots,
  };
}

function computeFreshnessBoost(drop: Drop, nowMs: number) {
  if (!drop.validFrom || drop.validFrom <= 0) {
    return 0.35;
  }

  const ageDays = Math.max(0, (nowMs - drop.validFrom) / (24 * 60 * 60 * 1000));
  if (ageDays <= 3) {
    return 1;
  }
  if (ageDays <= 14) {
    return 0.7;
  }
  return 0.35;
}

function computeUncertaintyBonus(lane: ExplorationLane, candidateSources: string[] | undefined) {
  if (lane === "new_low_sample") {
    return 1;
  }

  const sources = new Set(candidateSources ?? []);
  if (sources.has("new_creator")) {
    return 0.85;
  }
  if (lane === "adjacent") {
    return 0.75;
  }
  return 0;
}

function buildExplorationDiagnostics(input: {
  entry: ExplorationRerankableRecommendation;
  lane: ExplorationLane;
  nowMs: number;
}) : RecommendationExplorationDiagnostics {
  const { entry, lane, nowMs } = input;
  const safetyEligibility = isExplorationEligibleDrop(entry.drop, nowMs) ? 1 : 0;
  const baseExploreWeight = lane === "new_low_sample"
    ? NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE
    : lane === "adjacent"
      ? ADJACENT_EXPLORE_BUDGET_SHARE
      : 0;
  const boost = computeExplorationBoost({
    baseExploreWeight,
    uncertaintyBonus: computeUncertaintyBonus(lane, entry.candidateSources),
    freshnessBoost: computeFreshnessBoost(entry.drop, nowMs),
    safetyEligibility,
  });
  const reasons = lane === "exploit"
    ? []
    : [EXPLORATION_ADMIN_REASON];

  if (lane === "new_low_sample") {
    reasons.push("Exploring a new or low-sample drop with bounded exposure.");
  } else if (lane === "adjacent") {
    reasons.push("Exploring an adjacent creator, category, or cold-start interest hint.");
  }

  return {
    lane,
    adminReason: lane === "exploit" ? null : EXPLORATION_ADMIN_REASON,
    explorationBoost: boost.explorationBoost,
    scoreBoost: boost.scoreBoost,
    baseExploreWeight: boost.baseExploreWeight,
    uncertaintyBonus: boost.uncertaintyBonus,
    freshnessBoost: boost.freshnessBoost,
    safetyEligibility: boost.safetyEligibility,
    slotBudgetShare: lane === "new_low_sample"
      ? NEW_LOW_SAMPLE_EXPLORE_BUDGET_SHARE
      : lane === "adjacent"
        ? ADJACENT_EXPLORE_BUDGET_SHARE
        : EXPLOIT_BUDGET_SHARE,
    reasons,
  };
}

function annotate<T extends ExplorationRerankableRecommendation>(entry: T, nowMs: number) {
  const lane = classifyExplorationLane(entry.candidateSources);
  const exploration = buildExplorationDiagnostics({ entry, lane, nowMs });

  return {
    ...entry,
    score: round(entry.score + exploration.scoreBoost, 3),
    exploration,
  };
}

function pickFromPool<T extends ExplorationRerankableRecommendation>(
  pool: Array<T & { exploration: RecommendationExplorationDiagnostics }>,
  slots: number,
  pickedIds: Set<string>,
) {
  const picks: Array<T & { exploration: RecommendationExplorationDiagnostics }> = [];

  for (const entry of pool) {
    if (picks.length >= slots) {
      break;
    }
    if (pickedIds.has(entry.drop.id)) {
      continue;
    }

    pickedIds.add(entry.drop.id);
    picks.push(entry);
  }

  return picks;
}

export function applyExplorationBudget<T extends ExplorationRerankableRecommendation>(input: {
  entries: T[];
  limit: number;
  nowMs?: number;
}) : Array<T & { exploration: RecommendationExplorationDiagnostics }> {
  const nowMs = input.nowMs ?? Date.now();
  const limit = Math.max(1, Math.floor(Number.isFinite(input.limit) ? input.limit : 1));
  const budget = calculateExplorationSlotBudget(limit);
  const eligibleEntries = input.entries
    .filter((entry) => isExplorationEligibleDrop(entry.drop, nowMs))
    .map((entry) => annotate(entry, nowMs))
    .sort((left, right) => right.score - left.score || right.drop.validFrom - left.drop.validFrom);
  const exploitPool = eligibleEntries.filter((entry) => entry.exploration.lane === "exploit");
  const adjacentPool = eligibleEntries.filter((entry) => entry.exploration.lane === "adjacent");
  const newLowSamplePool = eligibleEntries.filter((entry) => entry.exploration.lane === "new_low_sample");
  const pickedIds = new Set<string>();
  const selected = [
    ...pickFromPool(exploitPool, budget.exploitSlots, pickedIds),
    ...pickFromPool(adjacentPool, budget.adjacentSlots, pickedIds),
    ...pickFromPool(newLowSamplePool, budget.newLowSampleSlots, pickedIds),
  ];

  if (selected.length < limit) {
    selected.push(...pickFromPool(exploitPool, limit - selected.length, pickedIds));
  }

  return selected
    .sort((left, right) => right.score - left.score || right.drop.validFrom - left.drop.validFrom)
    .slice(0, limit);
}
