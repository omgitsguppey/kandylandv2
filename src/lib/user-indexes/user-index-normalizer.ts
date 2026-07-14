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
  IdentityLineageIndex,
  UserIndexMaterializerExclusionCounts,
} from "@/lib/user-indexes/user-tracking-index-contract";
import {
  USER_INDEX_MATERIALIZER_LINKED_COPY_WINDOW_MS,
  USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT,
} from "@/lib/user-indexes/user-tracking-index-contract";
import { buildMaterializedPersonMetricCounts } from "@/lib/analytics/person-metrics-hydration";

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
    personMetricCounts: buildMaterializedPersonMetricCounts(facts),
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
    personMetricCounts: buildMaterializedPersonMetricCounts(facts),
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
  return {
    userId,
    verifiedSpendUsd: null,
    purchaseCount,
    paidGdPurchased: null,
    rewardGdEarned: null,
    unlockCountAfterPurchase: null,
    valueScore: null,
    valueTier: null,
    sourceTruth: purchaseCount > 0 ? "behavioral_timeline_projection" : "source_missing",
    dataAvailabilityReason: purchaseCount > 0 ? "partial" : "source_missing",
    issues: [
      "verified_transaction_amount_source_missing",
      "paid_gd_source_missing",
      "reward_gd_source_missing",
      "post_purchase_unlock_source_missing",
    ],
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
    firstSeenAtMs = Math.min(firstSeenAtMs, fact.timestampMs);
    if (fact.normalizedAction.includes("purchase")) {
      firstPurchaseAtMs = Math.min(firstPurchaseAtMs, fact.timestampMs);
    }
    if (fact.normalizedAction.includes("unlock")) {
      firstUnlockAtMs = Math.min(firstUnlockAtMs, fact.timestampMs);
    }
    if (fact.normalizedAction.includes("message")) {
      firstMessageAtMs = Math.min(firstMessageAtMs, fact.timestampMs);
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

const USER_JOURNEY_FUNNEL_STAGES = [
  "guest",
  "signed_up",
  "onboarded",
  "checked_in",
  "previewed",
  "purchased",
  "unwrapped",
  "viewed",
  "messaged",
] as const satisfies readonly UserJourneyIndex["funnelStage"][];

function earliestKnownJourneyTimestamp(...values: Array<number | undefined>) {
  const known = values.filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0);
  return known.length > 0 ? Math.min(...known) : undefined;
}

function isSameJourneySubject(current: UserJourneyIndex, incoming: UserJourneyIndex) {
  if (incoming.userId) return current.userId === incoming.userId;
  if (incoming.anonymousVisitorId) {
    return current.anonymousVisitorId === incoming.anonymousVisitorId;
  }
  return false;
}

/** Preserve lifetime journey milestones when publishing a bounded source window. */
export function mergeUserJourneyIndexLifetime(
  current: UserJourneyIndex | null | undefined,
  incoming: UserJourneyIndex,
): UserJourneyIndex {
  if (!current || !isSameJourneySubject(current, incoming)) return incoming;
  const currentStageIndex = USER_JOURNEY_FUNNEL_STAGES.indexOf(current.funnelStage);
  const incomingStageIndex = USER_JOURNEY_FUNNEL_STAGES.indexOf(incoming.funnelStage);
  const funnelStage = currentStageIndex > incomingStageIndex
    ? current.funnelStage
    : incoming.funnelStage;
  const currentSessionIds = Array.isArray(current.sessionIds) ? current.sessionIds : [];
  const incomingSessionIds = Array.isArray(incoming.sessionIds) ? incoming.sessionIds : [];
  const sessionIds = Array.from(new Set(
    [
      ...incomingSessionIds.slice(0, USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT),
      ...currentSessionIds.slice(0, USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT),
    ]
      .filter((sessionId): sessionId is string => typeof sessionId === "string")
      .map((sessionId) => sessionId.trim())
      .filter(Boolean),
  )).slice(0, USER_INDEX_MATERIALIZER_MAX_FACTS_PER_SUBJECT);
  const currentIdentityLinkId = typeof current.identityLinkId === "string"
    ? current.identityLinkId.trim()
    : "";
  const incomingIdentityLinkId = typeof incoming.identityLinkId === "string"
    ? incoming.identityLinkId.trim()
    : "";

  return {
    ...incoming,
    sessionIds,
    firstSeenAtMs: earliestKnownJourneyTimestamp(
      current.firstSeenAtMs,
      incoming.firstSeenAtMs,
    ) ?? 0,
    signedUpAtMs: earliestKnownJourneyTimestamp(current.signedUpAtMs, incoming.signedUpAtMs),
    onboardedAtMs: earliestKnownJourneyTimestamp(current.onboardedAtMs, incoming.onboardedAtMs),
    firstPurchaseAtMs: earliestKnownJourneyTimestamp(
      current.firstPurchaseAtMs,
      incoming.firstPurchaseAtMs,
    ),
    firstUnlockAtMs: earliestKnownJourneyTimestamp(
      current.firstUnlockAtMs,
      incoming.firstUnlockAtMs,
    ),
    firstMessageAtMs: earliestKnownJourneyTimestamp(
      current.firstMessageAtMs,
      incoming.firstMessageAtMs,
    ),
    guestToUserLinked: current.guestToUserLinked === true || incoming.guestToUserLinked === true,
    identityLinkId: incomingIdentityLinkId || currentIdentityLinkId || undefined,
    funnelStage,
  };
}

export function buildUserNotificationIndex(userId: string, facts: BehavioralTimelineFact[]): UserNotificationIndex {
  let notificationReadCount = 0;
  let notificationOpenCount = 0;
  let lastNotificationReadAtMs = 0;

  for (const fact of facts) {
    if (fact.actorUserId !== userId || !fact.normalizedAction.includes("notification")) continue;
    notificationOpenCount += 1;
    if (fact.normalizedAction.includes("notification_read")) {
      notificationReadCount += 1;
      lastNotificationReadAtMs = Math.max(lastNotificationReadAtMs, fact.timestampMs);
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

  for (const fact of facts) {
    if (fact.actorUserId !== userId) continue;
    if (fact.normalizedAction.includes("file_viewed")) viewedFileCount += 1;
    if (fact.normalizedAction.includes("drop_viewed") || fact.normalizedAction.includes("preview")) openedDropCount += 1;
    if (fact.normalizedAction.includes("unlock")) unwrappedDropCount += 1;
  }

  const hasObservedConsumption = viewedFileCount > 0 || openedDropCount > 0 || unwrappedDropCount > 0;
  return {
    userId,
    validWatchTimeMs: null,
    viewedFileCount,
    completedFileCount: null,
    openedDropCount,
    unwrappedDropCount,
    watchScoreSource: "source_missing",
    watchConfidence: 0,
    dataAvailabilityReason: hasObservedConsumption ? "partial" : "source_missing",
    issues: ["valid_watch_duration_source_missing", "completed_file_source_missing"],
    updatedAtMs: Date.now(),
  };
}

export type UserIndexMaterializerFact = BehavioralTimelineFact & {
  idempotencyKey?: string;
};

export type NormalizedUserIndexFacts = {
  globalFacts: UserIndexMaterializerFact[];
  personFacts: UserIndexMaterializerFact[];
  exclusions: UserIndexMaterializerExclusionCounts;
};

type LineageSummary = {
  ownerUserIds: Set<string>;
  eligibleSessionIds: Set<string>;
  personAttributionAllowed: boolean;
  recordCount: number;
};

type PersonFactCandidate = {
  fact: UserIndexMaterializerFact;
  identityKind: "guest" | "identified";
  personUserId: string;
  action: string;
  target: string;
};

function cleanMaterializerString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function exclusionIncrement(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(1_000, Math.trunc(value)))
    : 1;
}

export function normalizeUserIndexAction(value: unknown) {
  return cleanMaterializerString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
}

export function canonicalizeUserIndexFactTarget(fact: Pick<UserIndexMaterializerFact, "route" | "target">) {
  const targetEntries = Object.entries(fact.target ?? {})
    .map(([key, value]) => [key, cleanMaterializerString(value)] as const)
    .filter((entry) => Boolean(entry[1]))
    .sort(([left], [right]) => left.localeCompare(right));
  if (targetEntries.length > 0) {
    return targetEntries.map(([key, value]) => `${key}:${value}`).join("|");
  }
  const route = cleanMaterializerString(fact.route).split(/[?#]/u, 1)[0] || "unknown";
  return `route:${route}`;
}

function readFactIdempotencyKey(fact: UserIndexMaterializerFact) {
  return cleanMaterializerString(fact.idempotencyKey);
}

function sourceTruthRank(fact: UserIndexMaterializerFact) {
  switch (fact.sourceTruth) {
    case "canonical": return 5;
    case "server": return 4;
    case "materialized": return 3;
    case "client": return 2;
    case "ga4_optional": return 1;
    case "legacy": return 0;
  }
}

function preferExactReplayCandidate(
  candidate: UserIndexMaterializerFact,
  current: UserIndexMaterializerFact,
) {
  const candidateScores = [
    candidate.actorType === "admin" || candidate.actorType === "system" ? 0 : 1,
    cleanMaterializerString(candidate.actorUserId) ? 1 : 0,
    sourceTruthRank(candidate),
    candidate.metricEligible ? 1 : 0,
    Number.isFinite(candidate.sourceReliability) ? candidate.sourceReliability : 0,
  ];
  const currentScores = [
    current.actorType === "admin" || current.actorType === "system" ? 0 : 1,
    cleanMaterializerString(current.actorUserId) ? 1 : 0,
    sourceTruthRank(current),
    current.metricEligible ? 1 : 0,
    Number.isFinite(current.sourceReliability) ? current.sourceReliability : 0,
  ];
  for (let index = 0; index < candidateScores.length; index += 1) {
    if (candidateScores[index] !== currentScores[index]) {
      return candidateScores[index] > currentScores[index];
    }
  }
  if (candidate.timestampMs !== current.timestampMs) return candidate.timestampMs < current.timestampMs;
  return cleanMaterializerString(candidate.factId).localeCompare(cleanMaterializerString(current.factId)) < 0;
}

export function dedupeExactUserIndexFactReplays(facts: readonly UserIndexMaterializerFact[]) {
  const parent = facts.map((_, index) => index);
  const find = (input: number): number => {
    let value = input;
    while (parent[value] !== value) value = parent[value];
    let cursor = input;
    while (parent[cursor] !== cursor) {
      const next = parent[cursor];
      parent[cursor] = value;
      cursor = next;
    }
    return value;
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  };
  const seenKeys = new Map<string, number>();
  facts.forEach((fact, index) => {
    const keys = [
      cleanMaterializerString(fact.factId) ? `fact:${cleanMaterializerString(fact.factId)}` : "",
      readFactIdempotencyKey(fact) ? `idempotency:${readFactIdempotencyKey(fact)}` : "",
    ].filter(Boolean);
    for (const key of keys) {
      const existingIndex = seenKeys.get(key);
      if (existingIndex === undefined) seenKeys.set(key, index);
      else union(index, existingIndex);
    }
  });

  const groups = new Map<number, UserIndexMaterializerFact[]>();
  facts.forEach((fact, index) => {
    const root = find(index);
    const group = groups.get(root) ?? [];
    group.push(fact);
    groups.set(root, group);
  });
  const dedupedFacts = Array.from(groups.values()).map((group) =>
    group.slice(1).reduce(
      (selected, candidate) => preferExactReplayCandidate(candidate, selected) ? candidate : selected,
      group[0],
    ),
  ).sort((left, right) =>
    left.timestampMs - right.timestampMs
    || cleanMaterializerString(left.factId).localeCompare(cleanMaterializerString(right.factId)),
  );
  return {
    facts: dedupedFacts,
    excludedCount: Math.max(0, facts.length - dedupedFacts.length),
  };
}

function addLineageSummary(
  map: Map<string, LineageSummary>,
  key: string,
  lineage: IdentityLineageIndex,
) {
  if (!key) return;
  const summary = map.get(key) ?? {
    ownerUserIds: new Set<string>(),
    eligibleSessionIds: new Set<string>(),
    personAttributionAllowed: true,
    recordCount: 0,
  };
  const ownerUserId = cleanMaterializerString(lineage.userId);
  if (ownerUserId) summary.ownerUserIds.add(ownerUserId);
  for (const sessionId of lineage.sessionIds) {
    const normalizedSessionId = cleanMaterializerString(sessionId);
    if (normalizedSessionId) summary.eligibleSessionIds.add(normalizedSessionId);
  }
  const recordAllowsAttribution = lineage.mergeAllowed === true
    && lineage.personLevelBehaviorAllowed === true
    && lineage.consentState === "granted"
    && lineage.consentMode === "full_behavioral"
    && lineage.linkageConfidenceSource === "full_behavioral_consent";
  summary.personAttributionAllowed = summary.personAttributionAllowed && recordAllowsAttribution;
  summary.recordCount += 1;
  map.set(key, summary);
}

function buildLineageMaps(lineages: readonly IdentityLineageIndex[]) {
  const byAnonymousVisitorId = new Map<string, LineageSummary>();
  const byIdentityLinkId = new Map<string, LineageSummary>();
  for (const lineage of lineages) {
    addLineageSummary(
      byAnonymousVisitorId,
      cleanMaterializerString(lineage.anonymousVisitorId),
      lineage,
    );
    addLineageSummary(byIdentityLinkId, cleanMaterializerString(lineage.identityLinkId), lineage);
  }
  return { byAnonymousVisitorId, byIdentityLinkId };
}

function resolveLineageSummary(
  fact: UserIndexMaterializerFact,
  lineageMaps: ReturnType<typeof buildLineageMaps>,
) {
  const anonymousVisitorId = cleanMaterializerString(fact.anonymousVisitorId);
  const identityLinkId = cleanMaterializerString(fact.identityLinkId);
  const summaries = [
    anonymousVisitorId ? lineageMaps.byAnonymousVisitorId.get(anonymousVisitorId) : undefined,
    identityLinkId ? lineageMaps.byIdentityLinkId.get(identityLinkId) : undefined,
  ].filter((summary): summary is LineageSummary => Boolean(summary));
  if (summaries.length === 0) return undefined;
  if (summaries.length === 1) return summaries[0];
  const combined: LineageSummary = {
    ownerUserIds: new Set<string>(),
    eligibleSessionIds: new Set<string>(),
    personAttributionAllowed: summaries.every((summary) => summary.personAttributionAllowed),
    recordCount: summaries.reduce((count, summary) => count + summary.recordCount, 0),
  };
  for (const summary of summaries) {
    for (const ownerUserId of summary.ownerUserIds) combined.ownerUserIds.add(ownerUserId);
    for (const sessionId of summary.eligibleSessionIds) combined.eligibleSessionIds.add(sessionId);
  }
  return combined;
}

function dedupeLinkedGuestIdentifiedCopies(candidates: PersonFactCandidate[]) {
  const ordered = [...candidates].sort((left, right) =>
    left.fact.timestampMs - right.fact.timestampMs
    || (left.identityKind === right.identityKind ? 0 : left.identityKind === "identified" ? -1 : 1)
    || cleanMaterializerString(left.fact.factId).localeCompare(cleanMaterializerString(right.fact.factId)),
  );
  const retained = ordered.map(() => true);
  const unmatched = new Map<string, { guest: number[]; identified: number[] }>();
  let excludedCount = 0;

  ordered.forEach((candidate, index) => {
    const key = `${candidate.personUserId}\0${candidate.action}\0${candidate.target}`;
    const lanes = unmatched.get(key) ?? { guest: [], identified: [] };
    const oppositeLane = candidate.identityKind === "guest" ? lanes.identified : lanes.guest;
    while (
      oppositeLane.length > 0
      && candidate.fact.timestampMs - ordered[oppositeLane[0]].fact.timestampMs > USER_INDEX_MATERIALIZER_LINKED_COPY_WINDOW_MS
    ) {
      oppositeLane.shift();
    }
    const oppositeIndex = oppositeLane.pop();
    if (oppositeIndex !== undefined) {
      excludedCount += 1;
      if (candidate.identityKind === "identified") retained[oppositeIndex] = false;
      else retained[index] = false;
    } else {
      lanes[candidate.identityKind].push(index);
    }
    unmatched.set(key, lanes);
  });

  return {
    candidates: ordered.filter((_, index) => retained[index]),
    excludedFacts: new Set(ordered.filter((_, index) => !retained[index]).map((candidate) => candidate.fact)),
    excludedCount,
  };
}

export function normalizeFactsForUserIndexMaterialization(input: {
  facts: readonly UserIndexMaterializerFact[];
  lineages: readonly IdentityLineageIndex[];
}): NormalizedUserIndexFacts {
  const exact = dedupeExactUserIndexFactReplays(input.facts);
  const lineageMaps = buildLineageMaps(input.lineages);
  const globalFacts: UserIndexMaterializerFact[] = [];
  const personCandidates: PersonFactCandidate[] = [];
  const exclusions: UserIndexMaterializerExclusionCounts = {
    exactReplayExcludedCount: exact.excludedCount,
    linkedCopyExcludedCount: 0,
    identityConflictExcludedCount: 0,
    lineageBlockedCount: 0,
    adminExcludedCount: 0,
    systemExcludedCount: 0,
  };

  for (const fact of exact.facts) {
    if (fact.actorType === "admin") {
      exclusions.adminExcludedCount += exclusionIncrement(fact.adminExcludedCount);
      continue;
    }
    if (fact.actorType === "system") {
      exclusions.systemExcludedCount += exclusionIncrement(fact.systemExcludedCount);
      continue;
    }
    if (fact.includeInGlobalEvents !== false) globalFacts.push(fact);

    const actorUserId = cleanMaterializerString(fact.actorUserId);
    const anonymousVisitorId = cleanMaterializerString(fact.anonymousVisitorId);
    const identityLinkId = cleanMaterializerString(fact.identityLinkId);
    const sessionId = cleanMaterializerString(fact.sessionId);
    const lineage = resolveLineageSummary(fact, lineageMaps);
    const ownerUserIds = lineage ? Array.from(lineage.ownerUserIds) : [];
    if (ownerUserIds.length > 1 || (actorUserId && ownerUserIds.length === 1 && ownerUserIds[0] !== actorUserId)) {
      exclusions.identityConflictExcludedCount += 1;
      continue;
    }

    let personUserId = actorUserId;
    let identityKind: PersonFactCandidate["identityKind"] = "identified";
    const linkedIdentityContext = Boolean(anonymousVisitorId || identityLinkId);
    if (personUserId && fact.includeInPersonMetrics === false) continue;
    if (linkedIdentityContext) {
      const eligibleSession = Boolean(sessionId && lineage?.eligibleSessionIds.has(sessionId));
      if (
        !lineage
        || lineage.personAttributionAllowed !== true
        || !eligibleSession
        || fact.consentState !== "granted"
      ) {
        exclusions.lineageBlockedCount += 1;
        continue;
      }
    }
    if (!personUserId) {
      if (ownerUserIds.length !== 1 || !linkedIdentityContext) {
        if (ownerUserIds.length === 1 || linkedIdentityContext) exclusions.lineageBlockedCount += 1;
        continue;
      }
      personUserId = ownerUserIds[0];
      identityKind = "guest";
    }

    personCandidates.push({
      fact,
      identityKind,
      personUserId,
      action: normalizeUserIndexAction(fact.normalizedAction),
      target: canonicalizeUserIndexFactTarget(fact),
    });
  }

  const linkedDedupe = dedupeLinkedGuestIdentifiedCopies(personCandidates);
  exclusions.linkedCopyExcludedCount = linkedDedupe.excludedCount;
  const personFacts = linkedDedupe.candidates.map((candidate) => ({
    ...candidate.fact,
    actorUserId: candidate.personUserId,
  }));
  const dedupedGlobalFacts = globalFacts.filter((fact) => !linkedDedupe.excludedFacts.has(fact));

  return { globalFacts: dedupedGlobalFacts, personFacts, exclusions };
}
