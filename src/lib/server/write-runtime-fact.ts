import "server-only";

import type { RuntimeFact } from "@/lib/runtime-facts/runtime-fact-contract";

function readString(params: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function readNumber(params: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function readBoolean(params: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return false;
}

export function createRuntimeFactFirestoreDocument(input: {
  runtimeFact: RuntimeFact;
  params: Record<string, unknown>;
  telemetryEventCategory: string;
  telemetryEventModules: string[];
  telemetryTrackingSources?: string[];
  trackingOrigin: string;
}) {
  const fact = input.runtimeFact;

  return {
    eventId: fact.eventId,
    eventName: fact.canonicalEventName,
    rawEventName: fact.rawEventName,
    timestamp: fact.timestampMs,
    timestampMs: fact.timestampMs,
    clientTimestamp: fact.timestampMs,
    serverTimestamp: Date.now(),
    route: fact.route,
    pagePath: fact.route,
    source_component: fact.source_component,
    runtimeFactVersion: fact.runtimeFactVersion,
    sourceTruth: fact.sourceTruth,
    confidence: fact.confidence,
    sourceConfidence: fact.confidence,
    includeInUserBehavior: fact.includeInUserBehavior,
    includeInAdminAnalytics: fact.includeInAdminAnalytics,
    includeInGlobalEvents: fact.includeInGlobalEvents,
    metricEligible: fact.metricEligible,
    metricExclusionReason: fact.metricExclusionReason,
    analyticsExclusionReason: fact.metricExclusionReason,
    metricFamily: fact.metricFamily,
    actorType: fact.actor.actorType,
    actorLane: fact.actorLane,
    actor: fact.actor,
    target: fact.target,
    analyticsUserId: fact.includeInUserBehavior ? fact.actor.actorUserId : "",
    userId: fact.actor.actorUserId,
    username: "",
    actorUserId: fact.actor.actorUserId,
    actorCreatorId: fact.actor.actorCreatorId,
    actorAdminId: fact.actor.actorAdminId,
    anonymousVisitorId: fact.actor.anonymousVisitorId,
    sessionId: fact.actor.sessionId,
    targetUserId: fact.target.targetUserId,
    targetCreatorId: fact.target.targetCreatorId,
    dropId: fact.target.targetDropId,
    dropTitle: readString(input.params, "drop_title", "dropTitle"),
    dropCategory: readString(input.params, "drop_category", "dropCategory"),
    targetDropId: fact.target.targetDropId,
    targetFileId: fact.target.targetFileId,
    targetThreadId: fact.target.targetThreadId,
    transactionId: fact.target.transactionId,
    actionRoute: fact.route,
    actionSourceComponent: fact.source_component,
    actionDropId: fact.target.targetDropId,
    actionFileId: fact.target.targetFileId,
    actionCreatorId: fact.target.targetCreatorId,
    actionTransactionId: fact.target.transactionId,
    actionThreadId: fact.target.targetThreadId,
    actionNotificationId: readString(input.params, "notification_id", "notificationId"),
    actionTaskId: readString(input.params, "task_id", "taskId"),
    assetKey: readString(input.params, "asset_key", "assetKey"),
    assetIndex: readNumber(input.params, "asset_index", "assetIndex"),
    contentKind: readString(input.params, "content_kind", "contentKind"),
    destination: readString(input.params, "destination"),
    destinationType: readString(input.params, "destination_type", "destinationType"),
    sessionWatchSeconds: readNumber(input.params, "session_watch_seconds", "sessionWatchSeconds"),
    watchSeconds: readNumber(input.params, "watch_seconds", "watchSeconds"),
    durationMs: readNumber(input.params, "duration_ms", "durationMs"),
    loadMs: readNumber(input.params, "load_ms", "loadMs"),
    viewportWidth: readNumber(input.params, "viewport_width", "viewportWidth"),
    viewportHeight: readNumber(input.params, "viewport_height", "viewportHeight"),
    isMobileViewport: readBoolean(input.params, "is_mobile_viewport", "isMobileViewport"),
    authState: fact.actor.actorUserId ? "authenticated" : "guest",
    consentMode: fact.actor.actorUserId ? "identified" : "anonymous",
    sourceLayer: "runtime_fact",
    sourceSurface: readString(input.params, "source_surface", "sourceSurface") || "client",
    idempotencyKey: fact.eventId,
    dayKey: readString(input.params, "day_key", "dayKey"),
    hourKey: readString(input.params, "hour_key", "hourKey"),
    minuteKey: readString(input.params, "minute_key", "minuteKey"),
    normalizedAction: fact.normalizedAction,
    normalizedActionName: fact.normalizedAction,
    performedAs: fact.performedAs,
    projectionMode: fact.projectionMode,
    eventCategory: input.telemetryEventCategory,
    eventModules: input.telemetryEventModules,
    trackingSources: input.telemetryTrackingSources ?? [],
    eventIndexVersion: readString(input.params, "event_index_version", "eventIndexVersion"),
    trackingOrigin: input.trackingOrigin,
    sourceCollection: fact.sourceCollection,
    issueCodes: fact.issueCodes,
    params: input.params,
  };
}
