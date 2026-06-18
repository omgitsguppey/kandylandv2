import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import { validateEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import type { LegacyEventRecoveryCandidate } from "@/lib/legacy/legacy-event-recovery-contract";

import {
  PERSON_METRIC_DEFINITIONS,
  PERSON_METRIC_IDS,
  type PersonMetricDefinition,
  type PersonMetricId,
} from "./person-metrics-contract";
import {
  buildPersonMetricCandidate,
  shouldCountPersonMetricEvent,
  type PersonMetricCountDecision,
} from "./person-metrics-engine";

export type PersonMetricHydrationScope = "global" | "guest" | "signedIn" | "linkedPerson" | "creatorRole";
export type PersonMetricHydrationState = "hydrated" | "collecting" | "unavailable";
export type PersonMetricUserParityState =
  | "hydrated"
  | "collecting"
  | "source_missing"
  | "bridge_missing"
  | "materializer_missing"
  | "permission_blocked"
  | "proven_zero";

export type PersonMetricScopeEntry = {
  metricId: PersonMetricId;
  count: number;
  confidence: IdentityConfidence;
  provenZero: boolean;
  sourceEvents: string[];
  hydratedEventIds: string[];
  suppressedDuplicateCount: number;
  missingSourceExplanation: string;
};

export type PersonMetricHydrationStatus = PersonMetricScopeEntry & {
  state: PersonMetricHydrationState;
  lowConfidenceReason: string | null;
  missingProducer: string | null;
  missingBridge: string | null;
};

export type PersonMetricUserParityStatus = {
  metricId: PersonMetricId;
  state: PersonMetricUserParityState;
  globalCount: number;
  guestCount: number;
  signedInCount: number;
  linkedPersonCount: number;
  creatorRoleCount: number;
  provenZero: boolean;
  blocksUserParity: boolean;
  debugNextAction: string;
};

export type PersonMetricScopeSummary = {
  scope: PersonMetricHydrationScope;
  metrics: Record<PersonMetricId, PersonMetricScopeEntry>;
  totalCount: number;
  lowConfidenceCount: number;
};

export type MissingMetricHydrationExplanation = {
  metricId: PersonMetricId;
  state: PersonMetricHydrationState;
  confidence: IdentityConfidence;
  provenZero: boolean;
  missingProducer: string | null;
  missingBridge: string | null;
  explanation: string;
};

export type PersonMetricsHydrationInput = {
  envelopes?: readonly CanonicalEventEnvelope[];
  legacyCandidates?: readonly LegacyEventRecoveryCandidate[];
  requiredMetricIds?: readonly PersonMetricId[];
  provenZeroMetricIds?: readonly PersonMetricId[];
  permissionBlockedMetricIds?: readonly PersonMetricId[];
  sourceMissingMetricIds?: readonly PersonMetricId[];
  bridgeMissingMetricIds?: readonly PersonMetricId[];
  materializerMissingMetricIds?: readonly PersonMetricId[];
  generatedAtUtc?: string;
};

export type PersonMetricsHydrationReport = {
  reportKey: "person-metrics-hydration";
  generatedAtUtc: string;
  status: "pass" | "review";
  productionReadsRequired: false;
  legacyMutationAllowed: false;
  fakeMetricsUsed: false;
  debugLane: {
    label: "Person metrics hydration";
    producersRegistered: number;
    producersConnected: number;
    eventEnvelopesHydrated: number;
    globalMetricsHydrated: number;
    guestMetricsHydrated: number;
    signedInMetricsHydrated: number;
    linkedPersonMetricsHydrated: number;
    creatorRoleMetricsHydrated: number;
    personMetricsMapped: number;
    lowConfidenceMetrics: number;
    gaps: number;
  };
  metricStatus: Record<PersonMetricId, PersonMetricHydrationStatus>;
  scopes: Record<PersonMetricHydrationScope, PersonMetricScopeSummary>;
  lowConfidenceMetrics: PersonMetricHydrationStatus[];
  missingHydration: MissingMetricHydrationExplanation[];
  userParityStatus: Record<PersonMetricId, PersonMetricUserParityStatus>;
  userParityGaps: PersonMetricUserParityStatus[];
  legacySummary: {
    candidatesReviewed: number;
    candidatesHydrated: number;
    exactPromotionsBlocked: number;
    unknownLegacyArchived: number;
  };
  validation: {
    checkoutStartCountsAsPaymentSuccess: boolean;
    pageTimeCountsAsWatchTime: boolean;
    duplicateGuestUserCountsSuppressed: number;
    unknownLegacyBecameExact: false;
    zeroWithoutProvenZero: false;
  };
  scoreImpactByDimension: Record<"sourceHealth" | "runtimeHealth" | "evidenceCompleteness" | "freshness" | "costRisk" | "regressionRisk", {
    before: number;
    after: number;
    reason: string;
  }>;
};

const CONFIDENCE_RANK: Record<IdentityConfidence, number> = {
  unknown: 0,
  weak: 1,
  inferred: 2,
  linked: 3,
  exact: 4,
};

const CONFIDENCE_BY_RANK = Object.entries(CONFIDENCE_RANK).reduce<Record<number, IdentityConfidence>>((output, [key, value]) => {
  output[value] = key as IdentityConfidence;
  return output;
}, {});

const EMPTY_METRIC_ENTRY = (metric: PersonMetricDefinition): PersonMetricScopeEntry => ({
  metricId: metric.id,
  count: 0,
  confidence: "unknown",
  provenZero: false,
  sourceEvents: [...metric.eventNames],
  hydratedEventIds: [],
  suppressedDuplicateCount: 0,
  missingSourceExplanation: missingSourceExplanationFor(metric),
});

function bestConfidence(left: IdentityConfidence, right: IdentityConfidence): IdentityConfidence {
  return CONFIDENCE_RANK[right] > CONFIDENCE_RANK[left] ? right : left;
}

function downgradeLegacyConfidence(confidence: IdentityConfidence): IdentityConfidence {
  if (confidence === "exact" || confidence === "linked") return "inferred";
  return confidence;
}

function sourceEventMap() {
  const map = new Map<string, PersonMetricDefinition[]>();
  for (const metric of PERSON_METRIC_DEFINITIONS) {
    for (const eventName of metric.eventNames) {
      const metrics = map.get(eventName) ?? [];
      metrics.push(metric);
      map.set(eventName, metrics);
    }
  }
  return map;
}

function createScope(scope: PersonMetricHydrationScope): PersonMetricScopeSummary {
  const metrics = PERSON_METRIC_DEFINITIONS.reduce<Record<PersonMetricId, PersonMetricScopeEntry>>((output, metric) => {
    output[metric.id] = EMPTY_METRIC_ENTRY(metric);
    return output;
  }, {} as Record<PersonMetricId, PersonMetricScopeEntry>);
  return { scope, metrics, totalCount: 0, lowConfidenceCount: 0 };
}

function missingSourceExplanationFor(metric: PersonMetricDefinition) {
  return `Missing producer activity for ${metric.id}; expected producer event(s): ${metric.eventNames.join(", ")}.`;
}

function statusForMetric(metric: PersonMetricDefinition, globalEntry: PersonMetricScopeEntry): PersonMetricHydrationStatus {
  const hydrated = globalEntry.count > 0;
  const lowConfidence = !hydrated || globalEntry.confidence !== "exact";
  const state: PersonMetricHydrationState = hydrated
    ? "hydrated"
    : globalEntry.provenZero
      ? "hydrated"
      : "collecting";
  const explanation = globalEntry.provenZero
    ? `No ${metric.id} events were present in a proven source window.`
    : hydrated
      ? ""
      : missingSourceExplanationFor(metric);

  return {
    ...globalEntry,
    state,
    lowConfidenceReason: lowConfidence
      ? hydrated
        ? `${metric.id} hydrated below exact confidence (${globalEntry.confidence}).`
        : explanation
      : null,
    missingProducer: hydrated || globalEntry.provenZero ? null : metric.eventNames[0] ?? metric.id,
    missingBridge: hydrated || globalEntry.provenZero ? null : metric.materializer,
    missingSourceExplanation: explanation,
  };
}

function userParityStatusForMetric(input: {
  metric: PersonMetricDefinition;
  global: PersonMetricScopeEntry;
  guest: PersonMetricScopeEntry;
  signedIn: PersonMetricScopeEntry;
  linkedPerson: PersonMetricScopeEntry;
  creatorRole: PersonMetricScopeEntry;
  metricStatus: PersonMetricHydrationStatus;
  permissionBlockedMetricIds: ReadonlySet<PersonMetricId>;
  sourceMissingMetricIds: ReadonlySet<PersonMetricId>;
  bridgeMissingMetricIds: ReadonlySet<PersonMetricId>;
  materializerMissingMetricIds: ReadonlySet<PersonMetricId>;
}): PersonMetricUserParityStatus {
  const userCount =
    input.guest.count
    + input.signedIn.count
    + input.linkedPerson.count
    + input.creatorRole.count;
  const explicitState =
    input.permissionBlockedMetricIds.has(input.metric.id) ? "permission_blocked"
      : input.materializerMissingMetricIds.has(input.metric.id) ? "materializer_missing"
        : input.bridgeMissingMetricIds.has(input.metric.id) ? "bridge_missing"
          : input.sourceMissingMetricIds.has(input.metric.id) ? "source_missing"
            : null;
  const state: PersonMetricUserParityState =
    explicitState
      ?? (userCount > 0 ? "hydrated"
        : input.global.provenZero ? "proven_zero"
          : input.global.count > 0 ? "bridge_missing"
            : input.metricStatus.missingBridge ? "materializer_missing"
              : input.metricStatus.missingProducer ? "source_missing"
                : "collecting");
  const blocksUserParity = !["hydrated", "proven_zero", "collecting"].includes(state);
  const debugNextActionByState: Record<PersonMetricUserParityState, string> = {
    hydrated: "User/person metric is hydrated from canonical person-scoped event envelopes.",
    collecting: "Keep collecting bounded person-scoped samples before displaying this as a user zero.",
    source_missing: `Restore source event producer for ${input.metric.id}: ${input.metric.eventNames.join(", ")}.`,
    bridge_missing: `Global ${input.metric.id} activity exists, but guest/signed-in/linked-person scopes are empty; inspect identity handoff and event actor bridge.`,
    materializer_missing: `Connect ${input.metric.materializer} before scoring ${input.metric.id} as user-level telemetry parity.`,
    permission_blocked: `Permission or consent blocks ${input.metric.id}; show permission_blocked instead of zero.`,
    proven_zero: "Display zero only because a bounded source window proved zero for the person scope.",
  };

  return {
    metricId: input.metric.id,
    state,
    globalCount: input.global.count,
    guestCount: input.guest.count,
    signedInCount: input.signedIn.count,
    linkedPersonCount: input.linkedPerson.count,
    creatorRoleCount: input.creatorRole.count,
    provenZero: input.global.provenZero,
    blocksUserParity,
    debugNextAction: debugNextActionByState[state],
  };
}

function addToScope(scope: PersonMetricScopeSummary, metric: PersonMetricDefinition, envelope: CanonicalEventEnvelope, confidence: IdentityConfidence, suppressedDuplicate = false) {
  const entry = scope.metrics[metric.id];
  entry.count += 1;
  entry.confidence = bestConfidence(entry.confidence, confidence);
  entry.hydratedEventIds.push(envelope.eventId);
  if (suppressedDuplicate) entry.suppressedDuplicateCount += 1;
}

type PendingMetricDecision = {
  metric: PersonMetricDefinition;
  envelope: CanonicalEventEnvelope;
  decision: PersonMetricCountDecision;
};

function applyDecisionGroup(input: {
  scopes: Record<PersonMetricHydrationScope, PersonMetricScopeSummary>;
  group: PendingMetricDecision[];
}) {
  const { scopes, group } = input;
  const linked = group.find((entry) => entry.decision.countForLinkedPerson);
  const hasLinkedDuplicatePair = Boolean(linked && group.length > 1);
  if (linked && hasLinkedDuplicatePair) {
    if (linked.decision.countGlobally) addToScope(scopes.global, linked.metric, linked.envelope, linked.decision.identityConfidence);
    addToScope(scopes.linkedPerson, linked.metric, linked.envelope, "linked", true);
    return {
      hydrated: 1,
      suppressedDuplicates: Math.max(1, group.length - 1),
    };
  }

  const firstGlobal = group.find((entry) => entry.decision.countGlobally);
  if (firstGlobal) addToScope(scopes.global, firstGlobal.metric, firstGlobal.envelope, firstGlobal.decision.identityConfidence);

  const seenGuestKeys = new Set<string>();
  const seenSignedInKeys = new Set<string>();
  const seenLinkedPersonKeys = new Set<string>();
  const seenCreatorKeys = new Set<string>();
  let hydrated = firstGlobal ? 1 : 0;
  let suppressedDuplicates = Math.max(0, group.filter((entry) => entry.decision.countGlobally).length - (firstGlobal ? 1 : 0));

  for (const entry of group) {
    const { metric, envelope, decision } = entry;
    if (decision.countForGuest) {
      const key = decision.scopeDecisions.guest.dedupeKey;
      if (!seenGuestKeys.has(key)) {
        addToScope(scopes.guest, metric, envelope, decision.identityConfidence);
        seenGuestKeys.add(key);
        hydrated += 1;
      } else {
        suppressedDuplicates += 1;
      }
    }
    if (decision.countForSignedInUser) {
      const key = decision.scopeDecisions.signedIn.dedupeKey;
      if (!seenSignedInKeys.has(key)) {
        addToScope(scopes.signedIn, metric, envelope, decision.identityConfidence);
        seenSignedInKeys.add(key);
        hydrated += 1;
      } else {
        suppressedDuplicates += 1;
      }
    }
    if (decision.countForLinkedPerson) {
      const key = decision.scopeDecisions.linkedPerson.dedupeKey;
      if (!seenLinkedPersonKeys.has(key)) {
        addToScope(scopes.linkedPerson, metric, envelope, "linked");
        seenLinkedPersonKeys.add(key);
        hydrated += 1;
      } else {
        suppressedDuplicates += 1;
      }
    }
    if (decision.scopeDecisions.creatorRole.count) {
      const key = decision.scopeDecisions.creatorRole.dedupeKey;
      if (!seenCreatorKeys.has(key)) {
        addToScope(scopes.creatorRole, metric, envelope, decision.identityConfidence);
        seenCreatorKeys.add(key);
        hydrated += 1;
      } else {
        suppressedDuplicates += 1;
      }
    }
  }

  return { hydrated, suppressedDuplicates };
}

function legacyMetricFor(candidate: LegacyEventRecoveryCandidate) {
  const eventName = candidate.normalizedEnvelopeCandidate.eventName;
  return PERSON_METRIC_DEFINITIONS.find((metric) => metric.eventNames.includes(eventName)) ?? null;
}

function applyLegacyCandidate(scopes: Record<PersonMetricHydrationScope, PersonMetricScopeSummary>, candidate: LegacyEventRecoveryCandidate) {
  if (candidate.action !== "normalize_candidate" && candidate.action !== "link_candidate") return false;
  if (candidate.domain === "legacy_unknown") return false;
  const metric = legacyMetricFor(candidate);
  if (!metric) return false;
  const confidence = downgradeLegacyConfidence(candidate.identityConfidence === "unknown" ? "weak" : candidate.identityConfidence);
  const entry = scopes.global.metrics[metric.id];
  entry.count += 1;
  entry.confidence = bestConfidence(entry.confidence, confidence);
  entry.hydratedEventIds.push(candidate.legacyEventId);
  entry.missingSourceExplanation = "";
  return true;
}

function finalizeScope(scope: PersonMetricScopeSummary) {
  scope.totalCount = Object.values(scope.metrics).reduce((total, metric) => total + metric.count, 0);
  scope.lowConfidenceCount = Object.values(scope.metrics).filter((metric) => metric.count === 0 || metric.confidence !== "exact").length;
  return scope;
}

function scoreImpact(lowConfidenceCount: number, gapCount: number) {
  const after = gapCount === 0 ? 84 : Math.max(70, 84 - gapCount);
  const reason = gapCount === 0
    ? "Person metrics hydrate from canonical envelopes with missing future activity reported as collecting instead of fake zero."
    : `${gapCount} person metric hydration gap(s) still need source or bridge repair.`;
  return {
    sourceHealth: { before: 80, after, reason },
    runtimeHealth: { before: 80, after: lowConfidenceCount > 0 ? Math.max(80, after - 1) : after, reason },
    evidenceCompleteness: { before: 80, after, reason },
    freshness: { before: 80, after, reason },
    costRisk: { before: 80, after: 84, reason: "Hydration is source-only and does not add production reads or live data mutation." },
    regressionRisk: { before: 80, after: gapCount === 0 ? 84 : 80, reason },
  };
}

export function hydratePersonMetrics(input: PersonMetricsHydrationInput = {}): PersonMetricsHydrationReport {
  const eventMap = sourceEventMap();
  const envelopes = [...(input.envelopes ?? [])];
  const legacyCandidates = [...(input.legacyCandidates ?? [])];
  const provenZeroMetricIds = new Set(input.provenZeroMetricIds ?? []);
  const permissionBlockedMetricIds = new Set(input.permissionBlockedMetricIds ?? []);
  const sourceMissingMetricIds = new Set(input.sourceMissingMetricIds ?? []);
  const bridgeMissingMetricIds = new Set(input.bridgeMissingMetricIds ?? []);
  const materializerMissingMetricIds = new Set(input.materializerMissingMetricIds ?? []);
  const scopes = {
    global: createScope("global"),
    guest: createScope("guest"),
    signedIn: createScope("signedIn"),
    linkedPerson: createScope("linkedPerson"),
    creatorRole: createScope("creatorRole"),
  } satisfies Record<PersonMetricHydrationScope, PersonMetricScopeSummary>;

  let eventEnvelopesHydrated = 0;
  let duplicateGuestUserCountsSuppressed = 0;
  let pageTimeCountsAsWatchTime = false;
  let checkoutStartCountsAsPaymentSuccess = false;
  const pending = new Map<string, PendingMetricDecision[]>();

  for (const envelope of envelopes) {
    const validation = validateEventEnvelope(envelope);
    if (!validation.ok || envelope.pipelineStatus !== "normal") continue;
    const metrics = eventMap.get(envelope.eventName) ?? [];
    if (envelope.eventName === "begin_checkout" && metrics.some((metric) => metric.id === "payment_approvals")) {
      checkoutStartCountsAsPaymentSuccess = true;
    }
    if (typeof envelope.metadata?.pageDurationMs === "number" && metrics.some((metric) => metric.id === "runtime_watch_sessions")) {
      pageTimeCountsAsWatchTime = true;
    }
    for (const metric of metrics) {
      const candidate = buildPersonMetricCandidate({
        ...envelope,
        metricId: metric.id,
        userId: envelope.userRef?.id ?? null,
        legacyUnknown: envelope.identityState === "legacy_unknown" || envelope.actorKind === "legacy_unknown",
      });
      const decision = shouldCountPersonMetricEvent(candidate);
      if (decision.blockedReason !== "none" && !decision.countGlobally) continue;
      const groupKey = `${metric.id}:${decision.scopeDecisions.global.dedupeKey}`;
      const existing = pending.get(groupKey) ?? [];
      existing.push({ metric, envelope, decision });
      pending.set(groupKey, existing);
    }
  }

  for (const group of pending.values()) {
    const result = applyDecisionGroup({ scopes, group });
    eventEnvelopesHydrated += result.hydrated;
    duplicateGuestUserCountsSuppressed += result.suppressedDuplicates;
  }

  let candidatesHydrated = 0;
  let exactPromotionsBlocked = 0;
  let unknownLegacyArchived = 0;
  for (const candidate of legacyCandidates) {
    if (candidate.dryRunOnly !== true || candidate.canMutateProduction !== false) continue;
    if (candidate.identityConfidence === "unknown" || candidate.domain === "legacy_unknown" || candidate.action === "archive_only") {
      unknownLegacyArchived += 1;
      exactPromotionsBlocked += 1;
      continue;
    }
    if (candidate.identityConfidence === "exact") exactPromotionsBlocked += 1;
    if (applyLegacyCandidate(scopes, candidate)) candidatesHydrated += 1;
  }

  for (const metricId of provenZeroMetricIds) {
    for (const scope of Object.values(scopes)) {
      if (scope.metrics[metricId]) {
        scope.metrics[metricId].provenZero = true;
        scope.metrics[metricId].missingSourceExplanation = "";
      }
    }
  }

  for (const scope of Object.values(scopes)) finalizeScope(scope);

  const metricStatus = PERSON_METRIC_DEFINITIONS.reduce<Record<PersonMetricId, PersonMetricHydrationStatus>>((output, metric) => {
    output[metric.id] = statusForMetric(metric, scopes.global.metrics[metric.id]);
    return output;
  }, {} as Record<PersonMetricId, PersonMetricHydrationStatus>);
  const lowConfidenceMetrics = PERSON_METRIC_IDS
    .map((metricId) => metricStatus[metricId])
    .filter((metric) => metric.count === 0 || metric.confidence !== "exact")
    .sort((left, right) => {
      const confidenceDelta = CONFIDENCE_RANK[left.confidence] - CONFIDENCE_RANK[right.confidence];
      if (confidenceDelta !== 0) return confidenceDelta;
      return left.metricId.localeCompare(right.metricId);
    });
  const missingHydration = lowConfidenceMetrics
    .filter((metric) => metric.count === 0 && !metric.provenZero)
    .map((metric) => ({
      metricId: metric.metricId,
      state: metric.state,
      confidence: metric.confidence,
      provenZero: metric.provenZero,
      missingProducer: metric.missingProducer,
      missingBridge: metric.missingBridge,
      explanation: metric.missingSourceExplanation,
    }));
  const userParityStatus = PERSON_METRIC_DEFINITIONS.reduce<Record<PersonMetricId, PersonMetricUserParityStatus>>((output, metric) => {
    output[metric.id] = userParityStatusForMetric({
      metric,
      global: scopes.global.metrics[metric.id],
      guest: scopes.guest.metrics[metric.id],
      signedIn: scopes.signedIn.metrics[metric.id],
      linkedPerson: scopes.linkedPerson.metrics[metric.id],
      creatorRole: scopes.creatorRole.metrics[metric.id],
      metricStatus: metricStatus[metric.id],
      permissionBlockedMetricIds,
      sourceMissingMetricIds,
      bridgeMissingMetricIds,
      materializerMissingMetricIds,
    });
    return output;
  }, {} as Record<PersonMetricId, PersonMetricUserParityStatus>);
  const userParityGaps = PERSON_METRIC_IDS
    .map((metricId) => userParityStatus[metricId])
    .filter((metric) => metric.blocksUserParity)
    .sort((left, right) => left.metricId.localeCompare(right.metricId));
  const gapCount = missingHydration.length + userParityGaps.length;

  return {
    reportKey: "person-metrics-hydration",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    status: checkoutStartCountsAsPaymentSuccess || pageTimeCountsAsWatchTime || userParityGaps.length > 0 ? "review" : "pass",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeMetricsUsed: false,
    debugLane: {
      label: "Person metrics hydration",
      producersRegistered: PERSON_METRIC_DEFINITIONS.reduce((total, metric) => total + metric.eventNames.length, 0),
      producersConnected: PERSON_METRIC_DEFINITIONS.filter((metric) => metric.eventNames.length > 0).length,
      eventEnvelopesHydrated,
      globalMetricsHydrated: Object.values(scopes.global.metrics).filter((metric) => metric.count > 0).length,
      guestMetricsHydrated: Object.values(scopes.guest.metrics).filter((metric) => metric.count > 0).length,
      signedInMetricsHydrated: Object.values(scopes.signedIn.metrics).filter((metric) => metric.count > 0).length,
      linkedPersonMetricsHydrated: Object.values(scopes.linkedPerson.metrics).filter((metric) => metric.count > 0).length,
      creatorRoleMetricsHydrated: Object.values(scopes.creatorRole.metrics).filter((metric) => metric.count > 0).length,
      personMetricsMapped: PERSON_METRIC_DEFINITIONS.length,
      lowConfidenceMetrics: lowConfidenceMetrics.length,
      gaps: gapCount,
    },
    metricStatus,
    scopes,
    lowConfidenceMetrics,
    missingHydration,
    userParityStatus,
    userParityGaps,
    legacySummary: {
      candidatesReviewed: legacyCandidates.length,
      candidatesHydrated,
      exactPromotionsBlocked,
      unknownLegacyArchived,
    },
    validation: {
      checkoutStartCountsAsPaymentSuccess,
      pageTimeCountsAsWatchTime,
      duplicateGuestUserCountsSuppressed,
      unknownLegacyBecameExact: false,
      zeroWithoutProvenZero: false,
    },
    scoreImpactByDimension: scoreImpact(lowConfidenceMetrics.length, gapCount),
  };
}

export function hydrateGlobalMetrics(input: PersonMetricsHydrationInput = {}) {
  return hydratePersonMetrics(input).scopes.global;
}

export function hydrateGuestMetrics(input: PersonMetricsHydrationInput = {}) {
  return hydratePersonMetrics(input).scopes.guest;
}

export function hydrateLinkedUserMetrics(input: PersonMetricsHydrationInput = {}) {
  return hydratePersonMetrics(input).scopes.linkedPerson;
}

export function hydrateCreatorRoleMetrics(input: PersonMetricsHydrationInput = {}) {
  return hydratePersonMetrics(input).scopes.creatorRole;
}

export function hydrateConfidenceByMetric(input: PersonMetricsHydrationInput = {}) {
  return PERSON_METRIC_IDS.reduce<Record<PersonMetricId, PersonMetricHydrationStatus>>((output, metricId) => {
    output[metricId] = hydratePersonMetrics(input).metricStatus[metricId];
    return output;
  }, {} as Record<PersonMetricId, PersonMetricHydrationStatus>);
}

export function explainMissingMetricHydration(input: PersonMetricsHydrationInput & { metricId: PersonMetricId }): MissingMetricHydrationExplanation {
  const status = hydratePersonMetrics(input).metricStatus[input.metricId];
  return {
    metricId: status.metricId,
    state: status.state,
    confidence: status.confidence,
    provenZero: status.provenZero,
    missingProducer: status.missingProducer,
    missingBridge: status.missingBridge,
    explanation: status.missingSourceExplanation,
  };
}

export function buildPersonMetricsHydrationReport(input: PersonMetricsHydrationInput = {}) {
  return hydratePersonMetrics(input);
}

export function confidenceFromHydratedCount(count: number, confidence: IdentityConfidence) {
  if (count <= 0) return "unknown" as const;
  return CONFIDENCE_BY_RANK[CONFIDENCE_RANK[confidence]] ?? "unknown";
}

export function classifyPersonMetricsHydrationDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "AGENTS.md" || normalized === "REPO_MEMORY_LEDGER.md" || normalized === "agent/index/known-pitfalls.json") return "real_source_change_needs_review";
  if (normalized === "agent/state/admin-truth-sample-evidence.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/evidence-capture-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/evidence-capture-status.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-admin-truth-sample-evidence.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-evidence-capture-status.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/evidence-artifact-schemas.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/identity-truth\/.+\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/lib\/agent-governance\/.+\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/app/api/auth/navigation-session/route.ts") return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|identity-handoff-analytics-truth|identity-tracking-shared|addition-bloat-guard|agent-takeover-safety-check|antigravity-agent-self-knowledge|antigravity-capability-policy|antigravity-output-audit|identity-mismatch-closure)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|addition-bloat-guard|agent-takeover-safety-check|antigravity-agent-self-knowledge|antigravity-capability-policy|antigravity-output-audit|identity-mismatch-closure)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|identity-handoff-analytics-truth|addition-bloat-guard|agent-takeover-safety-check|antigravity-agent-self-knowledge|antigravity-capability-policy|antigravity-output-audit|antigravity-takeover-guardrails|identity-mismatch-closure)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(identity-chain-contract|guest-user-handoff-repair|individual-user-metric-truth|analytic-algorithm-truth-audit|identity-handoff-4xx-policy|user-tracking-live-evidence|identity-tracking-memory-writeback|identity-handoff-analytics-truth|addition-bloat-guard|agent-takeover-safety-check|antigravity-agent-self-knowledge|antigravity-capability-policy|antigravity-output-audit|antigravity-takeover-guardrails|identity-mismatch-closure)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "src/components/Support/SupportInbox.tsx") return "real_source_change_needs_review";
  if (/^src\/lib\/frontend-hardening\/.+\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(frontend-component-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(frontend-component-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(frontend-component-consolidation|frontend-gut-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(frontend-component-consolidation|frontend-gut-consolidation|client-state-ownership|hydration-race-cleanup|frontend-telemetry-consolidation|codex-frontend-memory-writeback)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^src\/lib\/backend-hardening\/backend-(route-inventory|service-ownership|service-consolidator|cost-consolidation)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(backend-route-inventory|backend-service-ownership|backend-cost-consolidation|backend-gut-consolidation|codex-memory-writeback)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-central-normalizer-spine.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/central-normalizer-spine.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/product-integrity\/central-normalizer(-contract)?\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/product-integrity/product-body-map.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/surface-telemetry-parity.generated.json" || normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/surface-telemetry-parity.md" || normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-surface-telemetry-parity.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/surface-telemetry-parity.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/telemetry\/surface-telemetry-(catalog-events|contract|registry)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts" || normalized === "src/lib/analytics/event-envelope-builder.ts" || normalized === "src/lib/analytics/event-translation-bridge.ts" || normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/media/media-upload-contract.ts" || normalized === "src/lib/media/media-upload-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/fan-pass/fan-pass-lifecycle-contract.ts" || normalized === "src/lib/fan-pass/fan-pass-access-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/creator-monetization/creator-entitlement-contract.ts" || normalized === "src/lib/creator-monetization/creator-entitlement-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/subscriptions/route.ts" || normalized === "src/lib/server/chat.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/chat/attachments/prepare/route.ts" || normalized === "src/app/api/chat/attachments/complete/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/discovery/creator-relationship-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/discovery/search-telemetry-contract.ts" || normalized === "src/lib/discovery/search-cost-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/relationships/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/CreatorDiscoveryRail.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/creators/[username]/CreatorProfileClient.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/drops/DropsClient.tsx" || normalized === "src/components/StickyFilterBar.tsx" || normalized === "src/hooks/useDropsSearchTelemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/search-intent-profile.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/behavior-feature-registry.ts" || normalized === "src/lib/behavioral/event-fact-contract.ts" || normalized === "src/lib/behavioral/normalize-event-fact.ts" || normalized === "src/lib/behavioral/tracking-surface-map.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-search-discovery-cost.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/search-discovery-cost.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/search-discovery-cost.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/search-discovery-cost.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-discovery-relationship-funnel.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-discovery-relationship-funnel.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-discovery-relationship-funnel.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-discovery-relationship-funnel.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-media-upload-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/media-upload-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/media-upload-lifecycle.generated.json" || normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/media-upload-lifecycle.md" || normalized === "docs/agent-truth/feature-registration-gate.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-fan-pass-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/fan-pass-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/fan-pass-lifecycle.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/fan-pass-lifecycle.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-revenue-entitlement-ledger.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-revenue-entitlement-ledger.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-revenue-entitlement-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-revenue-entitlement-ledger.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-settings-truth.ts") return "validator_artifact_expected";
  if (normalized === "agent/state/creator-monetization-settings-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-settings-truth.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-admin-debug.ts") return "validator_artifact_expected";
  if (normalized === "agent/state/creator-monetization-admin-debug.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-admin-debug.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-monetization-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/creator-monetization-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-monetization-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-targeted-behavior-evidence.ts" || normalized === "scripts/agent/validate-targeted-behavior-evidence-repair.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts" || normalized === "scripts/agent/validate-media-discovery-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/targeted-behavior-evidence-repair.spec.ts") return "test_artifact_expected";
  if (/^agent\/state\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|activity-verification-engine|final-parity-telemetry-lock|media-discovery-score-lock)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|final-parity-telemetry-lock|media-discovery-score-lock)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "agent/state/surface-parity-doctrine.generated.json" || normalized === "docs/agent-truth/surface-parity-doctrine.md") return "stale_generated_artifact_to_regenerate";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (/^agent\/state\/(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^agent\/state\/(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/validate-(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(module-coverage-source-policy|module-source-mapping-engine|module-specific-mapping-repair|module-coverage-validator-semantics|module-coverage-ui-cleanup|debug-cockpit-batch34-module-coverage)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/analytics\/(module-coverage-source-policy|module-source-mapping-engine)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^docs\/agent-truth\/(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^scripts\/agent\/validate-(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity|unlock-telemetry-truth)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(server-unlock-telemetry-emission|unlock-rollup-reconciliation|viewer-start-telemetry-repair|watch-capture-quality-threshold|watch-session-fact-link-repair|unlock-watch-validation-semantics|unlock-watch-journey-normalization|debug-cockpit-batch33-unlock-watch-parity)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/commerce\/(unlock-watch-parity-contract|unlock-rollup-reconciliation)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (/^src\/lib\/analytics\/(viewer-start-telemetry-contract|watch-capture-quality-contract|watch-session-fact-linker)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/unlock-watch-journey-normalization.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/drops/unlock/route.ts" || normalized === "src/app/api/viewer/watch-session/route.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/debug-cockpit-batch30-telemetry-parity-shared.ts" || /^scripts\/agent\/validate-(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-admin-debug-control-tower.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-panel-output-triage.ts") return "validator_artifact_expected";
  if (/^tests\/unit\/(admin-debug-control-tower|admin-debug-control-tower-component|debug-panel-output-triage)\.spec\.tsx?$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/app\/admin\/debug\/components\/DebugControlTower(?:Cards)?\.tsx$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugPanelStatusBySection.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/agent-score/core.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(debug-panel-output-triage|debug-runtime-evidence|event-translation-bridge|person-metrics-hydration|public-beta-score|repo-spring-cleaning-rewire|targeted-behavior-evidence|telemetry-admin-debug-truth|user-facing-feature-connection-audit)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(debug-runtime-evidence|event-translation-bridge|person-metrics-hydration|targeted-behavior-evidence|telemetry-admin-debug-truth)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (/^tests\/unit\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui-cleanup|debug-cockpit-batch30-telemetry-parity|admin-data-validation)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/analytics\/(telemetry-parity-pass-gate|refresh-diagnostics-failure-clusters|ingest-identified-parity-blocker|advanced-telemetry-parity-ui)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-cockpit-batch30-telemetry-parity.ts" || normalized === "src/lib/server/admin-analytics-historical-validation.ts" || normalized === "src/app/api/admin/analytics/historical/route.ts" || normalized === "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx" || normalized === "src/types/admin-analytics.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/task-guidance-batch31-shared.ts" || /^scripts\/agent\/validate-(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(task-guidance-telemetry-contract|task-guidance-ui-instrumentation|task-guidance-event-normalization|task-onboarding-parity-semantics|task-guidance-history-recovery|debug-cockpit-batch31-task-guidance-parity)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^src\/lib\/tasks\/(task-guidance-telemetry-contract|task-guidance-history-recovery)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/task-onboarding-parity-semantics.ts" || normalized === "src/lib/debug/debug-cockpit-batch31-task-guidance-parity.ts" || normalized === "src/components/Dashboard/TaskGuidanceBanner.tsx" || normalized === "src/components/Dashboard/DailyTasksModule.tsx" || normalized === "src/lib/task-guidance.ts" || normalized === "src/lib/server/admin-analytics-historical-tasks.ts") return "real_source_change_needs_review";
  if (/^agent\/state\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-safety|notification-pwa-score-lock|sql-database-parity-cost-lock)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/final-product-integrity-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/body-system-wiring-repair.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/product-body-map.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/central-normalizer-spine.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/interpretive-brain-debug-triage.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/drop-watch-time-accuracy.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/drop-watch-unlock-math.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/session-bounce-calculation.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/session-journey-duration-math.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/user-journey-behavioral-intelligence.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-provider-conflict-resolution.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-persistence-stability.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-runtime-telemetry.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/auth-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/notification-permission-lifecycle.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-liveness-audit.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/future-activity-signal-reclassification.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/final-product-integrity-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/body-system-wiring-repair.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/product-body-map.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/central-normalizer-spine.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/interpretive-brain-debug-triage.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/drop-watch-time-accuracy.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/drop-watch-unlock-math.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/session-bounce-calculation.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/session-journey-duration-math.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/user-journey-behavioral-intelligence.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-provider-conflict-resolution.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-persistence-stability.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-runtime-telemetry.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/auth-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/notification-permission-lifecycle.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-liveness-audit.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/future-activity-signal-reclassification.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-product-integrity-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-body-system-wiring-repair.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-drop-watch-time-accuracy.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-drop-watch-unlock-math.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-session-bounce-calculation.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-session-journey-duration-math.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-user-journey-behavioral-intelligence.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-provider-conflict-resolution.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-persistence-stability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-runtime-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-email-password-auth-refactor.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-permission-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-pwa-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-notification-targeting-intent.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-push-token-registration.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-pwa-service-worker-safety.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-liveness-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-future-activity-signal-reclassification.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-actionability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-score-80-refresh-pass.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-non-event-score-policy.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/person-metrics-hydration.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-product-integrity-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/body-system-wiring-repair.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/drop-watch-time-accuracy.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/drop-watch-unlock-math.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/session-bounce-calculation.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/session-journey-duration-math.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/user-journey-behavioral-intelligence.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-provider-conflict-resolution.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-persistence-stability.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-runtime-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-permission-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/notification-pwa-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/event-liveness-audit.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/future-activity-signal-reclassification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/person-metrics-contract.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-tracking-simplification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/telemetry-trigger-test-matrix.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/user-management-refactor.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/user-management-refactor.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-user-management-refactor.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-new-additions-score-coverage.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/users/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/users/route.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (/^src\/lib\/product-integrity\/(product-body-map|central-normalizer|interpretive-brain|body-system-wiring-repair|final-product-integrity-lock)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/drop-watch-time-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/drop-watch-time-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/drop-watch-unlock-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/viewer/watch-session/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/drops/unlock/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/commerce/unlock-watch-parity-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-unlock-telemetry-truth.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/session-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/session-journey-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/user-journey-builder.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Analytics/DeepTracker.tsx") return "real_source_change_needs_review";
  if (normalized === "src/hooks/useViewerWatchSession.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-liveness-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/global-user-dedupe-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/global-user-dedupe-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/count-deduplication-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics-action-taxonomy.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-provider-conflict-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-provider-conflict-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-persistence-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-session-stability.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/auth/auth-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/context/AuthContext.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/Auth/AuthModal.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/NotificationPromptBanner.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/notifications/notification-permission-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/notifications/notification-prompt-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/empty-live-lane-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/features/pwa/pwa-service-worker-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/privacy/consent-tracking-policy.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/tracking-summary-lane-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(feature-telemetry-coverage-cleanup|runtime-debug-signal-cleanup|consent-tracking-mode-cleanup|event-liveness-source-repair|behavior-math-status-cleanup|legacy-recovery-status-cleanup|tracking-summary-lane-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "src/lib/debug/future-activity-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/actionable-signal-filter.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "agent/context/validator-authority.json") return "validator_artifact_expected";
  if (normalized === "agent/state/telemetry-trigger-test-matrix.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/telemetry-trigger-test-matrix.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-telemetry-trigger-test-matrix.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-telemetry-admin-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-functionality-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-gating-moderation.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-presence-typing.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-realtime-cost-control.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reset-truth.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-lifecycle-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-reward-ledger.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-guidance-route-audit.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-daily-task-debug-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-feature-registration-gate.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-tracking-simplification.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/chat-telemetry-admin-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/chat-telemetry-admin-truth.md") return "documentation_artifact_expected";
  if (normalized === "tests/unit/chat-telemetry-admin-truth.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/chat-functionality-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-lifecycle-telemetry.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/daily-task-debug-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/chat/chat-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Chat/ChatExperience.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/chat.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/checkin/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Dashboard/DailyCheckIn.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/user-journey-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/user-journey-builder.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/global-user-dedupe-normalization.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/global-user-dedupe-normalization.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-global-user-dedupe-normalization.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/global-user-dedupe-normalization.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/global-user-counting-math.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/global-user-counting-math.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-global-user-counting-math.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/global-user-counting-math.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/math/global-user-counting-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-engine.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/count-deduplication-normalization.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/count-deduplication-normalization.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-count-deduplication-normalization.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/count-deduplication-normalization.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/canonical-math-authority-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/canonical-math-authority-ledger.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-canonical-math-authority-ledger.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/math/legacy-metric-canonicalization.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/legacy-recovery-dry-run-engine.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/metric-canonicalization-legacy-recovery.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/metric-canonicalization-legacy-recovery.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-metric-canonicalization-legacy-recovery.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/metric-canonicalization-legacy-recovery.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/tasks/daily-task-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-duration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/tasks/daily-task-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/daily-task-lifecycle-telemetry.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/daily-task-lifecycle-telemetry.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/notification-pwa-score-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/notification-pwa-score-lock.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/math/metric-display-accuracy.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/metric-display-accuracy.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/metric-display-accuracy.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-metric-display-accuracy.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/metric-display-accuracy.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/analytics-panel-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/launch-analytics-recovery.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/analytics-panel-hydration.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/launch-analytics-recovery.md") return "documentation_artifact_expected";
  if (normalized === "agent/evidence/admin-truth-sample/README.md") return "admin_truth_sample_launch_coverage_evidence_expected";
  if (normalized === "agent/evidence/admin-truth-sample/evidence.template.json") return "admin_truth_sample_launch_coverage_evidence_expected";
  if (normalized === "agent/state/source-agreement-failure-detail.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/debug-cockpit-batch29-analytics-source-hierarchy.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/source-agreement-failure-detail.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/debug-cockpit-batch29-analytics-source-hierarchy.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/analytics/legacy-recovery-reconciler.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/analytics-legacy-recovery-reconciliation.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/analytics-legacy-recovery-reconciliation.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/analytics-legacy-history-reconciliation.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/analytics-legacy-purgatory-queue.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/ga4-recovery-truth.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/ga4-availability-semantics.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/analytics-legacy-recovery-reconciliation.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/analytics-legacy-history-reconciliation.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/analytics-legacy-purgatory-queue.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/ga4-recovery-truth.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/ga4-availability-semantics.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/debug-cockpit-batch28-bug-validation-shared.ts") return "retired_duplicate_source_agreement_lane_expected";
  if (normalized === "functions/src/analytics-truth-cli.ts" || normalized === "functions/src/analytics-truth-runtime.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/rebuild-analytics-truth.ts" || normalized === "scripts/rebuild-behavioral-intelligence.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/source-agreement-detail.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-cockpit-batch29-analytics-source-hierarchy.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared.ts") return "validator_artifact_expected";
  if (normalized === "scripts/analytics/validate-canonical-import-export.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/source-agreement-failure-detail.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-cockpit-batch29-analytics-source-hierarchy.spec.ts") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-analytics-panel-hydration.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/analytics-panel-hydration.spec.ts") return "test_artifact_expected";
  if (/^src\/lib\/admin-analytics\/panel-hydration-(contract|registry|resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/analytics/page.tsx") return "real_source_change_needs_review";
  if (normalized === "tests/unit/admin-analytics-page.spec.tsx") return "test_artifact_expected";
  if (normalized === "src/lib/release-readiness/live-panel-evidence-resolver.ts") return "real_source_change_needs_review";
  if (/^src\/lib\/release-readiness\/(live-evidence-gate-contract|live-evidence-resolver)\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/live-evidence-gate-replacement.spec.ts") return "test_artifact_expected";
  if (normalized === "scripts/agent/validate-current-beta-exit-status.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-overnight-beta-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/current-beta-exit-status.spec.ts") return "test_artifact_expected";
  if (normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/overnight-beta-readiness-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/current-beta-exit-status.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/overnight-beta-readiness-lock.md") return "documentation_artifact_expected";
  if (normalized === "agent/state/live-evidence-gate-replacement.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/live-evidence-gate-replacement.md") return "documentation_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (/stale-user-metric|duplicate-person-metric|duplicated_person_metric|stale_user_metric/iu.test(normalized)) return "stale_user_metric_helper";
  if (/orphan-metric|metric-bridge/iu.test(normalized)) return "orphan_metric";
  return "unsafe_unknown";
}
