import {
  explainEventInclusion,
  type AnalyticsActorType,
} from "@/lib/analytics/analytics-event-contract";
import { normalizeIdentifiedMetricEventFact } from "@/lib/behavioral/event-fact-normalizer";
import { normalizeBehavioralEventFactWithDiagnostics } from "@/lib/behavioral/normalize-event-fact";
import type { TelemetryEventOption } from "@/lib/telemetry-catalog";
import { resolveTrackedTelemetryEvent } from "@/lib/server/analytics-event-utils";
import {
  RUNTIME_FACT_CONTRACT_VERSION,
  type RuntimeFact,
  type RuntimeFactDiagnostic,
  type RuntimeFactNormalizationResult,
  type RuntimeFactSourceTruth,
} from "@/lib/runtime-facts/runtime-fact-contract";

function readStringParam(params: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
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

function resolveIdentifiedSourceTruth(
  canonicalEventName: string,
  params: Record<string, unknown>,
) {
  const explicitSourceTruth = readStringParam(params, "source_truth", "sourceTruth");

  if (
    explicitSourceTruth === "client"
    || explicitSourceTruth === "client_funnel"
    || explicitSourceTruth === "client_supporting"
  ) {
    return "client" as const;
  }

  if (explicitSourceTruth === "local_projection") {
    return "local_projection" as const;
  }

  if (explicitSourceTruth === "legacy") {
    return "legacy" as const;
  }

  if (explicitSourceTruth === "materialized") {
    return "materialized" as const;
  }

  if (explicitSourceTruth === "server") {
    return "server" as const;
  }

  if (explicitSourceTruth === "canonical") {
    return "canonical" as const;
  }

  if (
    canonicalEventName === "identity_linked"
    || canonicalEventName === "server_purchase_verified"
    || canonicalEventName === "daily_checkin_claimed"
    || canonicalEventName === "task_completed"
  ) {
    return "canonical" as const;
  }

  if (canonicalEventName === "drop_unlocked" || canonicalEventName === "drop_unwrapped" || canonicalEventName === "entitlement_granted") {
    return "server" as const;
  }

  if (canonicalEventName === "unlock_drop_success") {
    return "client" as const;
  }

  if (
    canonicalEventName === "drop_not_interested"
    || canonicalEventName === "creator_not_interested"
    || canonicalEventName === "category_not_interested"
    || canonicalEventName === "creator_muted"
    || canonicalEventName === "recommendation_dismissed"
    || canonicalEventName === "content_satisfaction_positive"
    || canonicalEventName === "content_satisfaction_negative"
    || canonicalEventName === "content_satisfaction_skipped"
    || canonicalEventName === "recommendation_reason_helpful"
    || canonicalEventName === "recommendation_reason_not_helpful"
  ) {
    return "client" as const;
  }

  if (canonicalEventName === "gumdrops_purchase_completed" || canonicalEventName === "purchase") {
    return "client" as const;
  }

  if (
    canonicalEventName.startsWith("watch_session_")
    || canonicalEventName === "viewer_session_completed"
    || canonicalEventName === "watch_score_computed"
  ) {
    return "canonical" as const;
  }

  return "server" as const;
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

  const canonicalEventName = telemetryEvent.canonicalEventName;
  const enrichedParams = {
    ...input.params,
    ...telemetryEvent.metadataParams,
    tracking_origin: "identified_api_ingest",
  };
  const performedAs = readStringParam(enrichedParams, "performed_as", "performedAs");
  const projectionMode = readStringParam(enrichedParams, "projection_mode", "projectionMode", "view_as_mode", "viewAsMode");
  const sourceTruth = resolveIdentifiedSourceTruth(canonicalEventName, enrichedParams);
  const explicitActorAdminId = readStringParam(
    enrichedParams,
    "actor_admin_id",
    "actorAdminId",
    "admin_id",
    "adminId",
    "actor_uid",
    "actorUid",
  );
  const adminRouteOrEvent = telemetryEvent.option?.category === "admin"
    || canonicalEventName.startsWith("admin_")
    || performedAs === "admin_view_as_creator"
    || projectionMode.includes("projection")
    || sourceTruth === "local_projection"
    || route === "/admin"
    || route.startsWith("/admin/");
  const inclusion = explainEventInclusion({
    eventName: canonicalEventName,
    userId: input.callerUid,
    actorAdminId: explicitActorAdminId,
    adminId: adminRouteOrEvent ? (explicitActorAdminId || input.callerUid) : readStringParam(enrichedParams, "admin_id", "adminId"),
    actorType: readStringParam(enrichedParams, "actor_type", "actorType") || (adminRouteOrEvent ? "admin" : "user"),
    route,
    surface: readStringParam(enrichedParams, "surface", "source_surface", "sourceSurface") || "client",
    source: "identified_ingest",
    performedAs,
    projectionMode,
    sourceTruth,
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
    sourceTruth,
  });
  const projectionEvent = sourceTruth === "local_projection"
    || performedAs === "admin_view_as_creator"
    || projectionMode.includes("projection");
  const notificationReadWithoutEntity = parityFact.metricFamily === "notification"
    && canonicalEventName === "notification_read"
    && parityFact.normalizedAction === "notification_read";
  const metricEligible = parityFact.metricEligible || notificationReadWithoutEntity;
  const metricExclusionReason = metricEligible
    ? ""
    : projectionEvent
      ? "admin_projection"
      : parityFact.metricFamily === "notification" && canonicalEventName !== "notification_read"
        ? "notification_diagnostic_only"
        : parityFact.metricExclusionReason;

  return {
    diagnostic: null,
    fact: {
      runtimeFactVersion: RUNTIME_FACT_CONTRACT_VERSION,
      eventId: input.eventId,
      rawEventName: input.rawEventName,
      canonicalEventName,
      normalizedAction: parityFact.normalizedAction,
      metricFamily: parityFact.metricFamily,
      actorLane: actorClassification.actorLane,
      actor: {
        actorType: actorClassification.actorType,
        actorUserId: parityFact.actorUserId,
        actorCreatorId: parityFact.actorCreatorId,
        actorAdminId: parityFact.actorAdminId || (actorClassification.isAdmin ? (explicitActorAdminId || input.callerUid) : ""),
        anonymousVisitorId: readStringParam(enrichedParams, "anonymous_visitor_id", "anonymousVisitorId"),
        sessionId: readStringParam(enrichedParams, "session_id", "sessionId"),
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
      performedAs,
      projectionMode,
      includeInUserBehavior: inclusion.includeInUserBehavior,
      includeInAdminAnalytics: inclusion.includeInAdminAnalytics,
      includeInGlobalEvents: inclusion.includeInGlobalEvents,
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
}) : RuntimeFactNormalizationResult {
  const params: Record<string, unknown> = {
    route: input.path,
    page_path: input.path,
    drop_id: input.dropId,
    source_component: input.targetId || input.targetTag || "guest_runtime_ingest",
  };
  const eventName = buildAnonymousTelemetryEventName({
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
    source: "legacy",
    confidence: 0.55,
  });

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

  return {
    diagnostic: null,
    fact: {
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
      sourceTruth: "legacy",
      confidence: clampConfidence(normalized.fact.confidence),
      timestampMs: input.timestampMs,
      performedAs: "",
      projectionMode: "",
      includeInUserBehavior: false,
      includeInAdminAnalytics: true,
      includeInGlobalEvents: true,
      metricEligible: false,
      metricExclusionReason: "guest_runtime_supporting_only",
      sourceCollection: "analytics_guest_batches",
      issueCodes: ["guest_runtime_supporting_only"],
    },
  };
}
