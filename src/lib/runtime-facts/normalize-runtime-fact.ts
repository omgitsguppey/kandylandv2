import { readSessionMeasurementCheckpoint, readSessionMeasurementFromParams } from "@/lib/analytics/session-metrics-contract";
import {
  explainEventInclusion,
  type AnalyticsActorType,
  type AnalyticsActorClassificationInput,
} from "@/lib/analytics/analytics-event-contract";
import { buildEventIdentityEnvelope } from "@/lib/analytics/identity-handoff-engine";
import { normalizeIdentifiedMetricEventFact } from "@/lib/behavioral/event-fact-normalizer";
import { normalizeBehavioralEventFactWithDiagnostics } from "@/lib/behavioral/normalize-event-fact";
import type { TelemetryEventOption } from "@/lib/telemetry-catalog";
import { resolveTrackedTelemetryEvent } from "@/lib/server/analytics-event-utils";
import {
  RUNTIME_FACT_CONTRACT_VERSION,
  RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION,
  readRuntimeFactRequestConsentAdmission,
  type RuntimeFactDiagnostic,
  type RuntimeFactNormalizationResult,
  type RuntimeFactSourceTruth,
} from "@/lib/runtime-facts/runtime-fact-contract";
import { canTrackEvent, deriveAnalyticsConsentState } from "@/lib/privacy/consent-tracking-policy";
import type { ConsentMode } from "@/lib/privacy/consent-tracking-contract";

function buildRequestConsentAdmission(eventName: string, consentMode: ConsentMode | undefined) {
  const admission = readRuntimeFactRequestConsentAdmission({ version: RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION, consentMode });
  return admission && canTrackEvent(eventName, admission.consentMode) ? admission : null;
}

function readStringParam(params: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function readBooleanParam(params: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }
  }

  return false;
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function buildUnknownDiagnostic(input: {
  eventId: string;
  rawEventName: string;
  route: string;
  source_component: string;
  timestampMs: number;
}): RuntimeFactDiagnostic {
  return {
    eventId: input.eventId,
    rawEventName: input.rawEventName,
    route: input.route,
    source_component: input.source_component,
    timestampMs: input.timestampMs,
    issueCode: "unknown_runtime_event",
  };
}

function buildAnonymousTelemetryEventName(input: {
  type: string;
  interactionState?: string;
  exitIntent?: string;
}) {
  if (input.type === "page_view") {
    return "semantic_page_viewed";
  }

  if (input.type === "click") {
    return "semantic_target_clicked";
  }

  if (input.type === "page_leave") {
    if (input.exitIntent === "bounce") {
      return "semantic_page_bounced";
    }

    if (input.interactionState === "engaged") {
      return "semantic_page_engaged";
    }

    return "semantic_page_exited";
  }

  if (input.type === "scroll") {
    return "semantic_page_scrolled";
  }

  if (input.type === "hover") {
    return "semantic_target_hovered";
  }

  if (input.type === "visibility") {
    return "semantic_page_visibility_changed";
  }

  return input.type;
}

function resolveSourceComponent(params: Record<string, unknown>, fallback: string) {
  return readStringParam(params, "source_component", "sourceComponent") || fallback;
}

function resolveRoute(params: Record<string, unknown>, fallback: string) {
  return readStringParam(params, "route", "page_path", "pagePath", "path") || fallback;
}

function resolveCategoryConfidence(option: TelemetryEventOption | undefined, sourceTruth: RuntimeFactSourceTruth) {
  if (sourceTruth === "canonical" || sourceTruth === "server" || sourceTruth === "materialized") {
    return 1;
  }

  if (sourceTruth === "local_projection") {
    return 0.25;
  }

  if (sourceTruth === "client") {
    return option?.category === "commerce" ? 0.65 : 0.85;
  }

  return 0.6;
}

export function normalizeIdentifiedRuntimeFact(input: {
  eventId: string;
  rawEventName: string;
  params: Record<string, unknown>;
  timestampMs: number;
  callerUid: string;
  callerRole?: AnalyticsActorClassificationInput["trustedProfileRole"];
  requestConsentMode?: ConsentMode;
}) : RuntimeFactNormalizationResult {
  const telemetryEvent = resolveTrackedTelemetryEvent(input.rawEventName);
  const route = resolveRoute(input.params, "");
  const source_component = resolveSourceComponent(input.params, "identified_runtime_ingest");

  if (!telemetryEvent.isKnownEvent) {
    return {
      fact: null,
      diagnostic: buildUnknownDiagnostic({
        eventId: input.eventId,
        rawEventName: input.rawEventName,
        route,
        source_component,
        timestampMs: input.timestampMs,
      }),
    };
  }

  if (input.callerRole !== "user" && input.callerRole !== "creator" && input.callerRole !== "admin") {
    return { fact: null, diagnostic: { ...buildUnknownDiagnostic({ eventId: input.eventId, rawEventName: input.rawEventName, route, source_component, timestampMs: input.timestampMs }), issueCode: "unverified_actor_authority" } };
  }
  const canonicalEventName = telemetryEvent.canonicalEventName;
  const requestConsentAdmission = buildRequestConsentAdmission(canonicalEventName, input.requestConsentMode);
  const observedParams = { ...input.params, ...telemetryEvent.metadataParams, tracking_origin: "identified_api_ingest" };
  const anonymousVisitorId = readStringParam(observedParams, "anonymous_visitor_id", "anonymousVisitorId");
  const sessionId = readStringParam(observedParams, "session_id", "sessionId");
  const identityLinkId = readStringParam(observedParams, "identity_link_id", "identityLinkId", "link_id", "linkId");
  const legacyUnknown = readBooleanParam(observedParams, "legacy_unknown", "legacyUnknown")
    || readStringParam(observedParams, "actor_kind", "actorKind") === "legacy_unknown";
  const guestObservation = input.callerRole !== "admin"
    && readStringParam(observedParams, "actor_kind", "actorKind") === "guest" && Boolean(anonymousVisitorId || sessionId);
  const performedAs = input.callerRole === "admin" ? readStringParam(observedParams, "performed_as", "performedAs") : "";
  const projectionMode = input.callerRole === "admin" ? readStringParam(observedParams, "projection_mode", "projectionMode", "view_as_mode", "viewAsMode") : "";
  const projectionEvent = input.callerRole === "admin" && (
    readStringParam(observedParams, "actor_kind", "actorKind") === "admin_projection"
    || performedAs === "admin_view_as_creator" || projectionMode.includes("projection")
    || canonicalEventName.startsWith("admin_projection_") || canonicalEventName.startsWith("admin_view_as_")
  );
  const actorKind = legacyUnknown ? "legacy_unknown" : input.callerRole === "admin" ? projectionEvent ? "admin_projection" : "admin"
    : guestObservation ? "guest" : input.callerRole === "creator" ? "creator_user" : "signed_in_user";
  const sourceTruth = "client" as const;
  const identityEnvelope = buildEventIdentityEnvelope({
    eventName: canonicalEventName, actorKind,
    guestId: anonymousVisitorId, userId: guestObservation || legacyUnknown ? null : input.callerUid,
    sessionId, linkId: identityLinkId,
    consentMode: input.requestConsentMode !== undefined ? input.requestConsentMode : readStringParam(observedParams, "consent_mode", "consentMode") || undefined,
    roles: guestObservation || legacyUnknown ? [] : [input.callerRole],
    projectionMode, performedAs, legacyUnknown,
  });
  // Browser authority aliases are discarded once, before every sibling normalization/persistence path.
  const excludedAuthorityKeys = new Set([
    "trustedProfileRole", "callerRole",
    "roles", "role", "actor_roles", "actorRoles", "actor_role", "actorRole", "claims", "authClaims", "userClaims",
    "is_admin", "isAdmin", "admin", "is_owner", "isOwner", "owner", "owner_admin", "ownerAdmin", "is_creator", "isCreator", "creator",
    "system_generated", "systemGenerated", "actor_type", "actorType", "actor_kind", "actorKind", "actor_lane", "actorLane",
    "actor_user_id", "actorUserId", "actor_creator_id", "actorCreatorId", "creator_actor_id", "creatorActorId", "creator_uid", "creatorUid",
    "actor_admin_id", "actorAdminId", "admin_id", "adminId", "actor_uid", "actorUid", "user_id", "userId", "analytics_user_id", "analyticsUserId",
    "identity_state", "identityState", "identity_confidence", "identityConfidence", "source_truth", "sourceTruth",
    "consent_mode", "consentMode", "consent_state", "consentState",
    "performed_as", "performedAs", "projection_mode", "projectionMode", "view_as_mode", "viewAsMode",
    "linked_person_id", "linkedPersonId", "person_id", "personId", "include_in_user_behavior", "includeInUserBehavior",
  ]);
  const runtimeActorUserId = actorKind === "signed_in_user" || actorKind === "creator_user" ? input.callerUid : "";
  const runtimeActorCreatorId = actorKind === "creator_user" ? input.callerUid : "";
  const runtimeActorAdminId = actorKind === "admin" || actorKind === "admin_projection" ? input.callerUid : "";
  const enrichedParams = {
    ...Object.fromEntries(Object.entries(observedParams).filter(([key]) => !excludedAuthorityKeys.has(key))),
    actor_kind: identityEnvelope.actorKind, identity_state: identityEnvelope.identityState,
    identity_confidence: identityEnvelope.identityConfidence, user_id: runtimeActorUserId,
    actor_user_id: runtimeActorUserId, actor_creator_id: runtimeActorCreatorId, actor_admin_id: runtimeActorAdminId,
    source_truth: sourceTruth, performed_as: performedAs, projection_mode: projectionMode,
    include_in_user_behavior: identityEnvelope.includeInUserBehavior,
    consent_mode: identityEnvelope.consentMode, consent_state: deriveAnalyticsConsentState(identityEnvelope.consentMode),
  };
  const inclusion = explainEventInclusion({
    trustedProfileRole: input.callerRole, eventName: canonicalEventName, userId: input.callerUid,
    actorKind: identityEnvelope.actorKind, identityState: identityEnvelope.identityState,
    anonymousVisitorId, sessionId, identityLinkId, performedAs, projectionMode, sourceTruth,
  });
  const actorClassification = inclusion.actorClassification;
  const parityFact = normalizeIdentifiedMetricEventFact({
    eventId: input.eventId,
    eventName: canonicalEventName,
    params: enrichedParams,
    timestamp: input.timestampMs,
    callerUid: input.callerUid,
    pagePath: route,
    includeInUserBehavior: inclusion.includeInUserBehavior,
    actorType: actorClassification.actorType,
    actorLane: actorClassification.actorLane,
    actorUserId: runtimeActorUserId, actorCreatorId: runtimeActorCreatorId, actorAdminId: runtimeActorAdminId,
    sourceTruth,
  });
  const notificationReadWithoutEntity = parityFact.metricFamily === "notification"
    && canonicalEventName === "notification_read"
    && parityFact.normalizedAction === "notification_read";
  const metricEligible = !projectionEvent && !actorClassification.isUnknown && (parityFact.metricEligible || notificationReadWithoutEntity);
  const metricExclusionReason = metricEligible
    ? ""
    : projectionEvent
      ? "admin_projection"
      : parityFact.metricFamily === "notification" && canonicalEventName !== "notification_read"
        ? "notification_diagnostic_only"
        : parityFact.metricExclusionReason;

  return {
    diagnostic: null,
    identityEnvelope,
    params: enrichedParams,
    fact: {
      ...(requestConsentAdmission?.consentMode === "full_behavioral" && readSessionMeasurementFromParams(enrichedParams) ? { sessionMeasurement: readSessionMeasurementFromParams(enrichedParams)! } : {}),
      runtimeFactVersion: RUNTIME_FACT_CONTRACT_VERSION,
      eventId: input.eventId,
      rawEventName: input.rawEventName,
      canonicalEventName,
      normalizedAction: parityFact.normalizedAction,
      metricFamily: parityFact.metricFamily,
      actorLane: actorClassification.actorLane,
      actor: {
        actorType: actorClassification.actorType,
        actorUserId: runtimeActorUserId,
        actorCreatorId: runtimeActorCreatorId,
        actorAdminId: runtimeActorAdminId,
        anonymousVisitorId,
        sessionId,
        identityLinkId,
      },
      target: {
        targetUserId: parityFact.targetUserId,
        targetCreatorId: parityFact.targetCreatorId,
        targetDropId: parityFact.targetDropId,
        targetFileId: parityFact.targetFileId,
        targetThreadId: parityFact.targetThreadId,
        transactionId: parityFact.transactionId,
      },
      route,
      source_component,
      sourceTruth: parityFact.sourceTruth,
      confidence: clampConfidence(parityFact.sourceConfidence || resolveCategoryConfidence(telemetryEvent.option, parityFact.sourceTruth)),
      timestampMs: input.timestampMs,
      ...(requestConsentAdmission ? { requestConsentAdmission } : {}),
      performedAs,
      projectionMode,
      includeInUserBehavior: inclusion.includeInUserBehavior && identityEnvelope.includeInUserBehavior,
      includeInAdminAnalytics: inclusion.includeInAdminAnalytics,
      includeInGlobalEvents: inclusion.includeInGlobalEvents,
      adminExcludedCount: actorClassification.isAdmin ? 1 : 0,
      systemExcludedCount: actorClassification.isSystem ? 1 : 0,
      metricEligible,
      metricExclusionReason,
      sourceCollection: "analytics_event_facts",
      issueCodes: metricEligible ? [] : [metricExclusionReason || "metric_ineligible"].filter(Boolean),
    },
  };
}

export function normalizeAnonymousRuntimeFact(input: {
  eventId: string;
  timestampMs: number;
  sessionId: string;
  anonymousVisitorId: string;
  path: string;
  dropId?: string;
  type: string;
  targetId?: string;
  targetTag?: string;
  interactionState?: string;
  exitIntent?: string;
  sourceOrigin?: "accepted_current_guest_ingest" | "legacy_import";
  acceptedEventName?: string;
  sessionMeasurement?: unknown;
  requestConsentMode?: ConsentMode;
}) : RuntimeFactNormalizationResult {
  const sourceTruth = input.sourceOrigin === "accepted_current_guest_ingest" ? "client" : "legacy";
  const params: Record<string, unknown> = {
    route: input.path,
    page_path: input.path,
    drop_id: input.dropId,
    source_component: input.targetId || input.targetTag || "guest_runtime_ingest",
  };
  const eventName = input.sourceOrigin === "accepted_current_guest_ingest" && input.acceptedEventName
    ? input.acceptedEventName : buildAnonymousTelemetryEventName({
    type: input.type,
    interactionState: input.interactionState,
    exitIntent: input.exitIntent,
  });
  const normalized = normalizeBehavioralEventFactWithDiagnostics({
    eventId: input.eventId,
    eventName,
    params,
    timestamp: input.timestampMs,
    sessionId: input.sessionId,
    anonymousVisitorId: input.anonymousVisitorId,
    pagePath: input.path,
    dropId: input.dropId,
    source: sourceTruth,
    confidence: 0.55,
  });

  const requestConsentAdmission = input.sourceOrigin === "accepted_current_guest_ingest"
    ? buildRequestConsentAdmission(eventName, input.requestConsentMode) : null;

  if (!normalized.fact) {
    return {
      fact: null,
      diagnostic: {
        eventId: input.eventId,
        rawEventName: eventName,
        route: input.path,
        source_component: resolveSourceComponent(params, "guest_runtime_ingest"),
        timestampMs: input.timestampMs,
        issueCode: normalized.diagnostic?.reason === "unknown_event_name"
          ? "unknown_runtime_event"
          : "unsupported_runtime_event",
      },
    };
  }

  const sessionMeasurement = input.sourceOrigin === "accepted_current_guest_ingest" && requestConsentAdmission?.consentMode === "full_behavioral" ? readSessionMeasurementCheckpoint(input.sessionMeasurement) : null;
  const diagnosticOnly = input.type === "hover" || input.type === "visibility" || input.type === "page_leave";
  const metricEligible = !diagnosticOnly && (input.type === "page_view" || input.type === "click" || input.type === "scroll" || (input.type === "session" && sessionMeasurement !== null));
  const metricExclusionReason = metricEligible ? "" : "diagnostic_only_event";

  return {
    diagnostic: null,
    fact: {
      ...(sessionMeasurement ? { sessionMeasurement } : {}),
      runtimeFactVersion: RUNTIME_FACT_CONTRACT_VERSION,
      eventId: input.eventId,
      rawEventName: input.type,
      canonicalEventName: eventName,
      normalizedAction: normalized.fact.normalizedAction,
      metricFamily: "",
      actorLane: "guest",
      actor: {
        actorType: "guest" as AnalyticsActorType,
        actorUserId: "",
        actorCreatorId: "",
        actorAdminId: "",
        anonymousVisitorId: input.anonymousVisitorId,
        sessionId: input.sessionId,
        identityLinkId: "",
      },
      target: {
        targetUserId: "",
        targetCreatorId: "",
        targetDropId: normalized.fact.dropId || "",
        targetFileId: normalized.fact.fileId || "",
        targetThreadId: normalized.fact.threadId || "",
        transactionId: normalized.fact.transactionId || "",
      },
      route: input.path,
      source_component: resolveSourceComponent(params, "guest_runtime_ingest"),
      sourceTruth,
      confidence: clampConfidence(normalized.fact.confidence),
      timestampMs: input.timestampMs,
      ...(requestConsentAdmission ? { requestConsentAdmission } : {}),
      performedAs: "",
      projectionMode: "",
      includeInUserBehavior: false,
      includeInAdminAnalytics: true,
      includeInGlobalEvents: true,
      adminExcludedCount: 0,
      systemExcludedCount: 0,
      metricEligible,
      metricExclusionReason,
      sourceCollection: "analytics_guest_batches",
      issueCodes: metricEligible ? [] : ["guest_runtime_supporting_only", "diagnostic_only_event"],
    },
  };
}
