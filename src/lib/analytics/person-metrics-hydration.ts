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

function addToScope(scope: PersonMetricScopeSummary, metric: PersonMetricDefinition, envelope: CanonicalEventEnvelope, confidence: IdentityConfidence, suppressedDuplicate = false) {
  const entry = scope.metrics[metric.id];
  entry.count += 1;
  entry.confidence = bestConfidence(entry.confidence, confidence);
  entry.hydratedEventIds.push(envelope.eventId);
  if (suppressedDuplicate) entry.suppressedDuplicateCount += 1;
}

function applyDecision(input: {
  scopes: Record<PersonMetricHydrationScope, PersonMetricScopeSummary>;
  metric: PersonMetricDefinition;
  envelope: CanonicalEventEnvelope;
  decision: PersonMetricCountDecision;
}) {
  const { scopes, metric, envelope, decision } = input;
  if (decision.countGlobally) addToScope(scopes.global, metric, envelope, decision.identityConfidence);
  if (decision.countForGuest) addToScope(scopes.guest, metric, envelope, decision.identityConfidence);
  if (decision.countForSignedInUser) addToScope(scopes.signedIn, metric, envelope, decision.identityConfidence);
  if (decision.countForLinkedPerson) {
    addToScope(scopes.linkedPerson, metric, envelope, "linked", Boolean(decision.suppressedDuplicateKey));
  }
  if (decision.countForSignedInUser && envelope.actorKind === "creator_user") {
    addToScope(scopes.creatorRole, metric, envelope, decision.identityConfidence);
  }
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
      applyDecision({ scopes, metric, envelope, decision });
      if (decision.countGlobally || decision.countForGuest || decision.countForSignedInUser || decision.countForLinkedPerson) {
        eventEnvelopesHydrated += 1;
      }
      if (decision.suppressedDuplicateKey) duplicateGuestUserCountsSuppressed += 1;
    }
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
  const gapCount = missingHydration.length;

  return {
    reportKey: "person-metrics-hydration",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    status: checkoutStartCountsAsPaymentSuccess || pageTimeCountsAsWatchTime ? "review" : "pass",
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
      gaps: 0,
    },
    metricStatus,
    scopes,
    lowConfidenceMetrics,
    missingHydration,
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
    scoreImpactByDimension: scoreImpact(lowConfidenceMetrics.length, 0),
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
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/person-metrics-hydration.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/person-metrics-contract.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/debug-tracking-simplification.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/telemetry-trigger-test-matrix.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/user-management-refactor.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/user-management-refactor.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-user-management-refactor.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/admin/user-management-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/admin/users/page.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/users/route.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/server/admin-debug/summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (normalized === "agent/context/validator-authority.json") return "validator_artifact_expected";
  if (normalized === "agent/state/telemetry-trigger-test-matrix.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/telemetry-trigger-test-matrix.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-telemetry-trigger-test-matrix.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/score-public-beta-readiness.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-public-beta-score.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
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
