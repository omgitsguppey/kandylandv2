import type { ActorKind, IdentityConfidence, IdentityState } from "@/lib/analytics/identity-handoff-contract";
import type { CanonicalEventEnvelope, EventEnvelopeMetadata } from "@/lib/analytics/event-envelope-contract";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";
import {
  calculateCreatorRoleCountDecision,
  calculateGlobalCountDecision,
  calculateGuestCountDecision,
  calculateLinkedPersonCountDecision,
  calculateSignedInCountDecision,
  suppressDuplicateLinkedAction,
  type GlobalUserScopeCountDecision,
} from "@/lib/math/global-user-counting-math";

import {
  getPersonMetricDefinition,
  type PersonMetricDefinition,
  type PersonMetricId,
} from "./person-metrics-contract";

export interface PersonMetricEventInput extends Partial<CanonicalEventEnvelope> {
  metricId: PersonMetricId;
  eventName: string;
  eventId: string;
  userId?: string | null;
  actorKind: ActorKind;
  identityState: IdentityState;
  identityConfidence: IdentityConfidence;
  consentMode: ConsentMode;
  sessionId: string;
  legacyUnknown?: boolean | null;
}

export interface PersonMetricCandidate {
  metricId: PersonMetricId;
  eventName: string;
  eventId: string;
  actorKind: ActorKind;
  identityState: IdentityState;
  identityConfidence: IdentityConfidence;
  consentMode: ConsentMode;
  sessionId: string;
  timestamp: string;
  featureId: string;
  surface: string;
  includeInUserBehavior: boolean;
  guestId: string | null;
  userId: string | null;
  linkId: string | null;
  dedupeKey: string;
  metadata: EventEnvelopeMetadata;
  metric: PersonMetricDefinition;
  legacyUnknown: boolean;
}

export interface PersonMetricCountDecision {
  metricId: PersonMetricId;
  eventId: string;
  identityConfidence: IdentityConfidence;
  countGlobally: boolean;
  countForGuest: boolean;
  countForSignedInUser: boolean;
  countForLinkedPerson: boolean;
  suppressedDuplicateKey: string | null;
  scopeDecisions: {
    global: GlobalUserScopeCountDecision;
    guest: GlobalUserScopeCountDecision;
    signedIn: GlobalUserScopeCountDecision;
    linkedPerson: GlobalUserScopeCountDecision;
    creatorRole: GlobalUserScopeCountDecision;
  };
  explanation: string;
  blockedReason:
    | "none"
    | "metric_unknown"
    | "consent_blocks_metric"
    | "consent_blocks_behavioral_metric"
    | "identity_confidence_too_low"
    | "legacy_unknown_not_exact_person"
    | "user_behavior_excluded"
    | "admin_projection_excluded"
    | "system_excluded"
    | "payment_provider_fingerprint_required"
    | "task_reset_window_required";
}

const FORBIDDEN_METADATA_KEYS = [
  "providerPayload",
  "paypalOrderId",
  "paypalCaptureId",
  "rawPaymentId",
  "paymentProviderPayload",
  "token",
  "accessToken",
  "refreshToken",
  "email",
  "phone",
  "messageText",
  "rawPrompt",
  "mediaUrl",
] as const;

const CONFIDENCE_RANK: Record<IdentityConfidence, number> = {
  unknown: 0,
  weak: 1,
  inferred: 2,
  linked: 3,
  exact: 4,
};

function userIdFromInput(input: PersonMetricEventInput) {
  if (input.userRef?.kind === "user" && input.userRef.id) return input.userRef.id;
  return typeof input.userId === "string" ? input.userId : null;
}

function confidenceAtLeast(actual: IdentityConfidence, minimum: IdentityConfidence) {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[minimum];
}

function consentAllowsMetric(metric: PersonMetricDefinition, consentMode: ConsentMode) {
  return metric.consentEligibility.allowedModes.includes(consentMode);
}

export function stripPersonMetricForbiddenMetadata(metadata: Record<string, unknown> | null | undefined): EventEnvelopeMetadata {
  const output: EventEnvelopeMetadata = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (FORBIDDEN_METADATA_KEYS.some((forbiddenKey) => forbiddenKey.toLowerCase() === key.toLowerCase())) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      output[key] = value;
    }
  }
  return output;
}

export function buildPersonMetricCandidate(input: PersonMetricEventInput): PersonMetricCandidate {
  const metric = getPersonMetricDefinition(input.metricId);
  if (!metric) {
    throw new Error(`Unknown person metric: ${input.metricId}`);
  }
  const guestId = typeof input.guestId === "string" ? input.guestId : null;
  const userId = userIdFromInput(input);
  const linkId = typeof input.linkId === "string" ? input.linkId : null;
  return {
    metricId: input.metricId,
    eventName: input.eventName,
    eventId: input.eventId,
    actorKind: input.actorKind,
    identityState: input.identityState,
    identityConfidence: input.identityConfidence,
    consentMode: input.consentMode,
    sessionId: input.sessionId,
    timestamp: input.timestamp ?? new Date(0).toISOString(),
    featureId: input.featureId ?? "unknown_feature",
    surface: input.surface ?? "unknown_surface",
    includeInUserBehavior: input.includeInUserBehavior !== false,
    guestId,
    userId,
    linkId,
    dedupeKey: [
      input.metricId,
      input.eventName,
      input.eventId,
      linkId || userId || guestId || input.sessionId,
    ].join(":"),
    metadata: stripPersonMetricForbiddenMetadata(input.metadata),
    metric,
    legacyUnknown: input.legacyUnknown === true || input.identityState === "legacy_unknown" || input.actorKind === "legacy_unknown",
  };
}

export function shouldCountPersonMetricEvent(candidate: PersonMetricCandidate): PersonMetricCountDecision {
  const globallyEligible = consentAllowsMetric(candidate.metric, candidate.consentMode)
    || candidate.legacyUnknown;

  const baseDecision = {
    metricId: candidate.metricId,
    eventId: candidate.eventId,
    identityConfidence: candidate.identityConfidence,
    countGlobally: globallyEligible,
    countForGuest: false,
    countForSignedInUser: false,
    countForLinkedPerson: false,
    suppressedDuplicateKey: null,
    scopeDecisions: scopeDecisionsFor(candidate),
    explanation: "",
  } satisfies Omit<PersonMetricCountDecision, "blockedReason">;

  if (candidate.actorKind === "admin_projection") {
    return withExplanation({ ...baseDecision, countGlobally: false, blockedReason: "admin_projection_excluded" });
  }
  if (candidate.actorKind === "system") {
    return withExplanation({ ...baseDecision, countGlobally: false, blockedReason: "system_excluded" });
  }
  if (candidate.includeInUserBehavior === false) {
    return withExplanation({ ...baseDecision, countGlobally: false, blockedReason: "user_behavior_excluded" });
  }
  if (candidate.legacyUnknown) {
    const global = baseDecision.scopeDecisions.global;
    return withExplanation({
      ...baseDecision,
      countGlobally: global.count,
      blockedReason: "legacy_unknown_not_exact_person",
    });
  }
  if (!consentAllowsMetric(candidate.metric, candidate.consentMode)) {
    return withExplanation({
      ...baseDecision,
      countGlobally: candidate.metric.consentEligibility.depth === "behavioral" ? true : false,
      blockedReason: candidate.metric.consentEligibility.depth === "behavioral"
        ? "consent_blocks_behavioral_metric"
        : "consent_blocks_metric",
    });
  }
  if (!confidenceAtLeast(candidate.identityConfidence, candidate.metric.identityConfidence.minimum)) {
    return withExplanation({ ...baseDecision, blockedReason: "identity_confidence_too_low" });
  }

  const decisions = baseDecision.scopeDecisions;
  const blockedReason = decisions.global.reason === "payment_provider_fingerprint_required"
    ? "payment_provider_fingerprint_required"
    : decisions.global.reason === "task_reset_window_required"
      ? "task_reset_window_required"
      : "none";
  return withExplanation({
    ...baseDecision,
    countGlobally: decisions.global.count,
    countForGuest: candidate.metric.aggregation.guest.enabled && decisions.guest.count,
    countForSignedInUser: candidate.metric.aggregation.signedIn.enabled && decisions.signedIn.count,
    countForLinkedPerson: candidate.metric.aggregation.linkedPerson.enabled && decisions.linkedPerson.count,
    suppressedDuplicateKey: suppressDuplicateLinkedAction(candidate).suppressedDuplicateKey,
    blockedReason,
  });
}

function scopeInput(candidate: PersonMetricCandidate) {
  const metadata = candidate.metadata;
  const stringMeta = (key: string) => typeof metadata[key] === "string" ? metadata[key] as string : null;
  return {
    eventName: candidate.eventName,
    eventId: candidate.eventId,
    actorKind: candidate.actorKind,
    identityState: candidate.identityState,
    identityConfidence: candidate.identityConfidence,
    userId: candidate.userId,
    guestId: candidate.guestId,
    linkId: candidate.linkId,
    sessionId: candidate.sessionId,
    surface: candidate.surface,
    featureId: candidate.featureId,
    timestamp: candidate.timestamp,
    objectId: stringMeta("objectId") ?? stringMeta("dropId") ?? stringMeta("creatorId") ?? stringMeta("messageId") ?? stringMeta("taskId"),
    idempotencyKey: stringMeta("idempotencyKey"),
    providerOrderId: stringMeta("providerOrderId") ?? stringMeta("paypalOrderId"),
    providerPaymentId: stringMeta("providerPaymentId") ?? stringMeta("paypalCaptureId"),
    orderId: stringMeta("orderId"),
    dropId: stringMeta("dropId"),
    unlockId: stringMeta("unlockId"),
    watchSessionId: stringMeta("watchSessionId"),
    messageId: stringMeta("messageId"),
    taskId: stringMeta("taskId"),
    resetWindowId: stringMeta("resetWindowId"),
    intentId: stringMeta("intentId"),
    recipientId: stringMeta("recipientId"),
    roles: candidate.actorKind === "creator_user" ? ["creator"] : [],
    legacyUnknown: candidate.legacyUnknown,
    replayOfEventId: stringMeta("replayOfEventId"),
    retryAttempt: typeof metadata.retryAttempt === "number" ? metadata.retryAttempt : null,
  };
}

function scopeDecisionsFor(candidate: PersonMetricCandidate): PersonMetricCountDecision["scopeDecisions"] {
  const input = scopeInput(candidate);
  return {
    global: calculateGlobalCountDecision(input),
    guest: calculateGuestCountDecision(input),
    signedIn: calculateSignedInCountDecision(input),
    linkedPerson: calculateLinkedPersonCountDecision(input),
    creatorRole: calculateCreatorRoleCountDecision(input),
  };
}

function withExplanation(decision: PersonMetricCountDecision): PersonMetricCountDecision {
  return {
    ...decision,
    explanation: [
      decision.scopeDecisions.global.explanation,
      decision.scopeDecisions.guest.explanation,
      decision.scopeDecisions.signedIn.explanation,
      decision.scopeDecisions.linkedPerson.explanation,
      decision.scopeDecisions.creatorRole.explanation,
    ].join(" "),
  };
}
