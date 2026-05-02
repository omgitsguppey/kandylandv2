export const ANALYTICS_EVENT_SCHEMA_VERSION = "analytics_event_v2";
export const ANALYTICS_EVENT_CONTRACT_VERSION = 2;
export const IDENTITY_LINKED_EVENT_NAME = "identity_linked";

export const ANALYTICS_ACTOR_TYPES = ["guest", "user", "creator", "admin", "owner_admin", "system", "unknown"] as const;
export type AnalyticsActorType = (typeof ANALYTICS_ACTOR_TYPES)[number];

export const ANALYTICS_ACTOR_LANES = [
  "guest",
  "anonymous_visitor",
  "session",
  "user",
  "creator",
  "admin",
  "owner_admin",
  "system",
  "unknown",
] as const;
export type AnalyticsActorLane = (typeof ANALYTICS_ACTOR_LANES)[number];

export const ANALYTICS_EVENT_SOURCE_LANES = [
  "client",
  "server",
  "backend",
  "canonical",
  "guest_batch",
  "identified_ingest",
  "firestore",
  "rtdb",
  "ga4_daily",
  "ga4_intraday",
  "bigquery_daily",
  "bigquery_intraday",
  "hot_cache",
  "legacy_firestore",
  "legacy_rtdb",
  "legacy_ga4",
  "system_job",
  "service_worker",
  "debug_validation",
  "unknown",
] as const;
export type AnalyticsEventSourceLane = (typeof ANALYTICS_EVENT_SOURCE_LANES)[number];

export const ANALYTICS_CONSENT_STATES = ["granted", "denied", "partial", "unknown", "not_required"] as const;
export type AnalyticsConsentState = (typeof ANALYTICS_CONSENT_STATES)[number];

export const ANALYTICS_OBJECT_TYPES = [
  "page",
  "drop",
  "viewer_asset",
  "viewer_session",
  "task",
  "notification",
  "purchase",
  "unlock",
  "onboarding",
  "wallet",
  "checkout",
  "creator_profile",
  "chat",
  "session",
  "identity",
  "admin",
  "system",
  "unknown",
] as const;
export type AnalyticsObjectType = (typeof ANALYTICS_OBJECT_TYPES)[number];

export const LEGACY_MAPPING_CONFIDENCE_LEVELS = ["high", "medium", "low", "directional", "unknown"] as const;
export type LegacyMappingConfidence = (typeof LEGACY_MAPPING_CONFIDENCE_LEVELS)[number];

export interface CanonicalAnalyticsEvent {
  eventId: string;
  eventName: string;
  eventVersion: number;
  occurredAt: string;
  receivedAt: string;
  actorType: AnalyticsActorType;
  anonymousVisitorId: string | null;
  sessionId: string | null;
  userId: string | null;
  creatorId: string | null;
  adminId: string | null;
  surface: string | null;
  route: string | null;
  component: string | null;
  objectType: AnalyticsObjectType | string | null;
  objectId: string | null;
  source: AnalyticsEventSourceLane;
  consentState: AnalyticsConsentState;
  dedupeKey: string;
  schemaVersion: string;
  legacySource: string | null;
  legacyId: string | null;
  legacyConfidence: LegacyMappingConfidence | null;
  mappingWarnings: string[];
  payload?: Record<string, unknown>;
}

export interface AnalyticsIdentityLinkPayload extends Record<string, unknown> {
  anonymousVisitorId: string;
  sessionId: string;
  userId: string;
  linkedAt: string;
  method: "login" | "signup" | "session_restore" | "admin_link" | "import" | "unknown";
  eligiblePastSessionIds: string[];
  source: AnalyticsEventSourceLane;
  confidence: LegacyMappingConfidence;
}

export type CanonicalIdentityLinkedEvent = CanonicalAnalyticsEvent & {
  eventName: typeof IDENTITY_LINKED_EVENT_NAME;
  objectType: "identity";
  actorType: "user";
  anonymousVisitorId: string;
  sessionId: string;
  userId: string;
  payload: AnalyticsIdentityLinkPayload;
};

export interface AnalyticsActorClassificationInput {
  actorType?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  creatorId?: string | null;
  adminId?: string | null;
  route?: string | null;
  surface?: string | null;
  source?: string | null;
  eventName?: string | null;
  roles?: string[] | null;
  claims?: Record<string, unknown> | null;
  systemGenerated?: boolean | null;
}

export interface AnalyticsActorClassification {
  actorType: AnalyticsActorType;
  actorLane: AnalyticsActorLane;
  isAuthenticatedUser: boolean;
  isGuestLike: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isSystem: boolean;
  isUnknown: boolean;
  identityLinkRequired: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

export interface AnalyticsInclusionExplanation {
  actorClassification: AnalyticsActorClassification;
  includeInUserBehavior: boolean;
  includeInAdminAnalytics: boolean;
  includeInGlobalEvents: boolean;
  exclusionReason: string | null;
  globalEventsPreserveActorClassification: true;
}

export interface AnalyticsEventDebugMetadata {
  eventId: string;
  eventName: string;
  actorClassification: AnalyticsActorClassification;
  sourceLane: AnalyticsEventSourceLane;
  guestUserAdminSeparation: {
    guestOrAnonymous: boolean;
    authenticatedUser: boolean;
    creator: boolean;
    admin: boolean;
    system: boolean;
    unknown: boolean;
  };
  legacyMappingConfidence: LegacyMappingConfidence | null;
  exclusionReason: string | null;
  dedupeKey: string;
  identityLinkageState: "identity_link_event" | "linked_with_lineage" | "guest_or_anonymous" | "unlinked_user" | "not_applicable";
  fakeZeroPrevention: {
    fakeZeroPrevented: boolean;
    rule: string;
  };
}

export interface CanonicalAnalyticsEventInput
  extends Omit<
    Partial<CanonicalAnalyticsEvent>,
    "schemaVersion" | "actorType" | "source" | "consentState" | "mappingWarnings"
  > {
  eventId: string;
  eventName: string;
  actorType?: string | null;
  source?: string | null;
  consentState?: string | null;
  mappingWarnings?: Array<string | null | undefined>;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function normalizeAnalyticsActorType(value: unknown): AnalyticsActorType {
  return isOneOf(value, ANALYTICS_ACTOR_TYPES) ? value : "unknown";
}

export function normalizeAnalyticsSourceLane(value: unknown): AnalyticsEventSourceLane {
  return isOneOf(value, ANALYTICS_EVENT_SOURCE_LANES) ? value : "unknown";
}

export function normalizeAnalyticsConsentState(value: unknown): AnalyticsConsentState {
  return isOneOf(value, ANALYTICS_CONSENT_STATES) ? value : "unknown";
}

export function normalizeLegacyMappingConfidence(value: unknown): LegacyMappingConfidence {
  return isOneOf(value, LEGACY_MAPPING_CONFIDENCE_LEVELS) ? value : "unknown";
}

export function classifyAnalyticsActor(input: AnalyticsActorClassificationInput): AnalyticsActorClassification {
  const explicitActorType = normalizeAnalyticsActorType(input.actorType);
  const roles = Array.isArray(input.roles) ? input.roles.map((role) => role.toLowerCase()) : [];
  const claims = input.claims ?? {};
  const route = stringOrNull(input.route)?.toLowerCase() ?? "";
  const source = stringOrNull(input.source);
  const eventName = stringOrNull(input.eventName)?.toLowerCase() ?? "";
  const reasons: string[] = [];

  const hasAdminRole =
    roles.some((role) => role === "admin" || role === "owner" || role === "owner_admin" || role === "super_admin") ||
    claims.admin === true ||
    claims.owner === true;

  const isSystem =
    explicitActorType === "system" ||
    input.systemGenerated === true ||
    source === "system_job" ||
    eventName.startsWith("system_");

  if (isSystem) {
    reasons.push("System source, system actor type, or system event name is present.");
    return {
      actorType: "system",
      actorLane: "system",
      isAuthenticatedUser: false,
      isGuestLike: false,
      isAdmin: false,
      isCreator: false,
      isSystem: true,
      isUnknown: false,
      identityLinkRequired: false,
      confidence: "high",
      reasons,
    };
  }

  const isOwnerAdmin =
    explicitActorType === "owner_admin" ||
    roles.some((role) => role === "owner" || role === "owner_admin" || role === "super_admin") ||
    claims.owner === true;

  if (isOwnerAdmin) {
    reasons.push("Owner admin role, claim, or explicit owner admin actor type is present.");
    if (stringOrNull(input.userId)) {
      reasons.push("A userId is present, but owner admin classification wins and must not be counted as user behavior.");
    }
    return {
      actorType: "owner_admin",
      actorLane: "owner_admin",
      isAuthenticatedUser: false,
      isGuestLike: false,
      isAdmin: true,
      isCreator: false,
      isSystem: false,
      isUnknown: false,
      identityLinkRequired: false,
      confidence: "high",
      reasons,
    };
  }

  const isAdmin =
    explicitActorType === "admin" ||
    Boolean(stringOrNull(input.adminId)) ||
    hasAdminRole ||
    route === "/admin" ||
    route.startsWith("/admin/") ||
    eventName.startsWith("admin_");

  if (isAdmin) {
    reasons.push("Admin id, role, route, event name, or explicit actor type is present.");
    if (stringOrNull(input.userId)) {
      reasons.push("A userId is present, but admin classification wins and must not be counted as user behavior.");
    }
    return {
      actorType: "admin",
      actorLane: "admin",
      isAuthenticatedUser: false,
      isGuestLike: false,
      isAdmin: true,
      isCreator: false,
      isSystem: false,
      isUnknown: false,
      identityLinkRequired: false,
      confidence: "high",
      reasons,
    };
  }

  const isCreator = explicitActorType === "creator" || Boolean(stringOrNull(input.creatorId)) || roles.includes("creator");
  if (isCreator) {
    reasons.push("Creator id, creator role, or explicit creator actor type is present.");
    return {
      actorType: "creator",
      actorLane: "creator",
      isAuthenticatedUser: false,
      isGuestLike: false,
      isAdmin: false,
      isCreator: true,
      isSystem: false,
      isUnknown: false,
      identityLinkRequired: Boolean(stringOrNull(input.anonymousVisitorId)),
      confidence: "high",
      reasons,
    };
  }

  if (explicitActorType === "user" || stringOrNull(input.userId)) {
    reasons.push("Authenticated user id or explicit user actor type is present.");
    if (stringOrNull(input.anonymousVisitorId) || stringOrNull(input.sessionId)) {
      reasons.push("Guest/session lineage is present; merge requires an identity_linked event and must preserve guest history.");
    }
    return {
      actorType: "user",
      actorLane: "user",
      isAuthenticatedUser: true,
      isGuestLike: false,
      isAdmin: false,
      isCreator: false,
      isSystem: false,
      isUnknown: false,
      identityLinkRequired: Boolean(stringOrNull(input.anonymousVisitorId)),
      confidence: "high",
      reasons,
    };
  }

  if (explicitActorType === "guest" || stringOrNull(input.anonymousVisitorId) || stringOrNull(input.sessionId)) {
    const hasAnonymousVisitorId = Boolean(stringOrNull(input.anonymousVisitorId));
    const hasSessionId = Boolean(stringOrNull(input.sessionId));
    reasons.push("Anonymous visitor id, session id, or explicit guest actor type is present.");
    return {
      actorType: "guest",
      actorLane: hasAnonymousVisitorId && !hasSessionId ? "anonymous_visitor" : hasSessionId ? "session" : "guest",
      isAuthenticatedUser: false,
      isGuestLike: true,
      isAdmin: false,
      isCreator: false,
      isSystem: false,
      isUnknown: false,
      identityLinkRequired: false,
      confidence: hasAnonymousVisitorId || hasSessionId ? "high" : "medium",
      reasons,
    };
  }

  reasons.push("No trusted actor id, session id, role, route, or explicit actor type was present.");
  return {
    actorType: "unknown",
    actorLane: "unknown",
    isAuthenticatedUser: false,
    isGuestLike: false,
    isAdmin: false,
    isCreator: false,
    isSystem: false,
    isUnknown: true,
    identityLinkRequired: false,
    confidence: "low",
    reasons,
  };
}

export function buildAnalyticsDedupeKey(input: {
  eventName: string;
  actorType?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  creatorId?: string | null;
  adminId?: string | null;
  source?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  occurredAt?: string | number | Date | null;
  dedupeScope?: string | null;
}) {
  const occurredAt =
    input.occurredAt instanceof Date
      ? input.occurredAt.toISOString()
      : typeof input.occurredAt === "number"
        ? new Date(input.occurredAt).toISOString()
        : stringOrNull(input.occurredAt);
  const timeBucket = occurredAt ? occurredAt.slice(0, 16) : "no-time";
  const actor =
    stringOrNull(input.adminId) ??
    stringOrNull(input.creatorId) ??
    stringOrNull(input.userId) ??
    stringOrNull(input.anonymousVisitorId) ??
    stringOrNull(input.sessionId) ??
    "unknown-actor";
  const parts = [
    "analytics-v2",
    stringOrNull(input.dedupeScope) ?? "event",
    stringOrNull(input.eventName) ?? "unknown-event",
    stringOrNull(input.actorType) ?? "unknown",
    actor,
    stringOrNull(input.objectType) ?? "no-object-type",
    stringOrNull(input.objectId) ?? "no-object-id",
    stringOrNull(input.source) ?? "unknown-source",
    timeBucket,
  ];

  return parts
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:_./-]+/g, "-")
    .replace(/-+/g, "-");
}

export function createCanonicalAnalyticsEvent(input: CanonicalAnalyticsEventInput): CanonicalAnalyticsEvent {
  const receivedAt = stringOrNull(input.receivedAt) ?? new Date().toISOString();
  const occurredAt = stringOrNull(input.occurredAt) ?? receivedAt;
  const source = normalizeAnalyticsSourceLane(input.source);
  const actorClassification = classifyAnalyticsActor({
    ...input,
    source,
  });
  const mappingWarnings = (input.mappingWarnings ?? []).filter((warning): warning is string => Boolean(stringOrNull(warning)));

  return {
    eventId: input.eventId,
    eventName: input.eventName,
    eventVersion: input.eventVersion ?? ANALYTICS_EVENT_CONTRACT_VERSION,
    occurredAt,
    receivedAt,
    actorType: actorClassification.actorType,
    anonymousVisitorId: stringOrNull(input.anonymousVisitorId),
    sessionId: stringOrNull(input.sessionId),
    userId: stringOrNull(input.userId),
    creatorId: stringOrNull(input.creatorId),
    adminId: stringOrNull(input.adminId),
    surface: stringOrNull(input.surface),
    route: stringOrNull(input.route),
    component: stringOrNull(input.component),
    objectType: stringOrNull(input.objectType),
    objectId: stringOrNull(input.objectId),
    source,
    consentState: normalizeAnalyticsConsentState(input.consentState),
    dedupeKey:
      stringOrNull(input.dedupeKey) ??
      buildAnalyticsDedupeKey({
        ...input,
        actorType: actorClassification.actorType,
        occurredAt,
        source,
      }),
    schemaVersion: ANALYTICS_EVENT_SCHEMA_VERSION,
    legacySource: stringOrNull(input.legacySource),
    legacyId: stringOrNull(input.legacyId),
    legacyConfidence: input.legacyConfidence ? normalizeLegacyMappingConfidence(input.legacyConfidence) : null,
    mappingWarnings,
    payload: input.payload,
  };
}

export function createIdentityLinkedEvent(input: {
  eventId: string;
  anonymousVisitorId: string;
  sessionId: string;
  userId: string;
  linkedAt?: string | null;
  method?: AnalyticsIdentityLinkPayload["method"];
  eligiblePastSessionIds?: string[];
  source?: AnalyticsEventSourceLane;
  confidence?: LegacyMappingConfidence;
  route?: string | null;
  surface?: string | null;
}) {
  const linkedAt = stringOrNull(input.linkedAt) ?? new Date().toISOString();
  const source = input.source ?? "client";
  const payload: AnalyticsIdentityLinkPayload = {
    anonymousVisitorId: input.anonymousVisitorId,
    sessionId: input.sessionId,
    userId: input.userId,
    linkedAt,
    method: input.method ?? "unknown",
    eligiblePastSessionIds: input.eligiblePastSessionIds ?? [input.sessionId],
    source,
    confidence: input.confidence ?? "high",
  };

  return createCanonicalAnalyticsEvent({
    eventId: input.eventId,
    eventName: IDENTITY_LINKED_EVENT_NAME,
    eventVersion: ANALYTICS_EVENT_CONTRACT_VERSION,
    occurredAt: linkedAt,
    receivedAt: linkedAt,
    actorType: "user",
    anonymousVisitorId: input.anonymousVisitorId,
    sessionId: input.sessionId,
    userId: input.userId,
    objectType: "identity",
    objectId: input.userId,
    source,
    consentState: "not_required",
    route: input.route,
    surface: input.surface,
    dedupeKey: buildAnalyticsDedupeKey({
      eventName: IDENTITY_LINKED_EVENT_NAME,
      actorType: "user",
      anonymousVisitorId: input.anonymousVisitorId,
      sessionId: input.sessionId,
      userId: input.userId,
      objectType: "identity",
      objectId: input.userId,
      source,
      occurredAt: linkedAt,
      dedupeScope: "identity-link",
    }),
    payload,
  }) as CanonicalIdentityLinkedEvent;
}

export function shouldExcludeFromUserAnalytics(event: AnalyticsActorClassificationInput) {
  const classification = classifyAnalyticsActor(event);
  return (
    classification.actorType === "admin" ||
    classification.actorType === "owner_admin" ||
    classification.actorType === "system" ||
    classification.actorType === "creator" ||
    classification.actorType === "unknown"
  );
}

export function shouldIncludeInAdminAnalytics(event: AnalyticsActorClassificationInput) {
  const classification = classifyAnalyticsActor(event);
  return classification.actorType !== "unknown";
}

export function shouldIncludeInGlobalEvents(event: AnalyticsActorClassificationInput) {
  const classification = classifyAnalyticsActor(event);
  return Boolean(stringOrNull(event.eventName)) && classification.actorType !== "unknown"
    ? true
    : Boolean(stringOrNull(event.eventName));
}

export function explainEventInclusion(event: AnalyticsActorClassificationInput): AnalyticsInclusionExplanation {
  const actorClassification = classifyAnalyticsActor(event);
  const includeInUserBehavior = !shouldExcludeFromUserAnalytics(event);
  const includeInAdminAnalytics = shouldIncludeInAdminAnalytics(event);
  const includeInGlobalEvents = shouldIncludeInGlobalEvents(event);
  const exclusionReason = includeInUserBehavior
    ? null
    : actorClassification.actorType === "admin" || actorClassification.actorType === "owner_admin"
      ? "Admin events are excluded from user/guest behavior analytics."
      : actorClassification.actorType === "system"
        ? "System events are excluded from user/guest behavior analytics."
        : actorClassification.actorType === "creator"
          ? "Creator events stay in the creator lane and are not merged into user behavior."
          : "Unknown actor events are excluded from user behavior until classified.";

  return {
    actorClassification,
    includeInUserBehavior,
    includeInAdminAnalytics,
    includeInGlobalEvents,
    exclusionReason,
    globalEventsPreserveActorClassification: true,
  };
}

export function describeIdentityLinkageState(event: CanonicalAnalyticsEvent): AnalyticsEventDebugMetadata["identityLinkageState"] {
  if (event.eventName === IDENTITY_LINKED_EVENT_NAME) {
    return "identity_link_event";
  }
  if (event.userId && event.anonymousVisitorId) {
    return "linked_with_lineage";
  }
  if (event.actorType === "guest" || event.anonymousVisitorId || event.sessionId) {
    return "guest_or_anonymous";
  }
  if (event.actorType === "user") {
    return "unlinked_user";
  }
  return "not_applicable";
}

export function buildAnalyticsEventDebugMetadata(event: CanonicalAnalyticsEvent): AnalyticsEventDebugMetadata {
  const inclusion = explainEventInclusion(event);
  const classification = inclusion.actorClassification;

  return {
    eventId: event.eventId,
    eventName: event.eventName,
    actorClassification: classification,
    sourceLane: event.source,
    guestUserAdminSeparation: {
      guestOrAnonymous: classification.isGuestLike,
      authenticatedUser: classification.isAuthenticatedUser,
      creator: classification.isCreator,
      admin: classification.isAdmin,
      system: classification.isSystem,
      unknown: classification.isUnknown,
    },
    legacyMappingConfidence: event.legacyConfidence,
    exclusionReason: inclusion.exclusionReason,
    dedupeKey: event.dedupeKey,
    identityLinkageState: describeIdentityLinkageState(event),
    fakeZeroPrevention: {
      fakeZeroPrevented: false,
      rule: "Canonical event facts carry null/unavailable for missing metrics; downstream snapshots must not coerce missing counts to zero.",
    },
  };
}
