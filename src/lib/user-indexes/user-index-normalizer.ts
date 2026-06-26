import type { BehavioralTimelineFact } from "@/lib/behavioral/behavioral-timeline-contract";
import type {
  GuestTrackingIndex,
  UserEntityAffinityIndex,
  UserTrackingConfidenceLabel,
  UserTrackingIndex,
  UserValueIndex,
  UserJourneyIndex,
  UserNotificationIndex,
  UserContentConsumptionIndex,
} from "@/lib/user-indexes/user-tracking-index-contract";

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function confidenceLabel(value: number): UserTrackingConfidenceLabel {
  if (value < 0.3) return "insufficient";
  if (value < 0.5) return "directional";
  if (value < 0.75) return "usable";
  if (value < 0.9) return "strong";
  return "verified";
}

function sourceReliabilityMax(facts: BehavioralTimelineFact[]) {
  return facts.reduce((max, fact) => Math.max(max, fact.sourceReliability || 0), 0);
}

function hasOutcomeValidation(facts: BehavioralTimelineFact[]) {
  return facts.some((fact) =>
    fact.normalizedAction.includes("purchase")
    || fact.normalizedAction.includes("unlock")
    || fact.normalizedAction.includes("watch"));
}

function hasServerTruth(facts: BehavioralTimelineFact[]) {
  return facts.some((fact) => fact.sourceTruth === "server" || fact.sourceTruth === "canonical");
}

function schemaCompleteness(facts: BehavioralTimelineFact[]) {
  if (facts.length === 0) return 0;
  let present = 0;
  for (const fact of facts) {
    if (fact.factId) present += 1;
    if (fact.eventName) present += 1;
    if (fact.normalizedAction) present += 1;
    if (fact.route) present += 1;
  }
  return clamp01(present / (facts.length * 4));
}

export function computeUserIndexConfidence(input: {
  facts: BehavioralTimelineFact[];
  guestOnly: boolean;
  legacyOnly: boolean;
  privacyLimited: boolean;
}) {
  const facts = input.facts;
  const sourceReliability = sourceReliabilityMax(facts);
  const sampleScore = Math.min(1, Math.log10(facts.length + 1) / 2.5);
  const newestAtMs = facts.reduce((max, fact) => Math.max(max, fact.timestampMs), 0);
  const freshnessScore = newestAtMs > 0 ? Math.max(0, 1 - ((Date.now() - newestAtMs) / (1000 * 60 * 60 * 24 * 7))) : 0;
  const schemaScore = schemaCompleteness(facts);
  const outcomeValidationScore = hasOutcomeValidation(facts) ? 1 : 0.3;

  let confidence = clamp01(
    (0.30 * sourceReliability)
    + (0.20 * sampleScore)
    + (0.20 * freshnessScore)
    + (0.15 * schemaScore)
    + (0.15 * outcomeValidationScore),
  );

  if (input.guestOnly) confidence = Math.min(confidence, 0.45);
  if (input.legacyOnly) confidence = Math.min(confidence, 0.30);
  if (!hasOutcomeValidation(facts)) confidence = Math.min(confidence, 0.60);
  if (!hasServerTruth(facts)) confidence = Math.min(confidence, 0.75);
  if (input.privacyLimited) confidence = Math.min(confidence, 0.60);

  return {
    confidence,
    confidenceLabel: confidenceLabel(confidence),
  };
}

function toSourceBreakdown(facts: BehavioralTimelineFact[]) {
  const breakdown: Record<string, number> = {};
  for (const fact of facts) {
    breakdown[fact.sourceTruth] = (breakdown[fact.sourceTruth] || 0) + 1;
  }
  return breakdown;
}

function toActionCounts(facts: BehavioralTimelineFact[]) {
  const counts: UserTrackingIndex["actionCounts"] = {
    total: facts.length,
    meaningful: 0,
    drops: 0,
    watch: 0,
    wallet: 0,
    purchase: 0,
    creator: 0,
    chat: 0,
    support: 0,
    notification: 0,
  };
  for (const fact of facts) {
    if (fact.metricEligible) counts.meaningful += 1;
    if (fact.normalizedAction.includes("drop") || fact.normalizedAction.includes("unlock")) counts.drops += 1;
    if (fact.normalizedAction.includes("watch") || fact.normalizedAction.includes("viewer")) counts.watch += 1;
    if (fact.normalizedAction.includes("wallet")) counts.wallet += 1;
    if (fact.normalizedAction.includes("purchase")) counts.purchase += 1;
    if (fact.normalizedAction.includes("creator")) counts.creator += 1;
    if (fact.normalizedAction.includes("chat") || fact.normalizedAction.includes("message")) counts.chat += 1;
    if (fact.normalizedAction.includes("support")) counts.support += 1;
    if (fact.normalizedAction.includes("notification")) counts.notification += 1;
  }
  return counts;
}

export function buildUserTrackingIndex(input: {
  userId: string;
  facts: BehavioralTimelineFact[];
  sourceWindowStartMs: number;
  sourceWindowEndMs: number;
}): UserTrackingIndex {
  const facts = input.facts.filter((fact) => fact.actorUserId === input.userId);
  const privacyLimited = facts.some((fact) => fact.consentState === "denied" || fact.consentState === "partial");
  const guestOnly = facts.length > 0 && facts.every((fact) => !fact.actorUserId && Boolean(fact.anonymousVisitorId));
  const legacyOnly = facts.length > 0 && facts.every((fact) => fact.sourceTruth === "legacy");
  const confidence = computeUserIndexConfidence({ facts, guestOnly, legacyOnly, privacyLimited });

  const lastSeenAtMs = facts.reduce((max, fact) => Math.max(max, fact.timestampMs), 0);
  const lastMeaningfulActionAtMs = facts.reduce(
    (max, fact) => fact.metricEligible ? Math.max(max, fact.timestampMs) : max,
    0,
  );
  const sourceBreakdown = toSourceBreakdown(facts);
  const actionCounts = toActionCounts(facts);
  const issues = facts
    .filter((fact) => !fact.metricEligible && fact.metricExclusionReason)
    .map((fact) => fact.metricExclusionReason as string)
    .slice(0, 20);

  return {
    userId: input.userId,
    updatedAtMs: Date.now(),
    sourceWindowStartMs: input.sourceWindowStartMs,
    sourceWindowEndMs: input.sourceWindowEndMs,
    sourceTruth: legacyOnly ? "legacy_fallback" : "materialized",
    confidence: confidence.confidence,
    confidenceLabel: confidence.confidenceLabel,
    dataAvailabilityReason: privacyLimited
      ? "privacy_limited"
      : facts.length === 0
        ? "insufficient_signal"
        : "available",
    actionCounts,
    lastSeenAtMs,
    lastMeaningfulActionAtMs,
    sourceBreakdown,
    issues,
  };
}

export function buildGuestTrackingIndex(input: {
  anonymousVisitorId: string;
  facts: BehavioralTimelineFact[];
  sourceWindowStartMs: number;
  sourceWindowEndMs: number;
}): GuestTrackingIndex {
  const facts = input.facts.filter((fact) => fact.anonymousVisitorId === input.anonymousVisitorId);
  const confidence = computeUserIndexConfidence({
    facts,
    guestOnly: true,
    legacyOnly: facts.length > 0 && facts.every((fact) => fact.sourceTruth === "legacy"),
    privacyLimited: facts.some((fact) => fact.consentState === "denied" || fact.consentState === "partial"),
  });

  return {
    anonymousVisitorId: input.anonymousVisitorId,
    updatedAtMs: Date.now(),
    sourceWindowStartMs: input.sourceWindowStartMs,
    sourceWindowEndMs: input.sourceWindowEndMs,
    sourceTruth: "materialized",
    confidence: confidence.confidence,
    confidenceLabel: confidence.confidenceLabel,
    dataAvailabilityReason: facts.length === 0 ? "insufficient_signal" : "guest_only",
    actionCounts: toActionCounts(facts),
    lastSeenAtMs: facts.reduce((max, fact) => Math.max(max, fact.timestampMs), 0),
    lastMeaningfulActionAtMs: facts.reduce((max, fact) => fact.metricEligible ? Math.max(max, fact.timestampMs) : max, 0),
    sourceBreakdown: toSourceBreakdown(facts),
    issues: facts.filter((fact) => fact.metricExclusionReason).map((fact) => fact.metricExclusionReason as string).slice(0, 20),
  };
}

export function buildUserEntityAffinityIndex(userId: string, facts: BehavioralTimelineFact[]): UserEntityAffinityIndex {
  const creatorScores = new Map<string, number>();
  const dropScores = new Map<string, number>();
  for (const fact of facts) {
    if (fact.actorUserId !== userId) continue;
    if (fact.target.creatorId) creatorScores.set(fact.target.creatorId, (creatorScores.get(fact.target.creatorId) || 0) + 1);
    if (fact.target.dropId) dropScores.set(fact.target.dropId, (dropScores.get(fact.target.dropId) || 0) + 1);
  }
  const sort = (entries: Array<[string, number]>) => entries.sort((a, b) => b[1] - a[1]).slice(0, 10);
  return {
    userId,
    topCreators: sort(Array.from(creatorScores.entries())).map(([creatorId, score]) => ({ creatorId, score, reasons: ["timeline_interaction"] })),
    topCategories: [],
    topDrops: sort(Array.from(dropScores.entries())).map(([dropId, score]) => ({ dropId, score, reasons: ["timeline_interaction"] })),
    suppressions: [],
    updatedAtMs: Date.now(),
  };
}

export function buildUserValueIndex(userId: string, facts: BehavioralTimelineFact[]): UserValueIndex {
  let purchaseCount = 0;
  for (const fact of facts) {
    if (fact.actorUserId !== userId) continue;
    if (fact.normalizedAction.includes("purchase") && (fact.sourceTruth === "server" || fact.sourceTruth === "canonical")) {
      purchaseCount += 1;
    }
  }
  const valueScore = Math.min(100, purchaseCount * 15);
  const valueTier: UserValueIndex["valueTier"] = purchaseCount >= 8 ? "vip" : purchaseCount >= 4 ? "repeat_buyer" : purchaseCount >= 1 ? "buyer" : "observer";
  return {
    userId,
    verifiedSpendUsd: 0,
    purchaseCount,
    paidGdPurchased: 0,
    rewardGdEarned: 0,
    unlockCountAfterPurchase: 0,
    valueScore,
    valueTier,
    sourceTruth: purchaseCount > 0 ? "server_transaction" : "materialized",
    updatedAtMs: Date.now(),
  };
}

export function buildUserJourneyIndex(input: {
  userId?: string;
  anonymousVisitorId?: string;
  identityLinkId?: string;
  facts: BehavioralTimelineFact[];
}): UserJourneyIndex {
  const sessionIdSet = new Set<string>();
  let firstSeenAtMs = Number.MAX_SAFE_INTEGER;
  let firstPurchaseAtMs = Number.MAX_SAFE_INTEGER;
  let firstUnlockAtMs = Number.MAX_SAFE_INTEGER;
  let firstMessageAtMs = Number.MAX_SAFE_INTEGER;

  for (const fact of input.facts) {
    if (fact.sessionId) sessionIdSet.add(fact.sessionId);
    if (fact.timestampMs < firstSeenAtMs) firstSeenAtMs = fact.timestampMs;

    if (fact.normalizedAction.includes("purchase") && fact.timestampMs < firstPurchaseAtMs) {
      firstPurchaseAtMs = fact.timestampMs;
    }
    if (fact.normalizedAction.includes("unlock") && fact.timestampMs < firstUnlockAtMs) {
      firstUnlockAtMs = fact.timestampMs;
    }
    if (fact.normalizedAction.includes("message") && fact.timestampMs < firstMessageAtMs) {
      firstMessageAtMs = fact.timestampMs;
    }
  }

  const sessionIds = Array.from(sessionIdSet);

  const funnelStage: UserJourneyIndex["funnelStage"] = firstMessageAtMs < Number.MAX_SAFE_INTEGER
    ? "messaged"
    : firstUnlockAtMs < Number.MAX_SAFE_INTEGER
      ? "unwrapped"
      : firstPurchaseAtMs < Number.MAX_SAFE_INTEGER
        ? "purchased"
        : "guest";
  return {
    userId: input.userId,
    anonymousVisitorId: input.anonymousVisitorId,
    sessionIds,
    firstSeenAtMs: firstSeenAtMs === Number.MAX_SAFE_INTEGER ? 0 : firstSeenAtMs,
    firstPurchaseAtMs: firstPurchaseAtMs === Number.MAX_SAFE_INTEGER ? undefined : firstPurchaseAtMs,
    firstUnlockAtMs: firstUnlockAtMs === Number.MAX_SAFE_INTEGER ? undefined : firstUnlockAtMs,
    firstMessageAtMs: firstMessageAtMs === Number.MAX_SAFE_INTEGER ? undefined : firstMessageAtMs,
    guestToUserLinked: Boolean(input.identityLinkId),
    identityLinkId: input.identityLinkId,
    funnelStage,
    updatedAtMs: Date.now(),
  };
}

export function buildUserNotificationIndex(userId: string, facts: BehavioralTimelineFact[]): UserNotificationIndex {
  let notificationOpenCount = 0;
  let notificationReadCount = 0;
  let lastNotificationReadAtMs = 0;

  for (const fact of facts) {
    if (fact.actorUserId === userId && fact.normalizedAction.includes("notification")) {
      notificationOpenCount++;
      if (fact.normalizedAction.includes("notification_read")) {
        notificationReadCount++;
        if (fact.timestampMs > lastNotificationReadAtMs) {
          lastNotificationReadAtMs = fact.timestampMs;
        }
      }
    }
  }

  return {
    userId,
    notificationReadCount,
    notificationOpenCount,
    lastNotificationReadAtMs,
    updatedAtMs: Date.now(),
  };
}

export function buildUserContentConsumptionIndex(userId: string, facts: BehavioralTimelineFact[]): UserContentConsumptionIndex {
  let viewedFileCount = 0;
  let openedDropCount = 0;
  let unwrappedDropCount = 0;
  let hasServerWatch = false;

  for (const fact of facts) {
    if (fact.actorUserId !== userId) continue;

    if (fact.normalizedAction.includes("file_viewed")) viewedFileCount++;
    if (fact.normalizedAction.includes("drop_viewed") || fact.normalizedAction.includes("preview")) openedDropCount++;
    if (fact.normalizedAction.includes("unlock")) unwrappedDropCount++;

    if (!hasServerWatch && (fact.sourceTruth === "server" || fact.sourceTruth === "canonical") && fact.normalizedAction.includes("watch")) {
      hasServerWatch = true;
    }
  }

  return {
    userId,
    validWatchTimeMs: 0,
    viewedFileCount,
    completedFileCount: 0,
    openedDropCount,
    unwrappedDropCount,
    watchScoreSource: hasServerWatch ? "watch_session_rollup" : "legacy_page_duration",
    watchConfidence: hasServerWatch ? 0.85 : 0.25,
    issues: hasServerWatch ? [] : ["watch_session_missing"],
    updatedAtMs: Date.now(),
  };
}
